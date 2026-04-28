import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Bell, X, FileText } from 'lucide-react';

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
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const isFirstLoad = useRef(true);
  const prevIds = useRef<Set<string>>(new Set());

  const playSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  };

  const dismissToast = (id: string) => setToasts(curr => curr.filter(t => t.id !== id));

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/${user.id}`);
      if (res.ok) {
        const data: AppNotification[] = await res.json();
        
        if (!isFirstLoad.current) {
          const newNotifs = data.filter(n => !prevIds.current.has(n.id) && !n.isRead);
          if (newNotifs.length > 0) {
            playSound();
            setToasts(prev => [...prev, ...newNotifs]);
            newNotifs.forEach(n => {
              setTimeout(() => {
                dismissToast(n.id);
              }, 5000);
            });
          }
        } else {
          isFirstLoad.current = false;
        }
        
        prevIds.current = new Set(data.map(n => n.id));
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
      
      {/* Toast Portal */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => {
          const isReportReminder = t.type === 'report_reminder';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-[340px] backdrop-blur-xl border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300
                ${isReportReminder
                  ? 'bg-violet-600 border-violet-500/50 text-white'
                  : 'bg-white/95 border-gray-100 text-gray-800'}
              `}
            >
              <div className={`p-2.5 rounded-xl flex-shrink-0 shadow-sm ${isReportReminder ? 'bg-white/20' : 'bg-blue-50 border border-blue-100/50'}`}>
                {isReportReminder
                  ? <FileText size={20} className="text-white"/>
                  : <Bell size={20} className="text-blue-600 animate-[wiggle_1s_ease-in-out_infinite]"/>
                }
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className={`text-sm font-bold truncate ${isReportReminder ? 'text-white' : 'text-gray-800'}`}>{t.title}</h4>
                <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${isReportReminder ? 'text-violet-200' : 'text-gray-500'}`}>{t.message}</p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isReportReminder ? 'hover:bg-white/20 text-violet-200' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X size={16}/>
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
