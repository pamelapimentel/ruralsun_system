// src/components/OrdersPage.tsx
import React, { useState, useEffect } from 'react';
import { StatusBadge, StatusType } from './StatusBadge';
import { Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { UploadModal } from './UploadModal';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import '../styles/OrdersPage.css'; // Crearemos este archivo CSS
import '../styles/UsersPage.css';

import { functions } from '../config/firebase'; // Importa tus instancias
import { httpsCallable } from 'firebase/functions';

interface BatchUploadLog {
  id: string; // El ID del documento de Firestore
  fileName: string;     // ej: "Cuadrilla N°01_Octubre 2025.xlsx"
  uploadCode: string;   // ej: "C23544466004474952"
  recordCount: number;  // ej: 1007
  status: StatusType;   // ej: "Culminado", "Pendiente", "Error"
  importedAt: string;   // ej: "2025-10-10 08:55:08"
}

export const OrdersPage: React.FC = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<BatchUploadLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Estado para el botón de recarga
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Datos de ejemplo (reemplazar con datos de Firebase)
  //const orders: Order[] = [
    //{ id: 1, desc: 'Cuadrilla N°01_Octubre 2025.xlsx', code: 'C23544466004474952', qty: 1007, status: 'Culminado', imported: '2025-10-10 08:55:08' },
    //{ id: 2, desc: 'Cuadrilla N°02_Octubre 2025.xlsx', code: 'AU597100004949536', qty: 1647, status: 'Pendiente', imported: '2025-10-10 08:57:27' },
    //{ id: 3, desc: 'Cuadrilla N°03_Octubre 2025.xlsx', code: 'DK758692004704846', qty: 1459, status: 'Pendiente', imported: '2025-10-10 08:58:31' },
  //];

  useEffect(() => {
    setIsLoading(true);
    
    // Asegúrate de que 'db' se haya inicializado
    if (!db) {
      console.error("¡La base de datos (db) no está inicializada!");
      setIsLoading(false);
      return;
    }
    
    const q = query(collection(db, "batch_uploads"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logsData: BatchUploadLog[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        
        logsData.push({
          id: doc.id,
          fileName: data.fileName || 'Nombre de archivo desconocido',
          uploadCode: data.uploadCode || 'Sin código', // Asume que tu backend genera esto
          recordCount: data.recordCount || 0,
          status: data.status as StatusType || 'Pendiente', 
          importedAt: data.importedAt ? (data.importedAt as Timestamp).toDate().toLocaleString() : 'N/A'
        });
      });
      
      // Ordena por fecha descendente
      setUploadLogs(logsData.sort((a, b) => {
        // Maneja 'N/A' u otros strings no-fecha si es necesario
        try {
          return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime();
        } catch (e) {
          return 0;
        }
      }));
      setIsLoading(false);
    }, (error) => {
      console.error("Error al obtener órdenes de Firestore:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        Inicio / Órdenes de Trabajo
      </div>

      {/* --- CABECERA DE PÁGINA MODIFICADA --- */}
      {/* 'users-header' ahora contiene ambos botones */}
      <header className="users-header">
        <button 
          className="create-user-btn" // Botón Rojo
          style={{backgroundColor: '#f44336'}} 
          onClick={() => setIsModalOpen(true)}
        >
          Subir orden de trabajo
        </button>
        
        {/* --- BOTÓN DE RECARGA MOVIDO Y ESTILIZADO --- */}
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

      <div className="orders-card">
        <div className="table-controls">
          <div className="show-entries">
            <label htmlFor="show-entries">Mostrar </label>
            <select id="show-entries">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span> registros</span>
          </div>
          <div className="search-bar">
            <label htmlFor="search-table">Buscar: </label>
            <input id="search-table" type="text" />
          </div>
        </div>

        <table className="orders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción OT</th>
              <th>Código De OT</th>
              <th>Cantidad</th>
              <th>Estado OT</th>
              <th>Importado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {uploadLogs.map((log, index) => (
              <tr key={log.id}>
                <td>{index + 1}</td>
                <td>{log.fileName}</td>
                <td>{log.uploadCode}</td>
                <td>
                  <span className="quantity-badge">{log.recordCount}</span>
                </td>
                <td>
                <StatusBadge status={log.status} />
                </td>
                <td>{log.importedAt}</td>
                <td>
                  <button className="action-btn delete-btn">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>Mostrando registros del 1 al 3 de un total de 3</span>
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

        <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // onProcessFile={handleFileUpload} // Descomenta cuando tengas la lógica de subida
        />
      </div>
    </>
  );
};