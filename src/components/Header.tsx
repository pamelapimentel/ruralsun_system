// src/components/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, User, LogOut } from 'lucide-react';
import '../styles/Header.css';
import { getAuth, signOut } from 'firebase/auth';

export const Header = () => {
  // 4. Estado para el dropdown de logout
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  // 5. Ref para detectar clics fuera del dropdown
  const logoutRef = useRef<HTMLDivElement>(null);

  // 6. Función para cerrar sesión
  const handleLogout = async () => {
    const auth = getAuth(); // Obtiene la instancia de auth
    try {
      await signOut(auth);
      console.log("Sesión cerrada");
      // Aquí normalmente redirigirías al usuario a la página de login
      // window.location.href = '/login';
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // 7. Efecto para cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setIsLogoutOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [logoutRef]);

  return (
    <header className="header-container">
      <div className="header-search">
        <Search size={20} color="#666" />
        <input type="text" placeholder="Buscar suministro" />
      </div>
      {/* 8. Contenedor del perfil y dropdown con Ref */}
      <div className="header-user-actions" ref={logoutRef}>
        {/* <Bell size={20} color="#666" className="icon-button" /> */}
        {/* <Settings size={20} color="#666" className="icon-button" /> */}
        {/* 9. Añade onClick para abrir/cerrar el dropdown */}
        <div className="header-profile" onClick={() => setIsLogoutOpen(!isLogoutOpen)}>
          <div className="header-avatar">
            <User size={20} color="#fff" />
          </div>
          <div className="header-user-info">
            <span className="header-user-name">geiner coronel burga</span>
            <span className="header-user-role">QENERGY</span>
          </div>
        </div>

        {/* 10. Renderizado condicional del dropdown */}
        {isLogoutOpen && (
          <div className="logout-dropdown">
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};