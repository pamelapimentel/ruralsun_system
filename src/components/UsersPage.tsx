import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom'; // 1. Importa NavLink
import { StatusBadge } from './StatusBadge';
import { CreateUserModal } from './CreateUserModal';
import { User, Edit, Trash2 } from 'lucide-react';
import '../styles/UsersPage.css';

import { db } from '../config/firebase'; 
import { 
  collection, 
  query, 
  onSnapshot, // El "oyente" en tiempo real
  QueryDocumentSnapshot, 
  DocumentData,
  Timestamp // Para manejar las fechas de Firebase
} from 'firebase/firestore';

  interface UserData {
    id: string;
    encargado: string,
    dni: string;
    email: string;
    profile: 'supervisor' | 'tecnico';
    username: string;
    registrado: string;
    estado: 'Activado'; // Por ahora solo este estado
  }


  export const UsersPage: React.FC = () => {

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // 2. Nuevos estados para los datos de Firestore
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
  // 3. useEffect para cargar los usuarios de Firestore en tiempo real
  useEffect(() => {
    setIsLoading(true);

    // Crea la consulta a la colección 'users'
    const q = query(collection(db, "users"));

    // onSnapshot "escucha" los cambios en la colección
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList: UserData[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        
        // Mapea los datos del documento de Firestore a nuestra interfaz UserData
        usersList.push({
          id: doc.id,
          // Combina nombre y apellido para el 'encargado'
          encargado: `${data.firstName || ''} ${data.lastName || ''}`.trim(), 
          dni: data.dni || 'N/A',
          email: data.email || 'N/A', // Asumiendo que guardaste 'email'
          username: data.username || 'N/A',
          profile: data.profile || 'tecnico',
          // Convierte el Timestamp de Firebase a un string legible
          registrado: data.createdAt ? (data.createdAt as Timestamp).toDate().toLocaleString() : 'N/A',
          estado: (data.status as 'Activado') || 'Activado', // Asume 'Activado'
          // avatarUrl: data.avatarUrl || undefined, // Si guardas avatares
        });
      });
      
      setUsers(usersList); // Actualiza el estado con los usuarios reales
      setIsLoading(false);
      
    }, (error) => {
      // Manejo de errores
      console.error("Error al obtener usuarios de Firestore:", error);
      setIsLoading(false);
      // Aquí podrías poner un estado de error para mostrar al usuario
    });

    // Se llama cuando el componente se desmonta (limpia el "oyente")
    return () => unsubscribe();
    }, []); // El array vacío asegura que esto solo se ejecute una vez




    const handleCreateUser = () => {
        setIsCreateModalOpen(true);
    };
  
    return (
      <>  
        <div className="dashboard-header-path">
          Inicio / Usuarios
        </div>
  
        <header className="users-header">
          <button className="create-user-btn" onClick={handleCreateUser}>
            Crear nuevo usuario
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
  
          <table className="orders-table users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Encargado</th>
                <th>DNI</th>
                <th>Correo</th>
                <th>Usuario</th>
                <th>Perfil</th>
                <th>Registrado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
                {/* 5. Mapea sobre el estado 'users' (datos reales) */}
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="encargado-cell">
                        <div className="avatar-placeholder">
                          {/* (Opcional) <img src={user.avatarUrl} /> */}
                          <User size={18} />
                        </div>
                        <span>{user.encargado}</span>
                      </div>
                    </td>
                    <td>{user.dni}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td style={{ textTransform: 'capitalize' }}>{user.profile}</td>
                    <td>{user.registrado}</td>
                    <td>
                      <StatusBadge status={user.estado} />
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button className="action-btn edit-btn" title="Editar">
                          <Edit size={16} />
                        </button>
                        <button className="action-btn delete-btn" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
  
          <div className="table-pagination">
            <span>Mostrando registros del 1 al 9 de un total de 9</span>
            <div className="pagination-controls">
              <button className="pagination-btn">
                {/* 2. Reemplaza el icono por texto */}
                &lt;
              </button>
              <button className="pagination-btn active">1</button>
              <button className="pagination-btn">
                {/* 2. Reemplaza el icono por texto */}
                &gt;
              </button>
            </div>
          </div>

          <CreateUserModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            // onSave={handleSaveNewUser}
            />
        </div>
      </>
    );
  };