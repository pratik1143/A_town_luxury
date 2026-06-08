import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

export interface UserSession {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  username: string;
  isActive: boolean;
}

const DEFAULT_ADMIN: UserSession = {
  uid: 'admin-id',
  email: 'admin@atownluxury.com',
  fullName: 'Mr Harish Chaudhary',
  role: 'admin',
  username: 'admin',
  isActive: true
};

const DEFAULT_MANAGER: UserSession = {
  uid: 'manager-id',
  email: 'manager@atownluxuries.com',
  fullName: 'Julian Mercer',
  role: 'manager',
  username: 'manager',
  isActive: true
};

const DEFAULT_CASHIER: UserSession = {
  uid: 'cashier-id',
  email: 'cashier@atownluxuries.com',
  fullName: 'Sophia Sterling',
  role: 'cashier',
  username: 'cashier',
  isActive: true
};

// Cache buster: if the stored mock users or session user contains 'Alexander Vance', clear the storage to force re-initialization.
const existingMockUsers = localStorage.getItem('town_mock_users');
const existingSession = localStorage.getItem('town_session_user');
if (
  (existingMockUsers && existingMockUsers.includes('Alexander Vance')) ||
  (existingSession && existingSession.includes('Alexander Vance'))
) {
  localStorage.removeItem('town_mock_users');
  localStorage.removeItem('town_session_user');
  localStorage.removeItem('town_products');
  localStorage.removeItem('town_categories');
  localStorage.removeItem('town_logs');
  localStorage.removeItem('town_activity_logs');
  localStorage.removeItem('town_bills_registry');
  localStorage.removeItem('town_label_logs');
  localStorage.removeItem('town_customers');
  localStorage.removeItem('town_suppliers');
  localStorage.removeItem('town_purchase_orders');
}

// Seed local mock users
if (!localStorage.getItem('town_mock_users')) {
  localStorage.setItem('town_mock_users', JSON.stringify([DEFAULT_ADMIN, DEFAULT_MANAGER, DEFAULT_CASHIER]));
}

let authListeners: Function[] = [];
let currentMockUser: UserSession | null = DEFAULT_ADMIN;

// Initialize mock session on startup
const savedSession = localStorage.getItem('town_session_user');
if (savedSession) {
  try {
    currentMockUser = JSON.parse(savedSession);
  } catch {
    currentMockUser = DEFAULT_ADMIN;
  }
} else {
  localStorage.setItem('town_session_user', JSON.stringify(DEFAULT_ADMIN));
}

export const loginUser = async (usernameOrEmail: string, password: string): Promise<UserSession> => {
  if (isFirebaseConfigured && auth) {
    // If real Firebase configured, authenticate with email/password.
    // For convenience, we assume usernameOrEmail is email. If not, append domain.
    const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@atownluxuries.com`;
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    
    // In real app, you would fetch the user's role from a 'users' Firestore collection.
    // We will return a mock admin format matching the UID for Phase 1.
    const session: UserSession = {
      uid: credentials.user.uid,
      email: credentials.user.email || email,
      fullName: credentials.user.displayName || 'Luxury Admin',
      role: 'admin',
      username: usernameOrEmail,
      isActive: true
    };
    
    return session;
  } else {
    // Local simulation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mockUsers: UserSession[] = JSON.parse(localStorage.getItem('town_mock_users') || '[]');
        const user = mockUsers.find(
          u => (u.username === usernameOrEmail || u.email === usernameOrEmail)
        );
        
        if (user && password === 'luxuryadmin123') {
          currentMockUser = user;
          localStorage.setItem('town_session_user', JSON.stringify(user));
          // Notify listeners
          authListeners.forEach(callback => callback(user));
          resolve(user);
        } else {
          reject(new Error("Invalid credentials. Please use 'admin', 'manager', or 'cashier' with 'luxuryadmin123'."));
        }
      }, 800); // Luxury delay
    });
  }
};

export const logoutUser = async (): Promise<void> => {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  } else {
    currentMockUser = null;
    localStorage.removeItem('town_session_user');
    authListeners.forEach(callback => callback(null));
  }
};

export const listenAuthState = (callback: (user: UserSession | null) => void) => {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const session: UserSession = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          fullName: firebaseUser.displayName || 'Luxury Admin',
          role: 'admin',
          username: firebaseUser.email?.split('@')[0] || 'admin',
          isActive: true
        };
        callback(session);
      } else {
        callback(null);
      }
    });
  } else {
    // Local simulation listener
    callback(currentMockUser);
    authListeners.push(callback);
    return () => {
      authListeners = authListeners.filter(cb => cb !== callback);
    };
  }
};
