import { apiFetch } from '../services/api';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Bell, X, FileText, StickyNote } from 'lucide-react';
import { Note } from '../types';

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
  setNotes: (notes: Note[]) => void; // feed notes from App for reminder checking
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const isFirstLoad = useRef(true);
  const prevIds = useRef<Set<string>>(new Set());
  const firedReminders = useRef<Set<string>>(new Set()); // note ids already reminded

  const playSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Bell chord: 3 harmonic notes played in sequence (ding - dong - ding)
      const notes = [
        { freq: 1046.50, delay: 0,    dur: 0.8 },  // C6
        { freq:  880.00, delay: 0.15, dur: 0.8 },  // A5
        { freq: 1318.51, delay: 0.30, dur: 1.0 },  // E6
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        // Bell decay envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur + 0.05);
      });
    } catch (e) {}
  };

  const dismissToast = (id: string) => setToasts(curr => curr.filter(t => t.id !== id));

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/notifications/${user.id}`);
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
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await apiFetch(`/api/notifications/read-all/${user.id}`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
  };

  const deleteNotification = async (id: string) => {
    await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification, refresh, setNotes }}>
      {children}
      
      {/* Toast Portal */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => {
          const isReportReminder   = t.type === 'report_reminder';
          const isNoteReminder     = t.type === 'note_reminder';
          const isDailyTaskReminder = t.type === 'daily_task_reminder';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-[340px] backdrop-blur-xl border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300
                ${isReportReminder  ? 'bg-violet-600 border-violet-500/50 text-white'
                  : isNoteReminder   ? 'bg-amber-50 border-amber-200 text-gray-800'
                  : isDailyTaskReminder ? 'bg-blue-600 border-blue-500/50 text-white'
                  : 'bg-white/95 border-gray-100 text-gray-800'}
              `}
            >
              <div className={`p-2.5 rounded-xl flex-shrink-0 shadow-sm
                ${isReportReminder ? 'bg-white/20'
                  : isNoteReminder  ? 'bg-amber-400'
                  : isDailyTaskReminder ? 'bg-white/20'
                  : 'bg-blue-50 border border-blue-100/50'}
              `}>
                <Bell size={20} className={
                  isReportReminder   ? 'text-white animate-[wiggle_1s_ease-in-out_infinite]'
                  : isNoteReminder    ? 'text-white animate-[wiggle_1s_ease-in-out_infinite]'
                  : isDailyTaskReminder ? 'text-white animate-[wiggle_1s_ease-in-out_infinite]'
                  : 'text-blue-600 animate-[wiggle_1s_ease-in-out_infinite]'
                }/>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className={`text-sm font-bold truncate ${isReportReminder ? 'text-white' : isNoteReminder ? 'text-amber-900' : 'text-gray-800'}`}>{t.title}</h4>
                <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${isReportReminder ? 'text-violet-200' : isNoteReminder ? 'text-amber-700' : 'text-gray-500'}`}>{t.message}</p>
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
