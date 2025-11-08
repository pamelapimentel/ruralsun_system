// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { getAuth, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { OrdersPage } from './components/OrdersPage';
import { AsignacionOtPage } from './components/AsignacionOtPage';
import { ActivityMonitorPage } from './components/ActivityMonitorPage';
import { UsersPage } from './components/UsersPage';
import { LoginPage } from './components/LoginPage';
import { db, auth } from './config/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import './App.css';

const LoadingScreen = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    fontSize: '18px', 
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f2f5' 
  }}>
    Verificando autenticación...
  </div>
);

// Interfaz para el perfil de usuario
interface UserProfile {
  profile: 'supervisor' | 'tecnico' | string; // Asegúrate que 'profile' exista en tus docs de Firestore
  // ...otros campos como firstName, lastName
}

// --- Componente para Rutas Protegidas ---
const ProtectedRoute = ({ user, profile }: { user: FirebaseUser | null; profile: UserProfile | null }) => {
  if (user && profile && profile.profile === 'supervisor') {
    console.log("Perfil 1:", profile.profile);
    return <Outlet />;
  }
  // Si no hay usuario, redirige a /login. 'replace' evita historial
  //return user ? <Outlet /> : <Navigate to="/login" replace />;
  return <Navigate to="/login" replace />; 
};

// --- Componente para Rutas Públicas (como Login) ---
const PublicRoute = ({ user, profile }: { user: FirebaseUser | null; profile: UserProfile | null }) => {
  if (user && profile && profile.profile === 'supervisor') {
    console.log("Perfil 2:", profile.profile);
    return <Navigate to="/dashboard" replace />;
 }
 // Si ya hay usuario, redirige al dashboard
 return <Outlet />; 
};

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    
    // --- 1. Definimos la función ASYNC de verificación por separado ---
    const checkUserRole = async (currentUser: FirebaseUser) => {
      setLoginError(null);
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef); // <-- AWAIT (OK)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          
          if (userData.profile === 'supervisor') {
            // ¡Acceso concedido!
            console.log("Acceso concedido a supervisor:", userData);
            setUser(currentUser);
            setProfile(userData);
          } else {
            // Es 'tecnico'. Expulsar.
            console.warn("Acceso denegado: El usuario es 'tecnico'. Cerrando sesión.");
            await signOut(auth); // <-- AWAIT (OK)
            setUser(null);
            setProfile(null);
            setLoginError("Acceso denegado. Solo supervisores pueden usar la web.");
          }
        } else {
          // No se encontró documento de perfil. Expulsar.
          console.error("Error: Perfil de usuario no encontrado en Firestore para UID:", currentUser.uid);
          await signOut(auth); // <-- AWAIT (OK)
          setUser(null);
          setProfile(null);
          setLoginError("Error: Perfil de usuario no encontrado.");
        }
      } catch (err) {
          console.error("Error al obtener perfil de Firestore:", err);
          await signOut(auth); // <-- AWAIT (OK)
          setUser(null);
          setProfile(null);
          setLoginError("Error al verificar el perfil.");
      }
      setLoadingAuth(false);
    };

    // --- 2. El listener onAuthStateChanged NO es async ---
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Si hay un usuario, llamamos a nuestra función async
        checkUserRole(currentUser);
      } else {
        // No hay usuario (sesión cerrada)
        setUser(null);
        setProfile(null);
        setLoadingAuth(false); // Termina la carga
      }
    });

    // Limpia el listener
    return () => unsubscribe();
  }, []); // El array vacío asegura que esto solo se ejecute una vez

  if (loadingAuth) {
    return <LoadingScreen />;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Ruta para el Login (Pública) */}
          <Route element={<PublicRoute user={user} profile={profile} />}>
              <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Rutas Protegidas (requieren login) */}
        <Route element={<ProtectedRoute user={user} profile={profile} />}>
            {/* Usamos Layout como ruta padre para las rutas protegidas */}
            <Route element={<Layout />}>
              {/* Ruta índice (si entras a '/') redirige a dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ordenes" element={<OrdersPage />} />
              <Route path="asignacion/ot" element={<AsignacionOtPage />} />
              <Route path="supervision/monitoreo" element={<ActivityMonitorPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              {/* Añade aquí el resto de tus rutas protegidas */}
            </Route>
        </Route>

          {/* Ruta comodín para páginas no encontradas */}
          <Route path="*" element={<div>Página no encontrada (404)</div>} />

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;