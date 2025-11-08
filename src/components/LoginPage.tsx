import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions'; // Correct import
import '../styles/LoginPage.css'; // Asegúrate que la ruta sea correcta


export const LoginPage: React.FC = () => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    // Limpia el error si el usuario empieza a escribir
    if (error) { // Limpia cualquier error, incluido el inicial
      setError(null);
    }
  }, [dni, password]); // Se activa al escribir en DNI o pass

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!dni || !password) {
      setError('Por favor, ingrese DNI y contraseña.');
      setIsLoading(false);
      return;
    }

    const auth = getAuth();
    const functions = getFunctions(); // Obtiene la instancia de functions

    try {
      console.log('Buscando email para el DNI:', dni);
      const getEmail = httpsCallable(functions, 'getEmailForDni');
      const result: any = await getEmail({ dni: dni }); // Ya no envuelvas en { dni: dni }

      if (!result.data || !result.data.email) {
        console.error("Respuesta inesperada de getEmailForDni:", result.data);
        throw new Error('No se recibió el email esperado.'); 
      }

      const email = result.data.email;
      console.log('Email encontrado:', email);

      await signInWithEmailAndPassword(auth, email, password);
      
      setIsLoading(false);

      console.log('Inicio de sesión exitoso!');
      navigate('/dashboard');
      

    } catch (err: any) {
      setIsLoading(false);
      console.error('Error de inicio de sesión:', err);
      
      // Mapeo de errores
      if (err.code === 'functions/not-found' || err.message === 'DNI no registrado.') {
        setError('DNI no registrado.');
      } 
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Contraseña incorrecta.');
      } 
      else if (err.code === 'functions/invalid-argument' || err.message === 'No se proporcionó un DNI.') {
           setError('Error interno: No se envió el DNI correctamente.'); // Error menos probable ahora
      }
      else {
        setError('DNI o contraseña incorrectos.'); // Error genérico
      }
    }
  };

  return (
    // ... (El JSX sigue igual, asegúrate que el input llame a setDni) ...
    <div className="login-page-container">
      <div className="login-card">
        {/* ... logo ... */}
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text" 
            className="login-input"
            placeholder="Ingrese su DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))} 
            maxLength={8} 
            disabled={isLoading}
          />
          {/* ... input de contraseña ... */}
           <input
            type="password"
            className="login-input"
            placeholder="Ingrese su contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};