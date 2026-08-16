import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: Role, phone?: string) => Promise<void>;
  logout: () => void;
  loginAsDemo: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Session expired', err);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: jwtToken, user: userData } = res.data;
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string, role: Role, phone?: string) => {
    const res = await api.post('/auth/register', { email, password, name, role, phone });
    const { token: jwtToken, user: userData } = res.data;
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const loginAsDemo = async (role: Role) => {
    const credentials: Record<Role, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@ngocommons.demo', pass: 'Admin@123' },
      NGO: { email: 'ngo@ngocommons.demo', pass: 'NGO@123' },
      DONOR: { email: 'donor@ngocommons.demo', pass: 'Donor@123' },
      PUBLIC: { email: 'public@ngocommons.demo', pass: 'Public@123' }
    };
    const c = credentials[role];
    await login(c.email, c.pass);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginAsDemo }}>
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
