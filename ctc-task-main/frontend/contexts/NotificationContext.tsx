import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: number; // 0 | 1
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [user]);

  // Poll every 30s for new notifications
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await fetch(`/api/notifications/read-all/${user.id}`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
