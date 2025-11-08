// src/components/ActivityDonutChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import '../styles/Charts.css'; // CSS compartido para gráficos

// Datos de ejemplo para el gráfico de dona
const data = [
  { name: 'Coordinación Realizada', value: 44.08 },
  { name: 'Coordinación No Realizada', value: 18.49 },
  { name: 'Reparto Realizado', value: 17.62 },
  { name: 'Reparto No Realizado', value: 10.90 },
  { name: 'Cobranza Realizada', value: 8.89 },
];

const COLORS = ['#00C061', '#FF6384', '#FFCE56', '#36A2EB', '#C13202']; // Colores para cada segmento

export const ActivityDonutChart: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value, entry) => {
            // El primer argumento 'value' ya es el nombre (ej. "Coordinación Realizada")
            
            // 1. Comprueba si el 'payload' existe antes de usarlo
            if (entry && entry.payload) {
              // 2. Si existe, devuelve el formato completo
              return (
                <span style={{ color: '#666' }}>
                  {value} ({entry.payload.value.toFixed(2)}%)
                </span>
              );
            }

            // 3. Si no existe, devuelve solo el nombre (valor por defecto)
            return <span style={{ color: '#666' }}>{value}</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};