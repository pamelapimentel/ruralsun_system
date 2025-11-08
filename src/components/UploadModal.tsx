import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import '../styles/UploadModal.css'; // Asegúrate de crear este archivo CSS

import { getStorage, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '../config/firebase'; // Importa tus instancias

// --- 5. COMPONENTE UploadModal ---
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      // (Validación de tipo de archivo)
      const fileType = e.target.files[0].type;
      if (fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileType === "application/vnd.ms-excel") {
        setSelectedFile(e.target.files[0]);
      } else {
        setError("Formato de archivo no válido. Solo se acepta .xlsx o .xls");
        setSelectedFile(null);
        if(e.target) e.target.value = '';
      }
    } else {
      setSelectedFile(null);
    }
  };

  // --- LÓGICA DE SUBIDA (SOLO STORAGE) ---
  const handleProcess = async () => {
    if (!selectedFile) return;

    // Asegúrate de que el servicio de Storage esté disponible
    if (!storage) {
      setError("Error: Servicio de Storage no inicializado.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Define la ruta. (Debe coincidir con el 'onFinalize' del trigger: 'excel_uploads/')
      const filePath = `excel_uploads/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, filePath);

      console.log("Subiendo archivo a Storage:", filePath);
      
      // 2. Sube el archivo Excel a Firebase Storage
      await uploadBytes(storageRef, selectedFile);
      
      console.log("¡Archivo subido! El backend lo procesará en segundo plano.");

      // 3. ¡LISTO! Cierra el modal.
      setIsLoading(false);
      onClose(); 

    } catch (err: any) {
      console.error("Error al subir el archivo (Frontend):", err);
      setError(err.message || "Ocurrió un error al subir el archivo.");
      setIsLoading(false);
    }
  };
  // --- FIN DE LA LÓGICA ---

  if (!isOpen) return null;

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Subir orden de trabajo</h3>
            <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
              <X size={20} color="#666" />
            </button>
          </div>
          
          <div className="modal-body">
            {/* Input de archivo personalizado */}
            <label className="file-upload-label">
              <UploadCloud size={40} color="#007bff" />
              <span>{selectedFile ? selectedFile.name : "Selecciona o arrastra un archivo"}</span>
              <input 
                type="file" 
                className="file-upload-input"
                onChange={handleFileChange} 
                accept=".xlsx, .xls"
                disabled={isLoading}
              />
            </label>
            <p className="modal-help-text">
              Peso Max: 10MB | Formato (XLSX, XLS)
            </p>
            {/* Muestra el error de validación del backend */}
            {error && <p style={{color: 'red', fontSize: '13px', textAlign: 'center'}}>{error}</p>}
          </div>

          <div className="modal-footer">
            <button className="modal-btn cancel" onClick={onClose} disabled={isLoading}>
              Cerrar
            </button>
            <button 
              className="modal-btn process" 
              onClick={handleProcess} // Llama a la nueva función de solo subida
              disabled={!selectedFile || isLoading}
            >
              {/* El botón ahora solo "Sube", no "Procesa" */}
              {isLoading ? "Subiendo..." : "Subir Archivo"} 
            </button>
          </div>
        </div>
      </div>
  );
};