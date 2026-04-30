import React, { useState, useRef, useEffect } from 'react';
import { Menu, Globe, Search, X, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications, AppNotification } from '../../contexts/NotificationContext';

const getGreeting = (t: (key: string) => string) => {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  const { language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="hidden xl:flex flex-col items-end mr-4 border-r border-gray-200 pr-4">
      <div className="text-lg font-bold text-gray-800 font-mono leading-none tabular-nums">
        {time.toLocaleTimeString(locale, { hour12: false })}
      </div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {time.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
};

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

const NotificationItem: React.FC<{ n: AppNotification; onClick: () => void; onDelete: () => void }> = ({ n, onClick, onDelete }) => (
  <div
    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50/60' : ''}`}
    onClick={onClick}
  >
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-lg flex-shrink-0 uppercase">
      {n.title.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
        {n.title}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
      <p className="text-[10px] text-gray-400 mt-1">{fmtRelative(n.createdAt)}</p>
    </div>
    <button
      onClick={e => { e.stopPropagation(); onDelete(); }}
      className="p-1 rounded-full hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
      title="Xóa thông báo"
    >
      <X size={13} />
    </button>
  </div>
);

interface TopHeaderProps {
  setIsMobileMenuOpen: (o: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notification: any;
  setNotification: (n: any) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  setIsMobileMenuOpen, searchQuery, setSearchQuery,
}) => {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
    
    if (n.type === 'new_mail' || n.type === 'mail_received' || n.type === 'mail_sent' || n.title.toLowerCase().includes('email') || n.title.toLowerCase().includes('thư')) {
      navigate(n.relatedId ? `/mail?mailId=${n.relatedId}` : '/mail');
    } else if (n.type.startsWith('report_') || n.title.toLowerCase().includes('báo cáo') || n.title.toLowerCase().includes('bao cao')) {
      navigate('/reports');
    } else if (n.type.startsWith('task_') || n.title.toLowerCase().includes('công việc')) {
      navigate('/tasks');
    } else if (n.type.startsWith('meeting_') || n.title.toLowerCase().includes('họp')) {
      navigate('/meetings');
    } else {
      navigate('/');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleLanguage = () => setLanguage(language === 'vi' ? 'en' : 'vi');

  const getPageTitle = () => {
    if (location.pathname === '/') return `${getGreeting(t)}, ${user?.name.split(' ')[0]}`;
    const name = location.pathname.split('/')[1];
    return t(name);
  };

  return (
    <header className="h-20 mt-4 mx-4 lg:ml-6 lg:mr-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl flex items-center justify-between px-6 shrink-0 z-30 transition-all">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800 capitalize hidden sm:block">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <LiveClock />
        <button
          onClick={toggleLanguage}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
        >
          <Globe size={16} className="text-gray-500" />
          {language === 'vi' ? 'Tiếng Việt' : 'English'}
        </button>

        <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-brand-200 transition-all">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Notification Bell ── */}
        <div className="relative" ref={panelRef}>
          <button
            className="relative p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            onClick={() => setOpen(v => !v)}
            aria-label="Thông báo"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-14 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in slide-in-from-top-2 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-gray-600" />
                  <span className="font-semibold text-gray-800 text-sm">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Bell size={36} strokeWidth={1.2} className="mb-3 opacity-40" />
                    <p className="text-sm font-medium">Không có thông báo nào</p>
                    <p className="text-xs mt-1">Các thông báo sẽ xuất hiện ở đây</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <NotificationItem
                      key={n.id}
                      n={n}
                      onClick={() => handleNotificationClick(n)}
                      onDelete={() => deleteNotification(n.id)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-1.5">
                <button
                  onClick={() => { setOpen(false); navigate('/notifications'); }}
                  className="w-full text-center text-sm font-semibold text-brand-600 hover:text-brand-700 bg-white hover:bg-brand-50 py-2 rounded-xl transition-colors shadow-sm border border-brand-100"
                >
                  Xem tất cả thông báo
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={() => notifications.forEach(n => deleteNotification(n.id))}
                    className="w-full text-center text-xs text-gray-400 hover:text-red-500 py-1 transition-colors"
                  >
                    Xóa tất cả thông báo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
