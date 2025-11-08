// src/components/AsignacionOtPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, UserCheck, PlusSquare, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { StatusBadge, StatusType } from './StatusBadge';
import '../styles/OrdersPage.css'; // Reutilizamos los estilos de la tabla
import '../styles/AsignacionOtPage.css'; // Estilos nuevos para esta página
import '../styles/UsersPage.css';

import { db } from '../config/firebase'; 
import { getFirestore, 
  connectFirestoreEmulator,
  collection, 
  query, 
  where, 
  onSnapshot, 
  QuerySnapshot,
  DocumentData, 
  QueryDocumentSnapshot,
  documentId, // 1. Importa 'documentId' para la consulta 'in'
  getDocs } from 'firebase/firestore';

import { functions } from '../config/firebase'; // Importa tus instancias
import { httpsCallable } from 'firebase/functions';

  interface AsignacionOrder {
    id: number;
    desc: string;
    code: string;
    qty: number;
    status: 'Culminado' | 'Pendiente' | 'Asignado'; // El tipo específico
  }
  
  // 2. Nueva interfaz para los Técnicos (basada en tu colección 'users')
  interface Technician {
    id: string; // El UID de Auth, que es el ID del documento
    dni: string;
    firstName: string;
    lastName: string;
    fullName: string;
    // (puedes añadir más campos si los necesitas)
  }

  interface Technician2 {
    id: string;
    fullName: string;
    dni: string;
  }

  // CORRECCIÓN: Aseguramos que el array esté explícitamente tipado
  const orders: AsignacionOrder[] = [
    { id: 1, desc: 'Cuadrilla N°02_Octubre 2025.xlsx', code: 'AU597100004949536', qty: 1147, status: 'Asignado' },
    { id: 2, desc: 'Cuadrilla N°03_Octubre 2025.xlsx', code: 'DK758692004704846', qty: 1450, status: 'Asignado' },
  ];

  interface BatchUploadLog {
    id: string; // ID del documento de 'batch_uploads'
    desc: string; // fileName
    code: string; // uploadCode
    qty: number; // recordCount (Total)
    pendingQty: number; // pendingCount (Pendientes de asignar)
    status: StatusType;
  }

export const AsignacionOtPage = () => {
    const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
    //const [selectedTech, setSelectedTech] = useState<string | null>(null);
    const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
    const [technicians, setTechnicians] = useState<Technician2[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // 2. Estado para controlar la visibilidad del dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // 3. Estado para el término de búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    // 4. Ref para el contenedor del dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);
    // 5. Filtrar técnicos basados en el término de búsqueda
    const [technicianList, setTechnicianList] = useState<Technician[]>([]);
    const [loadingTechs, setLoadingTechs] = useState(true);
    
    // 3. Nuevos estados para la lista de "Técnicos Asignados"
    const [assignedTechnicians, setAssignedTechnicians] = useState<Technician[]>([]);
    const [loadingAssignedTechs, setLoadingAssignedTechs] = useState(true);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [availableBatches, setAvailableBatches] = useState<BatchUploadLog[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(true);

    const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
    const [isAssigning, setIsAssigning] = useState(false);

    const isSelectionInProgress = useRef(false);

    const [error, setError] = useState<string | null>(null);

    // 6. Efecto para cerrar el dropdown al hacer clic fuera
    useEffect(() => {
      setLoadingTechs(true);
      if (!db) return;

      // Crea la consulta: de la colección 'users', trae solo donde 'profile' sea 'tecnico'
      const q = query(
        collection(db, "users"), 
        where("profile", "==", "tecnico")
        // Podrías añadir un orderBy('lastName') si tienes los índices configurados
      );
  
      // onSnapshot escucha cambios en tiempo real (nuevos técnicos aparecen al instante)
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const techs: Technician[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          techs.push({
            id: doc.id, // Este es el UID de Auth
            dni: data.dni || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim()
          });
        });
        setTechnicianList(techs);
        setLoadingTechs(false);
      }, (error) => {
        console.error("Error al cargar técnicos: ", error);
        setLoadingTechs(false);
      });
  
      // Limpia el listener al desmontar el componente
      return () => unsubscribe();
    }, []); // El array vacío asegura que se ejecute solo una vez
  
  // 4. NUEVO Hook para cargar SOLO los técnicos con órdenes asignadas
  useEffect(() => {
    setLoadingAssignedTechs(true);
    if (!db) return;

    // Paso A: Escuchar la colección 'orders' (la colección "en vivo")
    const qOrders = query(
      collection(db, "orders"), 
      where("assignedTo_uid", "!=", null), // Solo las que tienen un técnico
      where("status", "==", "Asignado") // (Podrías añadir esto si solo quieres activos)
    );

    const unsubscribe = onSnapshot(
      qOrders,
      async(querySnapshot: QuerySnapshot<DocumentData>) => {
        // Paso A: Obtener UIDs únicos de las órdenes
        const allUids = querySnapshot.docs
          .map(doc => doc.data().assignedTo_uid)
          .filter(Boolean); // Filtra nulos/undefined
        const uniqueUids: string[] = Array.from(new Set(allUids));
        
        if (uniqueUids.length === 0) {
          setTechnicians([]);
          setIsLoading(false);
          return;
        }

        const qUsers = query(
          collection(db, "users"),
          where(documentId(), "in", uniqueUids)
        );

        const userSnapshot = await getDocs(qUsers);

        const techs: Technician2[] = [];
        userSnapshot.forEach((doc) => {
          const data = doc.data();
          techs.push({
            id: doc.id,
            dni: data.dni || '',
            fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim()
          });
        });

        // 6. Actualizamos el estado de React
        setTechnicians(techs);
        setIsLoading(false);
      },
      (err) => {
        // Manejo de errores de la consulta
        console.error('Error al obtener técnicos:', err);
        setError('No se pudieron cargar los técnicos.');
        setIsLoading(false);
      }
    );

    // Limpia el listener al desmontar
    return () => unsubscribe();
  }, []);

  // 5. El filtro ahora usa la lista 'technicianList' del estado
  const filteredTechnicians = technicianList.filter(tech => {
    const fullName = `${tech.firstName} ${tech.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    // Busca por nombre completo O por DNI
    return fullName.includes(search) || tech.dni.includes(search);
  });

  // 6. Hook para cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // 7. Actualiza handleSelectTech para usar el objeto Technician
  const handleSelectTech = (tech: Technician) => {
    isSelectionInProgress.current = true; // 1. Activa el flag
    setSelectedTech(tech); 
    setSearchTerm(`${tech.dni} | ${tech.fullName}`);
    setIsDropdownOpen(false);
    // 2. Resetea el flag después de un instante
    setTimeout(() => { isSelectionInProgress.current = false; }, 100); 
  };

  // 6. Hook para cargar los lotes por asignar
  useEffect(() => {
    setLoadingBatches(true);
    if (!db) return;
    
    // Regla #1: Muestra 'Activado' (recién subido) o 'Pendiente' (parcialmente asignado)
    const q = query(
      collection(db, "batch_uploads"),
      where("status", "in", ["Activado", "Pendiente"])
    ); 

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const batches: BatchUploadLog[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        batches.push({
          id: doc.id,
          desc: data.fileName || 'N/A',
          code: data.uploadCode || 'N/A', 
          qty: data.recordCount || 0,
          // Regla #2: Muestra el conteo de pendientes
          pendingQty: data.pendingCount || 0,
          status: data.status as StatusType || 'Pendiente', 
        });
      });
      setAvailableBatches(batches);
      setLoadingBatches(false);
    }, (error) => {
      console.error("Error al cargar lotes ('batch_uploads'): ", error);
      setLoadingBatches(false);
    });

    return () => unsubscribe();
  }, []);

  // Al hacer clic en un checkbox de la tabla (ahora selecciona LOTES)
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(batchId)) {
        newIds.delete(batchId);
      } else {
        newIds.add(batchId);
      }
      return newIds;
    });
  };

  // Al hacer clic en el botón "Guardar"
  const handleAssignOrders = async () => {
    if (!selectedTech || selectedBatchIds.size === 0) {
      alert("Por favor, selecciona un técnico y al menos un lote de órdenes.");
      return;
    }
    
    setIsAssigning(true);
    
    try {
      // Apunta a la nueva Cloud Function 'queueBatchAssignment'
      const queueAssignmentFunc = httpsCallable(functions, 'queueBatchAssignment');
      
      // Llama a la función UNA VEZ con todos los IDs de LOTE
      await queueAssignmentFunc({
          technicianUid: selectedTech.id,
          technicianName: selectedTech.fullName,
          batchIds: Array.from(selectedBatchIds), // Envía los IDs de 'batch_uploads'
      });

      alert(`Se han puesto en cola la asignacion a ${selectedTech.fullName}. Presionar actualizar para ver cambios.`);
      
      // Limpia la selección
      setSelectedBatchIds(new Set());
      setSelectedTech(null);
      setSearchTerm('');
      
    } catch (error: any) {
      console.error("Error al poner en cola la asignación:", error);
      alert(`Error al asignar: ${error.message}`);
    }
    
    setIsAssigning(false);
  };

  // 4. Función para llamar a la Cloud Function 'onCall'
  const handleRefreshStatuses = async () => {
    setIsRefreshing(true);
    try {
      if (!functions) {
        alert("Error: Servicio de Functions no inicializado.");
        setIsRefreshing(false);
        return;
      }
      const updateStatuses = httpsCallable(functions, 'triggerBatchStatusUpdate');
      const result: any = await updateStatuses();
      console.log(result.data.message);
      // Opcional: Muestra un toast/alerta de éxito
      // alert(result.data.message); 
    } catch (error: any) {
      console.error("Error al actualizar estados:", error);
      alert(`Error al actualizar: ${error.message}`);
    }
    setIsRefreshing(false); // Asegura que el botón se reactive
  };

  return (
    <>
      <div className="dashboard-header-path">
        Inicio / Asignación por OT
      </div>

      <header className="users-header">
        <button 
          className={`refresh-status-btn ${isRefreshing ? 'spinning' : ''}`} // Botón Azul
          onClick={handleRefreshStatuses} 
          disabled={isRefreshing}
          title="Actualizar estados de lotes"
        >
          {isRefreshing ? (
            "Actualizando..." // Muestra texto mientras carga
          ) : (
            <>
              <RefreshCw size={16} />
            </>
          )}
        </button>
      </header>

      <div className="asignacion-container">
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <aside className="asignacion-sidebar">
          {/* Card para seleccionar encargado */}
          <div className="assignment-card">
            <h3 className="assignment-card-title">Seleccionar encargado</h3>
            {/* 8. Contenedor del dropdown con Ref */}
            <div className="tech-search-container" ref={dropdownRef}>
              <div className="tech-search" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <Search size={18} color="#888" />
                <input
                  type="text"
                  placeholder="Buscar DNI o nombre de técnico..."
                  value={searchTerm}
                  // Lógica de búsqueda actualizada
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true); // Abre al escribir
                      setSelectedTechId(null); // Deselecciona si escribe
                  }}
                  onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(true); }}
                />
              </div>
              {/* 9. Renderizado condicional de la lista */}
              {isDropdownOpen && (
                <ul className="tech-list">
                  {loadingTechs ? (
                    <li className="tech-list-item" style={{ color: '#aaa', cursor: 'default' }}>Cargando técnicos...</li>
                  ) : filteredTechnicians.length > 0 ? (
                    filteredTechnicians.map((tech) => (
                      <li
                        key={tech.id}
                        className={`tech-list-item ${selectedTechId === tech.id ? 'selected' : ''}`}
                        onClick={() => handleSelectTech(tech)} // Pasa el objeto 'tech'
                      >
                        <User size={16} />
                        {/* Muestra DNI y Nombre Completo */}
                        <span>{tech.dni} | {tech.firstName} {tech.lastName}</span>
                      </li>
                    ))
                  ) : (
                    <li className="tech-list-item" style={{ color: '#aaa', cursor: 'default' }}>No se encontraron técnicos</li>
                  )}
                </ul>
              )}
            </div>
            <button 
              className="guardar-btn" 
              // Esta lógica de 'disabled' ahora funcionará
              disabled={!selectedTech || selectedBatchIds.size === 0 || isAssigning}
              onClick={handleAssignOrders}
            >
              {isAssigning ? "Asignando..." : `Asignar (${selectedBatchIds.size}) Órdenes`}
            </button>
          </div>

          {/* Card de Técnicos Asignados */}
          <div className="assigned-techs-card">
            <h3 className="assignment-card-title">Técnicos con OT asignadas</h3>
            <ul className="assigned-tech-list">
              {isLoading ? (
                <div style={{color: '#888', fontSize: '14px'}}>Cargando...</div>
              ) : technicians.length === 0 ? (
                <div style={{color: '#888', fontSize: '14px'}}>No hay técnicos con órdenes asignadas.</div>
              ) : (
                technicians.map((tech) => (
                  <li key={tech.id} className="assigned-tech-item">
                    <UserCheck size={20} className="tech-avatar" />
                    <div className="tech-info">
                      <span>{tech.fullName}</span>
                      <small>{tech.dni}</small> 
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        {/* --- COLUMNA DERECHA --- */}
        <main className="asignacion-main">
          <div className="orders-card"> {/* Reutilizamos la card de órdenes */}
            <div className="table-controls">
              <div className="show-entries">
                <label htmlFor="show-entries">Mostrar </label>
                <select id="show-entries">
                  <option value="10">10</option>
                  <option value="25">25</option>
                </select>
                <span> registros</span>
              </div>
              <div className="search-bar">
                <label htmlFor="search-table">Buscar: </label>
                <input id="search-table" type="text" />
              </div>
            </div>

            {loadingBatches ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>Cargando lotes disponibles...</div>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>{/* Checkbox */}</th>
                    <th>Descripción OT (Archivo)</th>
                    <th>Código De OT (Lote)</th>
                    <th>Cantidad Total</th>
                    <th>Pendientes</th>
                    <th>Estado Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {availableBatches.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>No hay lotes pendientes por asignar.</td></tr>
                  ) : (
                    availableBatches.map((batch) => (
                      <tr key={batch.id} >
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedBatchIds.has(batch.id)}
                            onChange={() => handleSelectBatch(batch.id)}
                          />
                        </td>
                        <td>{batch.desc}</td>
                        <td>{batch.code}</td>
                        <td><span className="quantity-badge">{batch.qty}</span></td>
                        {/* Regla #2: Muestra la cantidad pendiente */}
                        <td>
                          <span className="quantity-badge" style={{color: '#f44336', borderColor: '#fde0de'}}>
                            {batch.pendingQty}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={batch.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            <div className="table-pagination">
              <span>Mostrando registros del 1 al 2 de un total de 2</span>
              <div className="pagination-controls">
                <button className="pagination-btn">
                  <ChevronLeft size={16} />
                </button>
                <button className="pagination-btn active">1</button>
                <button className="pagination-btn">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};