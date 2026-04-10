import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlusCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { NAV_ITEMS } from '../../constants';
import { Button, Avatar } from '../UI';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
  openCreateModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, setIsMobileMenuOpen, openCreateModal }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-4 left-4 z-40 w-72 bg-white/70 backdrop-blur-3xl border border-white/60 shadow-2xl shadow-brand-500/10 rounded-[2rem] flex flex-col overflow-hidden transform transition-all duration-500 ease-out
        ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] lg:translate-x-0 lg:opacity-100'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-20 flex items-center px-8 border-b border-white/40">
            <img src="/logo.png" alt="CTC Logo" className="h-10 w-auto object-contain mr-3 drop-shadow-sm mix-blend-multiply" />
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
              CTC Task
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="mb-6">
              <Button onClick={() => openCreateModal()} className="w-full justify-center gap-2 shadow-brand-200 shadow-lg whitespace-nowrap" size="lg">
                <PlusCircle size={20} /> {t('newTask')}
              </Button>
            </div>

            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
            {NAV_ITEMS.map(item => {
              if (item.id === 'team' && user.role === 'Employee') return null;
              if (item.id === 'admin' && user?.role?.toLowerCase() !== 'admin' && !user?.permissions?.includes('admin_panel')) return null;

              // Admin link navigates OUTSIDE the SPA to the standalone admin layout
              if (item.id === 'admin') {
                return (
                  <a
                    key={item.id}
                    href="/admin"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all text-gray-600 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
                  >
                    <item.icon size={18} />
                    {t(item.id)}
                  </a>
                );
              }
              
              // Map legacy item.id to Router Paths
              const path = item.id === 'dashboard' ? '/' : `/${item.id}`;

              return (
                <NavLink
                  key={item.id}
                  to={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${isActive
                      ? 'bg-brand-50 text-brand-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                >
                  <item.icon size={18} />
                  {t(item.id)}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <div
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={logout}
              title="Click to Logout"
            >
              <Avatar src={user.avatar} alt={user.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
              <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
