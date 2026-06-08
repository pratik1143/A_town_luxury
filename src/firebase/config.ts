import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if variables are valid config (and not placeholder/dummy values)
const isFirebaseConfigured = (() => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return false;
  
  const isPlaceholder = 
    apiKey.includes('---') || 
    apiKey.includes('placeholder') || 
    apiKey.toLowerCase().includes('your_') || 
    projectId.toLowerCase().includes('your_');
    
  return !isPlaceholder;
})();

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("A Town Luxury ERP: Firebase successfully initialized.");
  } catch (error) {
    console.error("A Town Luxury ERP: Error initializing real Firebase SDK:", error);
  }
} else {
  console.warn("A Town Luxury ERP: Firebase environment variables missing. Falling back to local high-fidelity glassmorphism-enabled simulation engine.");
}

export { auth, db, storage, isFirebaseConfigured };
