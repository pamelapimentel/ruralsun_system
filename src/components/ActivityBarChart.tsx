// src/components/ActivityBarChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Charts.css'; // CSS compartido para gráficos

// Datos de ejemplo para el gráfico de barras
const data = [
  {
    name: 'fernando escliver',
    'Coordinación Realizada': 1100,
    'Coordinación No Realizada': 600,
    'Reparto Realizado': 0,
    'Reparto NO Realizado': 0,
    'Cobranza Realizada': 0,
    'Cobranza NO Realizada': 0,
  },
  {
    name: 'rider lee',
    'Coordinación Realizada': 1300,
    'Coordinación No Realizada': 400,
    'Reparto Realizado': 0,
    'Reparto NO Realizado': 0,
    'Cobranza Realizada': 0,
    'Cobranza NO Realizada': 0,
  },
  // Más datos por técnico...
];

export const ActivityBarChart: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
        <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
        <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
        <Bar dataKey="Coordinación Realizada" fill="#00C061" stackId="a" />
        <Bar dataKey="Coordinación No Realizada" fill="#FF6384" stackId="a" />
        {/* Añade más barras para los otros tipos de actividad si las necesitas en el gráfico */}
        <Bar dataKey="Reparto Realizado" fill="#FFCE56" stackId="a" />
        <Bar dataKey="Reparto NO Realizado" fill="#36A2EB" stackId="a" />
        <Bar dataKey="Cobranza Realizada" fill="#C13202" stackId="a" />
        <Bar dataKey="Cobranza NO Realizada" fill="#8A2BE2" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
};