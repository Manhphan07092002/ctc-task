import React, { useState, useEffect } from 'react';
import { Menu, Globe, Search, X, Bell, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

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

interface TopHeaderProps {
  setIsMobileMenuOpen: (o: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notification: any;
  setNotification: (n: any) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  setIsMobileMenuOpen, searchQuery, setSearchQuery, notification, setNotification
}) => {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return `${getGreeting(t)}, ${user?.name.split(' ')[0]}`;
    const name = location.pathname.split('/')[1];
    return t(name); // relies on correct translation keys
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

        <div className="relative">
          <button
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors relative"
            onClick={() => setNotification({ ...notification, visible: false })}
          >
            <Bell size={20} />
            {notification?.visible && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-brand-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>

          {notification?.visible && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in slide-in-from-top-2">
              <div className="flex gap-3">
                <div className={`mt-1 p-1 rounded-full h-fit ${notification.type === 'warning' ? 'bg-brand-100' : 'bg-blue-100'}`}>
                  <AlertCircle size={16} className={notification.type === 'warning' ? 'text-brand-600' : 'text-blue-600'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setNotification((prev: any) => ({ ...prev, visible: false }))} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
