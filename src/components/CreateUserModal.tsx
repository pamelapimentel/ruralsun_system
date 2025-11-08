import React, { useState } from 'react';
// Importa los iconos que necesites (asegúrate de que 'lucide-react' esté instalado)
import { X, User, Mail, AtSign, Lock, Briefcase, Image, CreditCard } from 'lucide-react'; 
import '../styles/CreateUserModal.css'; // Asegúrate de que esta ruta sea correcta

// Importa la función httpsCallable y la instancia de functions
import { httpsCallable } from 'firebase/functions';
// Importa la instancia de 'functions' que configuraste en firebase.ts
import { functions } from '../config/firebase'; 

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onUserCreated?: () => void; // Opcional: para refrescar la lista de usuarios
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  // Estados para los campos del formulario
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [perfil, setPerfil] = useState<'supervisor' | 'tecnico' | ''>('');
  const [fileName, setFileName] = useState('No file chosen');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica para el botón "Guardar"
  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    // 1. Recolecta los datos del formulario
    const newUserData = {
      dni: dni.trim(),
      firstName: nombres.trim(),
      lastName: apellidos.trim(),
      email: correo.trim(),
      username: usuario.trim(),
      password: contrasena, // La contraseña no se trimea
      profile: perfil,
    };

    // 2. Validación simple (puedes añadir más)
    if (!newUserData.dni || !newUserData.firstName || !newUserData.lastName || !newUserData.email || !newUserData.password || !newUserData.profile) {
        setError("Todos los campos son obligatorios.");
        setIsLoading(false);
        return;
    }
    if (newUserData.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setIsLoading(false);
        return;
    }

    try {
      // 3. Apunta a la Cloud Function que creamos en el backend
      const createUser = httpsCallable(functions, 'createUserAccount');
      
      console.log("Llamando a 'createUserAccount'...");
      
      // 4. Llama a la función con los datos.
      // Si la configuración (Checklist) está bien, esto funcionará.
      const result = await createUser(newUserData); 
      
      console.log("Usuario creado con éxito:", result.data);
      setIsLoading(false);
      onClose(); // Cierra el modal

    } catch (err: any) {
      console.error("Error al guardar usuario:", err);
      // El 'err.message' vendrá del 'throw new functions.https.HttpsError'
      // que definimos en el backend (ej. "El correo ya está registrado.")
      setError(err.message || "Ocurrió un error desconocido.");
      setIsLoading(false);
    }
  };

  // Función dummy para DNI (puedes implementar la real si quieres)
  const handleConsultarDni = () => {
    console.log("Consultando DNI:", dni);
  };
  
  // Función dummy para archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName('No file chosen');
    }
  };

  // --- No renderiza nada si está cerrado ---
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Crear Usuario</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Muestra errores del backend/validación */}
          {error && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          
          {/* Fila DNI */}
          <div className="form-row">
            <div className="form-icon"><CreditCard size={18}/></div>
            <div className="form-input-group">
              <input type="text" placeholder="Ingresar DNI" className="form-input" value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} disabled={isLoading} />
              <button className="form-button-inline" onClick={handleConsultarDni} disabled={isLoading || dni.length !== 8}>
                Consultar
              </button>
            </div>
          </div>
          {/* Fila Nombres */}
          <div className="form-row">
            <div className="form-icon"><User size={18}/></div>
            <div className="form-input-group">
              <input type="text" placeholder="Nombres Completos" className="form-input" value={nombres} onChange={(e) => setNombres(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          {/* Fila Apellidos */}
          <div className="form-row">
            <div className="form-icon"><User size={18}/></div>
            <div className="form-input-group">
              <input type="text" placeholder="Apellidos Completos" className="form-input" value={apellidos} onChange={(e) => setApellidos(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          {/* Fila Correo */}
          <div className="form-row">
            <div className="form-icon"><Mail size={18}/></div>
            <div className="form-input-group">
              <input type="email" placeholder="Correo Electrónico" className="form-input" value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          {/* Fila Usuario */}
          <div className="form-row">
            <div className="form-icon"><AtSign size={18}/></div>
            <div className="form-input-group">
              <input type="text" placeholder="Ingresa el usuario" className="form-input" value={usuario} onChange={(e) => setUsuario(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          {/* Fila Contraseña */}
          <div className="form-row">
            <div className="form-icon"><Lock size={18}/></div>
            <div className="form-input-group">
              <input type="password" placeholder="Ingresa la contraseña" className="form-input" value={contrasena} onChange={(e) => setContrasena(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          {/* Fila Perfil */}
          <div className="form-row">
            <div className="form-icon"><Briefcase size={18}/></div>
            <div className="form-input-group">
              <select className="form-select" value={perfil} onChange={(e) => setPerfil(e.target.value as any)} disabled={isLoading}>
                <option value="" disabled>Seleccione perfil</option>
                <option value="supervisor">Supervisor</option>
                <option value="tecnico">Técnico</option>
              </select>
            </div>
          </div>
          {/* Fila Avatar */}
          <div className="form-row">
             <div className="form-icon"><Image size={18}/></div>
             <div className="form-input-group file-input-group">
               <label htmlFor="avatar-upload" className="file-input-label">Choose File</label>
               <input id="avatar-upload" type="file" className="file-input-hidden" onChange={handleFileChange} accept="image/*" disabled={isLoading} />
               <span className="file-input-name">{fileName}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose} disabled={isLoading}>
            Cerrar
          </button>
          <button className="modal-btn save" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};