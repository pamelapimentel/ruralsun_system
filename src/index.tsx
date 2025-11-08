import React from 'react';
// 1. Importa ReactDOM (el "pintor")
import ReactDOM from 'react-dom/client'; 

// 2. Importa tu componente principal (que contiene el router)
import App from './App'; 

// 3. Importa tu CSS global
import './App.css'; 

// 4. Busca el "lienzo" (el <div id="root"> del HTML)
const rootElement = document.getElementById('root');

// 5. Crea el punto de entrada de React en ese lienzo
const root = ReactDOM.createRoot(rootElement as HTMLElement);

// 6. "Pinta" tu aplicación
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
