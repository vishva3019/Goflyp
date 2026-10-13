import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../services/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'captain' | 'rider' | 'both' | 'admin';
  university: string;
  department: string;
  regNumber?: string;
  isVerified: boolean;
  rating?: number;
  totalRatings?: number;
  tripsCompleted?: number;
  co2SavedKg?: number;
  upiId?: string;
  vehicle?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: 'captain' | 'rider';
  setActiveRole: (role: 'captain' | 'rider') => void;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'captain' | 'rider'>('rider');

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const savedToken = ApiClient.getToken();
      if (savedToken) {
        setToken(savedToken);
        const data = await ApiClient.getMe();
        if (data.user) {
          setUser(data.user);
          if (data.user.role === 'captain') {
            setActiveRole('captain');
          } else {
            setActiveRole('rider');
          }
        }
      }
    } catch (e) {
      ApiClient.setToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role?: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login({ email, password, requestedRole: role });
      setToken(res.token);
      setUser(res.user);
      if (role === 'captain' || res.user.role === 'captain') {
        setActiveRole('captain');
      } else {
        setActiveRole('rider');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.register(payload);
      setToken(res.token);
      setUser(res.user);
      if (payload.role === 'captain') {
        setActiveRole('captain');
      } else {
        setActiveRole('rider');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await ApiClient.logout();
    setToken(null);
    setUser(null);
    setActiveRole('rider');
  };

  const refreshUser = async () => {
    try {
      const data = await ApiClient.getMe();
      if (data.user) {
        setUser(data.user);
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        activeRole,
        setActiveRole,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
