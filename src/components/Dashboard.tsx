// src/components/Dashboard.tsx
import React from 'react';
// import { Layout } from './Layout'; // <-- Importación eliminada
import { MetricCard } from './MetricCard';
import { ActivityDonutChart } from './ActivityDonutChart';
import { ActivityBarChart } from './ActivityBarChart';
import '../styles/Dashboard.css';
import { Camera, MapPin, Package, DollarSign, XCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  
  const metricData = [
    { title: 'Suministros Fotograficos Cargados', value: 3604, icon: Camera },
    { title: 'Coordinaciones SI Realizadas', value: 2361, icon: MapPin },
    { title: 'Coordinaciones NO Realizadas', value: 1044, icon: XCircle },
    { title: 'Repartos SI Realizados', value: 944, icon: Package },
    { title: 'Repartos NO Realizados', value: 0, icon: XCircle },
    { title: 'Cobranzas SI Realizadas', value: 0, icon: DollarSign },
    { title: 'Cobranzas NO Realizadas', value: 1007, icon: XCircle },
  ];

  // Fíjate que el 'return' ahora devuelve un React.Fragment (<>) 
  // o un div, pero NO el <Layout>
  return (
    <>
      <div className="dashboard-header-path">
        Inicio / Analíticos General
      </div>

      <div className="metrics-grid">
        {metricData.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Actividades realizadas en el proceso actual</h3>
          <ActivityDonutChart />
        </div>
        <div className="chart-card">
          <h3>Actividades de coordinación, reporte y cobranzas...</h3>
          <ActivityBarChart />
        </div>
      </div>
    </>
  );
};