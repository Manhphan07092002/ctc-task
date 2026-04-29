import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlusCircle, LogOut, LayoutDashboard, CheckSquare, Calendar, StickyNote, Users, Settings, Video, FileText, Bell, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, Avatar } from '../UI';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
  openCreateModal: () => void;
}

// Grouped nav structure
const NAV_GROUPS = [
  {
    label: 'Tổng quan',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, path: '/', permission: null },
    ],
  },
  {
    label: 'Công việc',
    items: [
      { id: 'tasks',    icon: CheckSquare, path: '/tasks',    permission: ['view_all_tasks', 'manage_dept_tasks', 'view_own_tasks'] },
      { id: 'calendar', icon: Calendar,    path: '/calendar', permission: ['view_all_tasks', 'manage_dept_tasks', 'view_own_tasks'] },
      { id: 'reports',  icon: FileText,    path: '/reports',  permission: ['view_all_reports', 'approve_dept_reports', 'create_report', 'director_feedback'] },
    ],
  },
  {
    label: 'Giao tiếp',
    items: [
      { id: 'meetings',      icon: Video,  path: '/meetings',      permission: null },
      { id: 'notes',         icon: StickyNote, path: '/notes',     permission: null },
      { id: 'notifications', icon: Bell,   path: '/notifications', permission: null },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { id: 'team',     icon: Users,    path: '/team',     permission: ['view_dept_users', 'manage_users'] },
      { id: 'settings', icon: Settings, path: '/settings', permission: null },
    ],
  },
];

const NAV_LABELS: Record<string, string> = {
  dashboard:     'Tổng quan',
  tasks:         'Công việc',
  calendar:      'Lịch',
  reports:       'Báo cáo',
  meetings:      'Cuộc họp',
  notes:         'Ghi chú',
  notifications: 'Thông báo',
  team:          'Đội ngũ',
  settings:      'Cài đặt',
};

export const Sidebar: React.FC<SidebarProps> = ({ isMobileMenuOpen, setIsMobileMenuOpen, openCreateModal }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const perms = user?.permissions || [];
  const hasPerm = (p: string) => perms.includes(p);

  const canSeeItem = (permission: string[] | null) => {
    if (!permission) return true;
    return permission.some(p => hasPerm(p));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-4 left-4 z-40 w-64 bg-white/80 backdrop-blur-3xl border border-white/60 shadow-2xl shadow-brand-500/10 rounded-[2rem] flex flex-col overflow-hidden transform transition-all duration-500 ease-out
        ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] lg:translate-x-0 lg:opacity-100'}
      `}>
        <div className="h-full flex flex-col">

          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-gray-100/80 flex-shrink-0">
            <img src="/logo.png" alt="CTC Logo" className="h-9 w-auto object-contain mr-3 drop-shadow-sm mix-blend-multiply" />
            <div>
              <span className="text-base font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight block leading-tight">
                CTC Tasks
              </span>
              <span className="text-[10px] text-gray-400 font-medium leading-tight block">Hệ thống quản lý</span>
            </div>
          </div>

          {/* New Task Button */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <Button onClick={() => openCreateModal()} className="w-full justify-center gap-2 shadow-brand-200/60 shadow-md" size="sm">
              <PlusCircle size={16} /> Tạo công việc
            </Button>
          </div>

          {/* Nav Groups */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
            {NAV_GROUPS.map(group => {
              const visibleItems = group.items.filter(item => canSeeItem(item.permission));
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map(item => (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                          w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all
                          ${isActive
                            ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-100'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                          }
                        `}
                      >
                        <item.icon size={17} className="flex-shrink-0" />
                        {NAV_LABELS[item.id] || t(item.id)}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Bottom Section: Admin + User */}
          <div className="flex-shrink-0 border-t border-gray-100 pt-2 pb-3 px-3 space-y-1">
            {/* Admin link */}
            {hasPerm('admin_panel') && (
              <a
                href="/admin"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100"
              >
                <Shield size={17} className="flex-shrink-0" />
                Quản trị viên
              </a>
            )}

            {/* User profile / logout */}
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/80 cursor-pointer transition-colors group"
              onClick={logout}
              title="Đăng xuất"
            >
              <Avatar src={user.avatar} alt={user.name} size={8} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user.name}</p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">{user.role}</p>
              </div>
              <LogOut size={15} className="text-gray-300 group-hover:text-red-500 transition-colors flex-shrink-0" />
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};




