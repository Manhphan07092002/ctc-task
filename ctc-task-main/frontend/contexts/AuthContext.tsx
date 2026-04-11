import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';

const API_URL = '/api/users';
const LOGIN_API_URL = '/api/auth/login';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserSession: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('orange_task_user_id');
    if (storedUserId) {
      fetch(API_URL)
        .then(r => r.json())
        .then((users: User[]) => {
          const foundUser = users.find(u => u.id === storedUserId);
          if (foundUser) setUser(foundUser);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const foundUser: User = await res.json();
      setUser(foundUser);
      localStorage.setItem('orange_task_user_id', foundUser.id);
      return true;
    } catch (e) {
      console.error('Login failed:', e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('orange_task_user_id');
  };

  const updateUserSession = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUserSession }}>
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
