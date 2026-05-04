import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { List, RefreshCw, AlertCircle, Search, Filter } from 'lucide-react';

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityId: string;
  entityType: string;
  metadata: string;
  createdAt: string;
  user?: { name: string; avatar: string; department: string };
}

export default function AdminActivityLogsManagement() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/activity?limit=500');
      if (!res.ok) throw new Error('Không thể tải log hệ thống');
      const data = await res.json();
      setLogs(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).filter(Boolean);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user?.name || log.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-200">
            <List size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Nhật ký Hệ thống</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Theo dõi đăng nhập và các hoạt động của người dùng
            </p>
          </div>
        </div>
        <button 
          onClick={fetchLogs} 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-600 text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Cập nhật
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm log theo ID User hoặc Chi tiết..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none text-sm bg-white min-w-[150px]"
          >
            <option value="all">Tất cả hoạt động</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <RefreshCw size={32} className="animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Đang tải nhật ký...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-red-500">
            <AlertCircle size={40} className="mb-4" />
            <p>{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <List size={48} className="mb-4 opacity-20" />
            <p>Không tìm thấy bản ghi nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Thời gian</th>
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Hành động</th>
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4 rounded-tr-xl">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map(log => {
                  const isLogin = log.action.toLowerCase().includes('đăng nhập');
                  const isCreate = log.action.toLowerCase().includes('tạo');
                  const isDelete = log.action.toLowerCase().includes('xóa');
                  let colorClass = 'bg-gray-100 text-gray-600';
                  if (isLogin) colorClass = 'bg-blue-50 text-blue-600 border border-blue-100';
                  if (isCreate) colorClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                  if (isDelete) colorClass = 'bg-rose-50 text-rose-600 border border-rose-100';

                  let metaObj: any = {};
                  try { metaObj = JSON.parse(log.metadata || '{}'); } catch(e){}

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div>
                            <p className="font-bold text-gray-800">{log.user.name}</p>
                            <p className="text-xs text-gray-500">{log.user.department}</p>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-gray-600">{log.userId || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${colorClass}`}>
                          {isLogin && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        <span className="uppercase text-xs font-bold text-gray-500">{log.entityType}</span>
                        <br/>
                        <span className="text-xs text-gray-400 font-mono" title={log.entityId}>{log.entityId?.slice(0,8)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs font-mono">
                         {Object.keys(metaObj).length > 0 ? (
                           <pre className="whitespace-pre-wrap">{JSON.stringify(metaObj, null, 2)}</pre>
                         ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
