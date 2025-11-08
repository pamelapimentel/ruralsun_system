// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Pega tu config de Firebase aquí
const firebaseConfig = {
    apiKey: "AIzaSyCq2aLAkB_KOwEoz0NI5wazH0EFVU56tSo",
    authDomain: "ruralsunsystem-32301.firebaseapp.com",
    projectId: "ruralsunsystem-32301",
    storageBucket: "ruralsunsystem-32301.firebasestorage.app",
    messagingSenderId: "130098713771",
    appId: "1:130098713771:web:a35e074da96edadbfd53ee",
    measurementId: "G-JV6EHPVJYE"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usarás
export const db = getFirestore(app, 'qenergyoriente');
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Conectar a Emuladores (¡Importante!)
// Esto solo se ejecuta si estás en entorno de desarrollo (localhost)
if (window.location.hostname === "localhost") {
  console.log("Conectando a los emuladores de Firebase...");
  // Puerto por defecto de Firestore: 8017
  connectFirestoreEmulator(db, "localhost", 8017);
  // Puerto por defecto de Auth: 9099
  connectAuthEmulator(auth, "http://localhost:9099");
  // Puerto por defecto de Functions: 5001
  connectFunctionsEmulator(functions, "localhost", 5001);
  // Puerto por defecto de Storage: 9199
  connectStorageEmulator(storage, "localhost", 9199);
  console.log("¡Conectado a los emuladores!");
}

export default app;