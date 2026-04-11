import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoginView } from '../../components/LoginView';
import AdminDashboard from './index';
import AdminUserManagement from './UserManagement';
import AdminSystemConfig from './SystemConfig';
import AdminTaskManagement from './TaskManagement';
import AdminReportManagement from './ReportManagement';
import AdminMeetingManagement from './MeetingManagement';
import AdminRoleManagement from './RoleManagement';
import AdminDepartmentManagement from './DepartmentManagement';
import AdminDatabaseManagement from './DatabaseManagement';
import {
  Shield, LayoutDashboard, Users, Settings, LogOut,
  Bell, ChevronRight, Activity, Menu, X,
  CheckSquare, FileText, Video, ShieldCheck, Building2, Database
} from 'lucide-react';

const AdminSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan hệ thống', icon: LayoutDashboard, path: '/admin' },
    { id: 'users',       label: 'Quản lý Người dùng', icon: Users,       path: '/admin/users' },
    { id: 'roles',       label: 'Quản lý Vai trò',    icon: ShieldCheck,  path: '/admin/roles' },
    { id: 'departments', label: 'Quản lý Phòng ban',  icon: Building2,    path: '/admin/departments' },
    { id: 'tasks',       label: 'Quản lý Công việc',  icon: CheckSquare,  path: '/admin/tasks' },
    { id: 'reports',     label: 'Quản lý Báo cáo',   icon: FileText,     path: '/admin/reports' },
    { id: 'meetings',    label: 'Quản lý Cuộc họp',  icon: Video,        path: '/admin/meetings' },
    { id: 'database',    label: 'Quản lý Database',  icon: Database,     path: '/admin/database' },
    { id: 'settings',    label: 'Cấu hình Hệ thống', icon: Settings,     path: '/admin/settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 flex flex-col
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        border-r border-white/5 shadow-2xl
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none">Admin Panel</p>
              <p className="text-slate-400 text-xs mt-0.5">CTC Task System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <img
              src={user?.avatar || `https://i.pravatar.cc/40?u=${user?.id}`}
              alt={user?.name}
              className="w-9 h-9 rounded-full ring-2 ring-orange-500/50"
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{user?.name}</p>
              <span className="text-xs text-orange-400 font-medium">● {user?.role}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quản trị</p>
          {navItems.map(item => (
            <NavLink
                key={item.id}
                to={item.path}
                end
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm
                  ${isActive
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon size={17} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={14} className="opacity-50" />
              </NavLink>
          ))}
        </nav>

        {/* Back to Main App */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm"
          >
            <Activity size={17} />
            <span>Về ứng dụng chính</span>
            <ChevronRight size={14} className="ml-auto opacity-50" />
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <LogOut size={17} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const AdminTopBar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
          <span>Admin Panel</span>
          <ChevronRight size={12} />
          <span className="text-gray-600 font-medium">Tổng quan hệ thống</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-700 font-mono">
            {time.toLocaleTimeString('vi-VN')}
          </p>
          <p className="text-xs text-gray-400">
            {time.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        <button className="relative p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default function AdminApp() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginView />;

  if (user.role?.toLowerCase() !== 'admin' && !user.permissions?.includes('admin_panel')) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={40} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Truy cập bị từ chối</h1>
          <p className="text-slate-400 text-sm mb-6">Bạn không có quyền truy cập vào trang quản trị.</p>
          <a
            href="/"
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-shadow"
          >
            Quay về ứng dụng
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Dedicated Admin Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">

        {/* Admin Top Bar */}
        <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/users" element={<AdminUserManagement />} />
            <Route path="/roles" element={<AdminRoleManagement />} />
            <Route path="/departments" element={<AdminDepartmentManagement />} />
            <Route path="/tasks" element={<AdminTaskManagement />} />
            <Route path="/reports" element={<AdminReportManagement />} />
            <Route path="/meetings" element={<AdminMeetingManagement />} />
            <Route path="/settings" element={<AdminSystemConfig />} />
            <Route path="/database" element={<AdminDatabaseManagement />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>

      </div>
    </div>
  );
}
