// src/components/MetricCard.tsx
import React from 'react';
import '../styles/MetricCard.css';

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ElementType; 
  }

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: IconComponent }) => {
  return (
    <div className="metric-card-container">
      <div className="metric-card-icon">
        <IconComponent size={24} color="#007bff" /> {/* Renderiza el icono pasado como prop */}
      </div>
      <div className="metric-card-content">
        <span className="metric-card-title">{title}</span>
        <span className="metric-card-value">{value.toLocaleString()}</span> {/* Formatea el número */}
      </div>
    </div>
  );
};