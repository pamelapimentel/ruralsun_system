import * as functions from "firebase-functions/v1";
import{ FieldValue, FieldPath, getFirestore  }  from "firebase-admin/firestore"

//Dependencias de Node.js y Firebase Admin
import * as admin from "firebase-admin";
import * as xlsx from "xlsx"; 
import * as path from "path"; 
import * as os from "os"; 
import * as fs from "fs";

// Inicializa Firebase Admin SDK (SOLO UNA VEZ)
const app = admin.initializeApp();

// Obtiene una referencia a gloables
//const db = admin.firestore();

const db = getFirestore(app, 'qenergyoriente');

type JobStatus = "queued" | "running" | "done" | "error";

interface AssignmentJob {
  batchId: string;
  technicianUid: string;
  technicianName: string;

  status: JobStatus;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;
  startedAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;
  finishedAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;

  // Progreso
  cursor?: string | null;            // ultimo docId procesado
  page?: number;                     // página actual (1..N)
  updatedCount?: number;             // total acumulado
  hasMore?: boolean;                 // quedan páginas?

  // Campo "tick" para disparar onUpdate de forma controlada
  tickAt?: admin.firestore.FieldValue | admin.firestore.Timestamp | null;

  error?: string | null;
}

const COLLECTION_ORDERS = "orders";            // <- tu colección de OT
const COLLECTION_BATCHES = "batch_uploads";    // <- tu colección de lotes
const COLLECTION_JOBS = "assignment_jobs";     // <- cola de trabajos

const STATUS_PENDING = "Pendiente";
const STATUS_ASSIGNED = "Asignado";

// Tamaño de página: 2000 suele ser estable. Para 70k => ~35 páginas.
const PAGE_SIZE = 500;

// Límite tiempo/memoria (puedes ajustar)
const WORKER_TIMEOUT = 300;  // 300s por invocación
const WORKER_MEMORY = "4GB";

/**
 * Función Callable para crear un nuevo usuario.
 */
// 1. CAMBIO: Se añade 'any' a data y context para saltar el error de TypeScript
export const createUserAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  
  console.log("createUserAccount llamada con data (objeto completo):", data);
  console.log("Auth UID:", context.auth?.uid || null);
  console.log("Claims:", context.auth?.token || null);
  console.log("AppCheck:", context.app || null);
  
  // 1. Verificar si el supervisor (quien llama) está autenticado.
  if (!context || !context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "La solicitud no está autenticada."
    );
  }
  // (Aquí puedes añadir la verificación de que el 'context.auth.uid' es un supervisor)

  // 2. Desestructurar y validar los datos que llegan del modal
  const { email, password, dni, firstName, lastName, profile, username } = data;
  if (!email || !password || !profile || !firstName || !lastName || !dni || !username) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Faltan datos requeridos para crear el usuario."
    );
  }

  try {
    // 3. (LÓGICA DE MATCH - PARTE A)
    // Verificar si el DNI ya existe en Firestore antes de crear nada.
    const usersRef = db.collection("users");
    const dniSnapshot = await usersRef.where("dni", "==", dni).limit(1).get();

    if (!dniSnapshot.empty) {
      // Si el snapshot no está vacío, significa que el DNI ya fue registrado
      throw new functions.https.HttpsError(
        "already-exists",
        "El DNI ingresado ya está registrado."
      );
    }
    // (Puedes hacer lo mismo para 'username' si también debe ser único)

    // 4. Crear el usuario en Firebase Authentication (para el login)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

    console.log("Usuario creado en Auth:", userRecord.uid);

    // 5. (LÓGICA DE MATCH - PARTE B)
    // Crear el documento en Cloud Firestore usando el UID de Auth.
    // Aquí es donde vinculamos el Auth UID con el DNI.
    await db.collection("users").doc(userRecord.uid).set({
      dni: dni,                   // <--- El DNI para el login por DNI
      email: email,                 // <--- El email que 'getEmailForDni' devolverá
      firstName: firstName,
      lastName: lastName,
      profile: profile,             // 'supervisor' o 'tecnico'
      username: username,
      createdAt: FieldValue.serverTimestamp(),
      status: "Activado"
    });


    await admin.auth().setCustomUserClaims(userRecord.uid, { profile });

    await db.collection("users").doc(userRecord.uid).set({
      claimsSetAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Datos de usuario guardados en Firestore para:", userRecord.uid);

    // 6. Devolver éxito
    return { success: true, userId: userRecord.uid };

  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    
    // Captura el error si el EMAIL ya existe en Auth
    if (error.code === 'auth/email-already-exists') {
       throw new functions.https.HttpsError(
        "already-exists",
        "El correo electrónico ya está registrado."
      );
    }
    // Lanza cualquier otro error (incluido el de DNI duplicado)
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "Ocurrió un error al crear el usuario."
    );
  }
});


/**
 * NUEVA FUNCIÓN: Obtener email a partir de un DNI.
 */
export const getEmailForDni = functions.https.onCall(async (data: any, context: any) => { // Mantenemos 'any' por ahora

  console.log("getEmailForDni llamada con data (objeto completo):", data);

  // --- CAMBIO CLAVE AQUÍ ---
  // Extraemos el DNI de la propiedad 'data' del objeto recibido
  const dni = data.dni as string;
  // -------------------------

  console.log("DNI extraído:", dni); // Log adicional para confirmar

  // Validación (ahora usa la variable 'dni' extraída)
  if (!dni || typeof dni !== 'string' || dni.length === 0) {
    console.error("Validación de DNI fallida. DNI extraído:", dni, "Data completa:", data);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Se esperaba un DNI (string) no vacío en la propiedad 'data'." // Mensaje más claro
    );
  }

  // A partir de aquí, 'dni' SÍ es el string '12345678'
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("dni", "==", dni).limit(1).get();

    if (snapshot.empty) {
      console.log("No se encontró usuario para el DNI:", dni);
      throw new functions.https.HttpsError(
        "not-found",
        "DNI no registrado."
      );
    }

    const userDoc = snapshot.docs[0].data();
    if (!userDoc.email) {
       throw new functions.https.HttpsError(
        "internal",
        "El usuario encontrado no tiene un email asociado."
      );
    }

    console.log("Email encontrado para DNI", dni, ":", userDoc.email);
    return { email: userDoc.email }; // Devuelve el objeto { email: ... }

  } catch (error: any) {
    console.error("Error al buscar DNI:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "Error al buscar DNI."
    );
  }
});



export const processExcelFile = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 540, // 9 minutos
    memory: "4GB",
  })
  .storage.object()
  .onFinalize(async (object) => {
    
    // --- 1. Obtener detalles del archivo y metadatos ---
    const filePath = object.name;
    const contentType = object.contentType;
    const bucket = admin.storage().bucket(object.bucket);

    // Validar que sea un archivo en la carpeta correcta
    if (!filePath || !filePath.startsWith("excel_uploads/")) {
      console.log("No es un archivo de la carpeta 'excel_uploads'. Ignorando.");
      return null;
    }

    // Validar que sea un archivo Excel
    if (!contentType?.includes("sheet") && !contentType?.includes("excel")) {
      console.log("No es un archivo Excel. Ignorando.");
      return null;
    }

    const logRef = db.collection("batch_uploads").doc();
    const logId = logRef.id;
    const originalFileName = path.basename(filePath).split('_').slice(1).join('_');
    const tempFilePath = path.join(os.tmpdir(), originalFileName);
    const file = bucket.file(filePath);

    await logRef.set({
      fileName: originalFileName,
      uploadCode: logId,
      recordCount: 0,
      status: "Procesando", // Estado inicial
      statusMessage: "Iniciando proceso...",
      importedAt: FieldValue.serverTimestamp(),
    });

  try {

    await file.download({ destination: tempFilePath });
    await logRef.update({ status: "Procesando", statusMessage: "Archivo descargado. Parseando..." });

    const workbook = xlsx.readFile(tempFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
    const recordCount = jsonData.length

    if (recordCount === 0) {
      throw new Error("El archivo Excel está vacío.");
    }

    await logRef.update({ status: "Procesando", statusMessage: `Parseo completo. Escribiendo ${jsonData.length} órdenes...` });
    
    // --- LIMPIEZA (TRIM) ---
    const cleanedData = jsonData.map((row) => {
        const cleanedRow: any = {};
        for (const key in row) {
            const value = row[key];
            if (typeof value === 'string') cleanedRow[key] = value.trim();
            else cleanedRow[key] = value; 
        }
        return cleanedRow;
    });

    // --- VALIDACIÓN (FALLA RÁPIDA) ---
    const requiredFields = [
      'id_orden', 'sum_electrico', 'dni', 'este_wgs84', 'norte_wgs84', 'long_wgs84', 
      'lat_wgs84'
      // ... (añade todos tus campos obligatorios) ...
    ];
    let firstErrorRow = -1;
    let firstErrorField = '';
    const badRow = cleanedData.find((orderRow, index) => {
      const hasMissingField = requiredFields.some((field) => {
        const value = orderRow[field];
        const isMissing = value === null || value === undefined || value === '';
        if (isMissing) { firstErrorRow = index + 2; firstErrorField = field; }
        return isMissing;
      });
      return hasMissingField;
    });
    if (badRow) throw new Error(`Error en Fila ${firstErrorRow} del Excel: El campo obligatorio '${firstErrorField}' está vacío.`);
    
    // --- ESCRITURA POR LOTES ---
    const BATCH_SIZE = 499; 
    const promises: any[] = [];
    for (let i = 0; i < recordCount; i += BATCH_SIZE) {
      const chunk = cleanedData.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((orderRow) => {
        const orderRef = db.collection("orders").doc(); 
        const newOrder = {
            unidad: orderRow.unidad ?? null,
            proceso: orderRow.proceso ?? null,
            id_orden: orderRow.id_orden ?? null,
            sector: orderRow.sector ?? null,
            ruta: orderRow.ruta ?? null,
            cod_ruta: orderRow.cod_ruta ?? null,
            sum_electrico: orderRow.sum_electrico ?? null,
            tipo_tarifa: orderRow.tipo_tarifa ?? null,
            dni: orderRow.dni ?? null,
            nom_completo: orderRow.nom_completo.trim(),
            direccion: orderRow.direccion ?? null,
            nom_departamento: orderRow.nom_departamento ?? null,
            nom_provincia: orderRow.nom_provincia ?? null,
            nom_distrito: orderRow.nom_distrito ?? null,
            localidad: orderRow.localidad ?? null,
            montoFacturado: orderRow.montoFacturado ?? null,
            saldoPendiente: orderRow.saldoPendiente ?? null,
            este_wgs84: orderRow.este_wgs84 ?? null,
            norte_wgs84: orderRow.norte_wgs84 ?? null,
            long_wgs84: orderRow.long_wgs84 ?? null,
            lat_wgs84: orderRow.lat_wgs84 ?? null,
            tipo_rer: orderRow.tipo_rer ?? null,
            distribuidora: orderRow.distribuidora ?? null,
            status: "Pendiente",
            importedAt: FieldValue.serverTimestamp(),
            batchUploadId: logId,
            assignedTo_uid: null,
            assignedTo_name: null,
        };
        batch.set(orderRef, newOrder);
      });
      promises.push(batch.commit());
    }
    await Promise.all(promises);
    
    console.log("Todos los lotes se han completado.");

    // Actualizar log a "Activado"
    await logRef.update({
      recordCount: recordCount,
      status: "Activado",
      statusMessage: "Importación completada y activada."
    });
    
    await file.delete(); 
    fs.unlinkSync(tempFilePath); 
    return null;

  } catch (error: any) {
    console.error("Error en la carga masiva (onCall):", error);
    await logRef.update({
      status: "Error",
      errorMessage: error.message || 'Error desconocido'
    });
    fs.unlinkSync(tempFilePath);
    return null;
  }
});

export const assignOrders = functions.https.onCall(async (data: any, context: any) => {
  
  // 1. Verificación de Seguridad
  if (!context || !context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La solicitud no está autenticada.");
  }
  // (Opcional: Verificar si el usuario es supervisor)
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (callerDoc.data()?.profile !== 'supervisor') {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos.");
  }

  // 2. Validación de Datos
  const { technicianUid, technicianName, orderIds } = data;
  if (!technicianUid || !technicianName || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan datos (technicianUid, technicianName, orderIds).");
  }

  console.log(`Asignando ${orderIds.length} órdenes a ${technicianName} (${technicianUid})`);

  // 3. Usamos un Lote Transaccional para mover las órdenes
  // (Limitado a 500 operaciones, si asignas más, necesitarás lotes múltiples)
  if (orderIds.length > 499) {
      throw new functions.https.HttpsError("invalid-argument", "No se pueden asignar más de 499 órdenes a la vez.");
  }

  const batch = db.batch();

  try {
    // Itera sobre cada ID de orden que el supervisor seleccionó
    for (const orderId of orderIds) {
      const bulkOrderRef = db.collection("bulk_orders").doc(orderId);
      const newOrderRef = db.collection("orders").doc(orderId); // Usa el mismo ID

      // Lee la orden de 'bulk_orders'
      // (Nota: Hacemos 'get' fuera de la transacción para lotes grandes)
      const bulkOrderDoc = await bulkOrderRef.get();
      
      if (!bulkOrderDoc.exists) {
        // La orden ya fue asignada por otro supervisor, omite este ID
        console.warn(`La orden ${orderId} no existe en 'bulk_orders', omitiendo.`);
        continue; 
      }
      
      const orderData = bulkOrderDoc.data();

      // 4. Prepara la "movida"
      
      // A. Crea la nueva orden en la colección 'orders' con los datos de asignación
      batch.set(newOrderRef, {
        ...orderData, // Copia todos los datos del Excel
        assignedTo_uid: technicianUid,
        assignedTo_name: technicianName,
        assignedAt: FieldValue.serverTimestamp(),
        status: "Asignado", // Actualiza el estado
        // isBatchImport: false // ¡IMPORTANTE! Ya no es una carga masiva
      });

      // B. Borra la orden original de 'bulk_orders'
      batch.delete(bulkOrderRef);
    }
    
    // 5. Ejecuta la transacción (mover todo a la vez)
    await batch.commit();

    return { success: true, message: `Se asignaron ${orderIds.length} órdenes.` };

  } catch (error: any) {
    console.error("Error al asignar órdenes:", error);
    if (error instanceof functions.https.HttpsError) throw error; 
    throw new functions.https.HttpsError("internal", "No se pudo asignar la orden.");
  }
});

export const triggerBatchStatusUpdate = functions.https.onCall(async (data: any, context: any) => {

  // 1. Seguridad: Solo usuarios autenticados (supervisores) pueden llamarla
  if (!context || !context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La solicitud no está autenticada.");
  }
  // (Aquí puedes añadir la verificación de que el 'context.auth.uid' es un supervisor)

  console.log("Ejecutando triggerBatchStatusUpdate para recalcular estados de lotes...");

  // 2. Busca todos los lotes que NO estén terminados (Culminado o Error)
  const qBatches = db.collection("batch_uploads")
    .where("status", "in", ["Activado", "Pendiente", "Asignado"]);
    
  const batchesSnapshot = await qBatches.get();

  if (batchesSnapshot.empty) {
    console.log("No hay lotes activos para actualizar.");
    return { success: true, message: "No hay lotes activos." };
  }

  const batchPromises: Promise<any>[] = [];

  // 3. Itera sobre cada lote activo
  for (const batchDoc of batchesSnapshot.docs) {
    const batchId = batchDoc.id;
    const batchData = batchDoc.data();
    
    // 4. Consultas de agregación (Aggregate Queries)
    const ordersRef = db.collection("orders");
    
    // A. Cuenta cuántas órdenes del lote (batchId) NO están asignadas (faltan)
    const pendingQuery = ordersRef
    .where("batchUploadId", "==", batchId)
    .where("assignedTo_uid", "==", null);
    const pendingCountSnap = await pendingQuery.count().get();
    const pendingCount = pendingCountSnap.data().count;

    // B. Cuenta cuántas órdenes del lote NO están culminadas (en total)
    const notFinishedQuery = ordersRef
    .where("batchUploadId", "==", batchId)
    .where("status", "!=", "Culminado");
    const notFinishedCountSnap = await notFinishedQuery.count().get();
    const notFinishedCount = notFinishedCountSnap.data().count;

    // Determina el nuevo estado basado en tus reglas
    let newStatus = batchData.status;
    if (pendingCount > 0) {
    newStatus = "Pendiente"; // Regla #3
    } else if (notFinishedCount > 0) {
    newStatus = "Asignado"; // Regla #2
    } else if (batchData.recordCount > 0) { // Solo culmina si hay registros
    newStatus = "Culminado"; // Regla #4
    } else if (batchData.status === "Procesando") {
    newStatus = "Activado"; // Regla #1 (si aún está procesando, se queda)
    }

    // Prepara la actualización
    batchPromises.push(batchDoc.ref.update({ 
        status: newStatus,
        pendingCount: pendingCount, // <-- GUARDA EL CONTEO (Regla #2 de AsignacionOtPage)
        notFinishedCount: notFinishedCount
      }));
    }

    await Promise.all(batchPromises);
    return { success: true, message: `Estados de ${batchPromises.length} lotes actualizados.` };
});

export const queueBatchAssignment = functions
  .runWith({ timeoutSeconds: 300, memory: "1GB" })
  .https.onCall(async (data, context) => {
    if (!context?.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Autenticación requerida.");
    }

    const technicianUid = String(data?.technicianUid || "").trim();
    const technicianName = String(data?.technicianName || "").trim();
    const batchIds: string[] = Array.isArray(data?.batchIds) ? data.batchIds : [];

    if (!technicianUid || !technicianName || batchIds.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Se requieren technicianUid, technicianName y al menos un batchId."
      );
    }

    const jobsToCreate: Partial<AssignmentJob>[] = [];

    for (const batchId of batchIds) {
      // Evitar duplicados: no crear si ya hay job "queued" o "running" para ese batch
      const dup = await db.collection(COLLECTION_JOBS)
        .where("batchId", "==", batchId)
        .where("status", "in", ["queued", "running"])
        .limit(1)
        .get();

      if (!dup.empty) continue;

      jobsToCreate.push({
        batchId,
        technicianUid,
        technicianName,
        status: "queued",
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        finishedAt: null,
        cursor: null,
        page: 0,
        updatedCount: 0,
        hasMore: true,
        tickAt: null,
        error: null,
      });
    }

    if (jobsToCreate.length === 0) {
      return { ok: true, message: "No se crearon jobs (posibles duplicados o ya en proceso)." };
    }

    const batch = db.batch();
    for (const job of jobsToCreate) {
      const ref = db.collection(COLLECTION_JOBS).doc();
      batch.set(ref, job);
    }
    await batch.commit();

    // (Opcional) marca los lotes como "Asignado" o "Procesando"
    for (const job of jobsToCreate) {
      try {
        await db.collection(COLLECTION_BATCHES).doc(String(job.batchId)).update({ status: STATUS_ASSIGNED });
      } catch { /* no-op */ }
    }

    return {
      ok: true,
      message: `Se encolaron ${jobsToCreate.length} job(s).`,
      batchIdsEncolados: jobsToCreate.map(j => j.batchId),
    };
  });

  export const processAssignmentJobStart = functions
  .runWith({ timeoutSeconds: WORKER_TIMEOUT, memory: WORKER_MEMORY })
  .firestore.document(`${COLLECTION_JOBS}/{jobId}`)
  .onCreate(async (snap, _ctx) => {
    const jobRef = snap.ref;
    const job = snap.data() as AssignmentJob;

    // Poner en running si estaba queued
    if (job.status === "queued") {
      await jobRef.update({
        status: "running",
        startedAt: FieldValue.serverTimestamp(),
      });
    }

    await processOnePage(jobRef);
  });

  export const processAssignmentJobContinue = functions
  .runWith({ timeoutSeconds: WORKER_TIMEOUT, memory: WORKER_MEMORY })
  .firestore.document(`${COLLECTION_JOBS}/{jobId}`)
  .onUpdate(async (change, _ctx) => {
    const before = change.before.data() as AssignmentJob;
    const after = change.after.data() as AssignmentJob;

    // Solo continuar si sigue en running y hay más
    if (after.status !== "running" || !after.hasMore) return;

    // Evitar loops innecesarios: continuar cuando cambie cursor o tickAt
    const cursorChanged = (before.cursor || null) !== (after.cursor || null);
    const tickChanged = String(before.tickAt || "") !== String(after.tickAt || "");
    if (!cursorChanged && !tickChanged) return;

    await processOnePage(change.after.ref);
  });

  async function processOnePage(jobRef: admin.firestore.DocumentReference) {
    const snap = await jobRef.get();
    const job = snap.data() as AssignmentJob;
    if (!job) return;
  
    const { batchId, technicianUid, technicianName } = job;
    const page = (job.page || 0) + 1;
  
    // Construye query paginada
    let query = db.collection(COLLECTION_ORDERS)
      .where("batchUploadId", "==", batchId)
      .where("status", "==", STATUS_PENDING)
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
  
    if (job.cursor) {
      // startAfter requiere el último id de la página previa
      query = query.startAfter(job.cursor);
    }
  
    const qSnap = await query.get();
    if (qSnap.empty) {
      // No hay más docs: cerrar job
      await jobRef.update({
        status: "done",
        finishedAt: FieldValue.serverTimestamp(),
        hasMore: false,
      });
      return;
    }
  
    // BulkWriter para escrituras masivas con reintentos
    const writer = db.bulkWriter({
      throttling: {
        initialOpsPerSecond: 150,   // empieza suave
        maxOpsPerSecond: 400        // tope; súbelo si ves que va holgado
      }
    });
    writer.onWriteError((err: any) => {
      const transientCodes = new Set([4, 8, 10, 14]);
      if (transientCodes.has(err.code) && err.failedAttempts < 8) return true;
      console.error("BulkWriter error permanente:", err);
      return false;
    });

    let pageCount = 0;
    let lastId: string | null = null;
  
    for (const doc of qSnap.docs) {
      lastId = doc.id;
      writer.update(doc.ref, {
        status: STATUS_ASSIGNED,
        assignedTo_uid: technicianUid,
        assignedTo_name: technicianName,
        assignedAt: FieldValue.serverTimestamp(),
      });
      pageCount++;
    }
  
    await writer.close();
  
    const total = (job.updatedCount || 0) + pageCount;
    const hasMore = pageCount === PAGE_SIZE; // si la página vino llena, probablemente hay más
    const updates: Partial<AssignmentJob> = {
      page,
      updatedCount: total,
      cursor: lastId,
      hasMore,
    };
  
    // (Opcional) ir marcando el batch; o hazlo al final
    try {
      await db.collection(COLLECTION_BATCHES).doc(batchId).update({ status: STATUS_ASSIGNED });
    } catch { /* no-op */ }
  
    if (!hasMore) {
      // terminamos
      updates.status = "done";
      updates.finishedAt = FieldValue.serverTimestamp();
      await jobRef.update(updates);
      return;
    }
  
    // Aún hay más: actualiza progreso y "pule" tickAt para disparar el onUpdate
    updates.tickAt = FieldValue.serverTimestamp();
    await jobRef.update(updates);
  }