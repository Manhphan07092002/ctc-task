import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Database, Server, Activity, CheckCircle,
  AlertCircle, RefreshCw, HardDrive, Users, CheckSquare,
  FileText, Video, ArrowUpCircle, Clock
} from 'lucide-react';

interface SystemInfo {
  totalUsers: number;
  totalTasks: number;
  totalReports: number;
  activeMeetings: number;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-800">{value}</span>
  </div>
);

const StatusBadge: React.FC<{ ok: boolean; label?: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
    ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
    {label || (ok ? 'Online' : 'Offline')}
  </span>
);

export default function AdminSystemConfig() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(false);
  const [uptime] = useState<string>(() => {
    const start = new Date();
    return start.toLocaleTimeString('vi-VN');
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setBackendOk(true);
      } else {
        setBackendOk(false);
      }
    } catch {
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const dataItems = info ? [
    { icon: Users, label: 'Người dùng', value: info.totalUsers, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: CheckSquare, label: 'Công việc', value: info.totalTasks, color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: FileText, label: 'Báo cáo', value: info.totalReports, color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: Video, label: 'Cuộc họp đang mở', value: info.activeMeetings, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ] : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-lg shadow-slate-200">
          <Settings size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Cấu hình Hệ thống</h1>
          <p className="text-sm text-gray-400 mt-0.5">Thông tin kỹ thuật và trạng thái máy chủ</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-slate-600" />
              <span className="font-bold text-gray-700 text-sm">API Server</span>
            </div>
            <StatusBadge ok={backendOk} />
          </div>
          <div className="space-y-1">
            <InfoRow label="Framework" value="Express.js" />
            <InfoRow label="Port" value="3000" />
            <InfoRow label="Ngôn ngữ" value="TypeScript" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-slate-600" />
              <span className="font-bold text-gray-700 text-sm">Database</span>
            </div>
            <StatusBadge ok={backendOk} label="Connected" />
          </div>
          <div className="space-y-1">
            <InfoRow label="Engine" value="SQLite3" />
            <InfoRow label="File" value="database.sqlite" />
            <InfoRow label="Driver" value="better-sqlite3" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-slate-600" />
              <span className="font-bold text-gray-700 text-sm">Frontend</span>
            </div>
            <StatusBadge ok={true} label="Running" />
          </div>
          <div className="space-y-1">
            <InfoRow label="Framework" value="React 18" />
            <InfoRow label="Build Tool" value="Vite 6" />
            <InfoRow label="Ngôn ngữ" value="TypeScript" />
          </div>
        </div>
      </div>

      {/* System Clock */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Thời gian hệ thống
            </p>
            <p className="text-4xl font-black font-mono tracking-tight">
              {currentTime.toLocaleTimeString('vi-VN')}
            </p>
            <p className="text-slate-300 text-sm mt-1">
              {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-0.5">Timezone</p>
              <p className="font-bold">Asia/Ho_Chi_Minh</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-0.5">Phiên bắt đầu lúc</p>
              <p className="font-bold font-mono">{uptime}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-0.5">Môi trường</p>
              <p className="font-bold">Development</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-0.5">Node.js</p>
              <p className="font-bold">≥ 18.x</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-gray-600" />
            <h3 className="font-bold text-gray-700">Thống kê Cơ sở dữ liệu</h3>
          </div>
          <button onClick={fetchInfo}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={12} /> Làm mới
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataItems.map(item => (
              <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                <item.icon className={`${item.color} mx-auto mb-2`} size={22} />
                <p className="text-2xl font-black text-gray-800">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tech Stack */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <ArrowUpCircle size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-700">Technology Stack</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { category: 'Frontend', items: ['React 18', 'TypeScript', 'Vite 6', 'Tailwind CSS', 'Recharts', 'Lucide Icons', 'React Router v6'] },
            { category: 'Backend', items: ['Node.js', 'Express.js', 'TypeScript', 'SQLite3', 'sqlite (npm)', 'dotenv', 'CORS'] },
          ].map(section => (
            <div key={section.category}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{section.category}</p>
              <div className="flex flex-wrap gap-2">
                {section.items.map(item => (
                  <span key={item}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200 hover:bg-gray-200 transition-colors">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-700">API Endpoints đang hoạt động</h3>
        </div>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/api/users', desc: 'Danh sách người dùng' },
            { method: 'POST', path: '/api/users', desc: 'Tạo người dùng mới' },
            { method: 'PUT', path: '/api/users/:id', desc: 'Cập nhật người dùng' },
            { method: 'DELETE', path: '/api/users/:id', desc: 'Xóa người dùng' },
            { method: 'GET', path: '/api/tasks', desc: 'Danh sách công việc' },
            { method: 'POST/PUT/DELETE', path: '/api/tasks/:id', desc: 'Quản lý công việc' },
            { method: 'GET', path: '/api/reports', desc: 'Danh sách báo cáo' },
            { method: 'POST/PUT/DELETE', path: '/api/reports/:id', desc: 'Quản lý báo cáo' },
            { method: 'GET', path: '/api/meetings', desc: 'Danh sách cuộc họp' },
            { method: 'GET', path: '/api/admin/stats', desc: 'Thống kê quản trị hệ thống' },
          ].map((ep, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors">
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono min-w-[90px] text-center
                ${ep.method.startsWith('GET') ? 'bg-emerald-100 text-emerald-700' :
                  ep.method.startsWith('POST') ? 'bg-blue-100 text-blue-700' :
                  ep.method.startsWith('PUT') ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'}`}>
                {ep.method}
              </span>
              <code className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-0.5 rounded">{ep.path}</code>
              <span className="text-sm text-gray-400 ml-auto">{ep.desc}</span>
              <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
