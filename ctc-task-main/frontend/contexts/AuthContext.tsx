import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';

const LOGIN_API_URL = '/api/auth/login';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  quickLogin: (userId: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserSession: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT without a library
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ctc_token');
    const storedUser = localStorage.getItem('ctc_user');
    
    if (token && storedUser) {
      const payload = parseJwt(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('ctc_user');
          localStorage.removeItem('ctc_token');
        }
      } else {
        localStorage.removeItem('ctc_token');
        localStorage.removeItem('ctc_user');
      }
    } else {
      localStorage.removeItem('ctc_token');
      localStorage.removeItem('ctc_user');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('ctc_token', data.token);
      localStorage.setItem('ctc_user', JSON.stringify(data.user));
      return true;
    } catch (e) {
      console.error('Login failed:', e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ctc_token');
    localStorage.removeItem('ctc_user');
  };

  const quickLogin = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('ctc_token', data.token);
      localStorage.setItem('ctc_user', JSON.stringify(data.user));
      return true;
    } catch (e) {
      console.error('Quick login failed:', e);
    }
    return false;
  };

  const updateUserSession = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('ctc_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, quickLogin, logout, isLoading, updateUserSession }}>
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
