import React, { createContext, useContext, useState, useEffect } from 'react';
import { listenAuthState, loginUser, logoutUser, registerUser, type UserSession } from '../firebase/auth';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenAuthState((sessionUser) => {
      setUser(sessionUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setLoading(true);
    try {
      const session = await loginUser(usernameOrEmail, password);
      setUser(session);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string, role: string = 'admin') => {
    setLoading(true);
    try {
      const session = await registerUser(email, password, fullName, role);
      setUser(session);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
