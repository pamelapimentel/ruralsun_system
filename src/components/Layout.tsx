// src/components/Layout.tsx
import React, { useState, useEffect, useRef } from 'react'; // 1. Añade useEffect, useRef
import { Outlet, NavLink } from 'react-router-dom'; // 1. Importa Outlet
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import '../styles/Layout.css';

export const Layout: React.FC = () => { // 2. Ya no necesita la prop 'children'
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="layout-main-content">
        <Header />
        <main className="layout-page-content">
          <Outlet /> {/* 3. Aquí es donde React Router renderizará tu página (Dashboard u OrdersPage) */}
        </main>
      </div>
    </div>
  );
};