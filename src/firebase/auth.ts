import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
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
    const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@atownluxuries.com`;
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    
    // Return session format matching real auth
    const session: UserSession = {
      uid: credentials.user.uid,
      email: credentials.user.email || email,
      fullName: credentials.user.displayName || 'Luxury Admin',
      role: 'admin',
      username: usernameOrEmail.split('@')[0],
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
        
        // Only allow login if user exists and password is correct
        if (user && password === 'luxuryadmin123') {
          currentMockUser = user;
          localStorage.setItem('town_session_user', JSON.stringify(user));
          authListeners.forEach(callback => callback(user));
          resolve(user);
        } else {
          reject(new Error("Access Denied: Invalid security signature or password."));
        }
      }, 500);
    });
  }
};

export const registerUser = async (email: string, password: string, fullName: string, role: string = 'admin'): Promise<UserSession> => {
  if (isFirebaseConfigured && auth) {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with fullName
    if (credentials.user) {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(credentials.user, { displayName: fullName });
    }
    
    const session: UserSession = {
      uid: credentials.user.uid,
      email: credentials.user.email || email,
      fullName: fullName,
      role: role,
      username: email.split('@')[0],
      isActive: true
    };
    
    return session;
  } else {
    // Local simulation registration
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mockUsers: UserSession[] = JSON.parse(localStorage.getItem('town_mock_users') || '[]');
        if (mockUsers.some(u => u.email === email || u.username === email.split('@')[0])) {
          reject(new Error("Registration Failed: Access signature already registered."));
          return;
        }
        
        const newUser: UserSession = {
          uid: `local-${Date.now()}`,
          email: email,
          fullName: fullName,
          role: role,
          username: email.split('@')[0],
          isActive: true
        };
        mockUsers.push(newUser);
        localStorage.setItem('town_mock_users', JSON.stringify(mockUsers));
        
        currentMockUser = newUser;
        localStorage.setItem('town_session_user', JSON.stringify(newUser));
        authListeners.forEach(callback => callback(newUser));
        resolve(newUser);
      }, 500);
    });
  }
};

export const logoutUser = async (): Promise<void> => {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("Firebase signOut failed, clearing local session:", error);
    }
  }
  
  // Always clear local session and notify listeners to ensure logout succeeds
  currentMockUser = null;
  localStorage.removeItem('town_session_user');
  authListeners.forEach(callback => callback(null));
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
