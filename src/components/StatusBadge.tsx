// src/components/StatusBadge.tsx
import React from 'react';
import '../styles/StatusBadge.css'; // Crearemos este archivo CSS

export type StatusType = 'Culminado' | 'Pendiente' | 'Asignado' | 'Activado' | 'Error'; // Añadido Error

interface StatusBadgeProps {
  status: StatusType;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Culminado':
        return 'completed';
      case 'Pendiente':
        return 'pending';
      case 'Asignado':
        return 'assigned';
      case 'Activado':
        return 'active'; // Nueva clase
      default:
        return 'pending'; // O un estado por defecto
    }
  };
  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {status}
    </span>
  );
};