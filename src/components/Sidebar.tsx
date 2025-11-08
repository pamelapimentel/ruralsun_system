// src/components/Sidebar.tsx
import React, { useState } from 'react'; 
import { NavLink } from 'react-router-dom'; // 1. Importa NavLink
import { LayoutDashboard, ListTodo, ClipboardCopy, DollarSign, BarChart3, Users, MapPin, Settings, Clock, Circle, PlusCircle, Monitor, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/Sidebar.css';

// 2. Creamos una función para manejar la clase 'active'
const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
  return isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item';
};

export const Sidebar: React.FC = () => {
  // Estado para controlar la visibilidad del submenú
  const [isAsignacionesOpen, setIsAsignacionesOpen] = useState(false);
  const [isSupervisionOpen, setIsSupervisionOpen] = useState(false);
  
  return (
    <>
      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <Circle size={30} strokeWidth={2} color="#00C061" />
          <span className="sidebar-logo-text">Mi App</span>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <NavLink to="/dashboard" className={getNavLinkClass}>
              <LayoutDashboard size={20} />
              <span>Inicio / Analíticos General</span>
            </NavLink>

            <NavLink to="/ordenes" className={getNavLinkClass}>
              <ListTodo size={20} />
              <span>Órdenes de trabajo</span>
            </NavLink>

            {/* 5. Ítem de menú modificado con submenú */}
            <div 
              className="sidebar-nav-item-with-submenu"
              onMouseEnter={() => setIsAsignacionesOpen(true)} // Muestra al pasar el mouse
              onMouseLeave={() => setIsAsignacionesOpen(false)} // Oculta al quitar el mouse
            >
              {/* Este es el botón principal (no es un enlace) */}
              <li className="sidebar-nav-item">
                <ClipboardCopy size={20} />
                <span>Asignaciones</span>
              </li>

              {/* 6. El submenú condicional */}
              {isAsignacionesOpen && (
                <ul className="sidebar-submenu">
                  <NavLink to="/asignacion/ot" className="sidebar-submenu-item">
                    <PlusCircle size={16} /> Asignación por OT
                  </NavLink>
                  <NavLink to="/asignacion/rutas" className="sidebar-submenu-item">
                    <PlusCircle size={16} /> Asignación por Rutas
                  </NavLink>
                  <NavLink to="/asignacion/sector" className="sidebar-submenu-item">
                    <PlusCircle size={16} /> Asignación por Sector
                  </NavLink>
                  <NavLink to="/asignacion/detalle" className="sidebar-submenu-item">
                    <PlusCircle size={16} /> Asignación por Detalle
                  </NavLink>
                </ul>
              )}
            </div>
            
            <div
              className="sidebar-nav-item-with-submenu"
              onMouseEnter={() => setIsSupervisionOpen(true)}
              onMouseLeave={() => setIsSupervisionOpen(false)}
            >
              <li className="sidebar-nav-item"> 
                <Clock size={20} /> {/* Icono principal */}
                <span>Supervisión</span> 
              </li>
              {isSupervisionOpen && (
                <ul className="sidebar-submenu">
                  <NavLink to="/supervision/monitoreo" className="sidebar-submenu-item"> 
                    <Monitor size={16} /> Monitoreo 
                  </NavLink>
                  <NavLink to="/supervision/monitoreo-gps" className="sidebar-submenu-item"> 
                    <MapPin size={16} /> Monitoreo GPS 
                  </NavLink>
                </ul>
              )}
            </div>

            <NavLink to="/usuarios" className={getNavLinkClass}>
              <LayoutDashboard size={20} />
              <span>Usuarios</span>
            </NavLink>

            <li className="sidebar-nav-item">
              <MapPin size={20} />
              <span>Rutas</span>
            </li>
            <li className="sidebar-nav-item">
              <Settings size={20} />
              <span>Configuración</span>
            </li>
            <li className="sidebar-nav-item">
              <Clock size={20} />
              <span>Actividad</span>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          {/* Aquí puedes poner el icono de settings del final si lo deseas */}
        </div>
      </aside>
    </>
  );
};