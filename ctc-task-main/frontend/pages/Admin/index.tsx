import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckSquare, FileText, Video, Shield, TrendingUp,
  Activity, RefreshCw, AlertCircle, BarChart2, PieChart as PieIcon,
  Clock, UserCheck, XCircle, CheckCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalReports: number;
  activeMeetings: number;
  roleBreakdown: { role: string; count: number }[];
  taskStatusBreakdown: { status: string; count: number }[];
  taskDeptBreakdown: { department: string; count: number }[];
}

interface PasswordResetRequest {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  Admin: '#ef4444',
  Director: '#8b5cf6',
  Manager: '#3b82f6',
  Employee: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  'Done': '#22c55e',
  'In Progress': '#3b82f6',
  'Todo': '#94a3b8',
};

const DEPT_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f59e0b'];

// --- Sub Components ---

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  trend?: string;
}> = ({ label, value, icon: Icon, gradient, trend }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6 group">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${gradient} opacity-10 -translate-y-8 translate-x-8 group-hover:opacity-20 transition-opacity`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-4xl font-black text-gray-800 mt-1">{value.toLocaleString()}</p>
        {trend && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <TrendingUp size={10} /> {trend}
          </span>
        )}
      </div>
      <div className={`p-3 rounded-xl ${gradient}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </div>
);

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <h3 className="text-base font-bold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-sm">
        {label && <p className="font-bold text-gray-700 mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main Admin Dashboard ---

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, resetRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/password-reset-requests')
      ]);
      if (!statsRes.ok) throw new Error(`Server error: ${statsRes.status}`);
      const data: AdminStats = await statsRes.json();
      setStats(data);
      if (resetRes.ok) setResetRequests(await resetRes.json());
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-red-500">
        <AlertCircle size={48} strokeWidth={1.5} />
        <p className="font-semibold text-lg">{error || 'Lỗi không xác định'}</p>
        <button
          onClick={fetchStats}
          className="mt-2 px-5 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  const roleChart = stats.roleBreakdown.map(r => ({ name: r.role, value: r.count }));
  const statusChart = stats.taskStatusBreakdown.map(s => ({ name: s.status, value: s.count }));
  const deptChart = stats.taskDeptBreakdown.map(d => ({ name: d.department || 'Chưa phân', tasks: d.count }));

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.taskStatusBreakdown.find(s => s.status === 'Done')?.count || 0) / stats.totalTasks * 100)
    : 0;

  return (
    <div className="space-y-8 pb-8">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 rounded-2xl shadow-lg shadow-orange-200">
            <Shield size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Trang Quản Trị</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Tổng quan toàn hệ thống · Chỉ dành cho Admin
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={12} /> Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Tổng Người Dùng"
          value={stats.totalUsers}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-400"
          trend="Hoạt động"
        />
        <StatCard
          label="Tổng Công Việc"
          value={stats.totalTasks}
          icon={CheckSquare}
          gradient="bg-gradient-to-br from-purple-500 to-purple-400"
          trend={`${completionRate}% hoàn thành`}
        />
        <StatCard
          label="Tổng Báo Cáo"
          value={stats.totalReports}
          icon={FileText}
          gradient="bg-gradient-to-br from-orange-500 to-amber-400"
        />
        <StatCard
          label="Cuộc Họp Đang Diễn Ra"
          value={stats.activeMeetings}
          icon={Video}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-400"
        />
      </div>

      {/* System Health Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-orange-500" />
            <span className="text-sm font-bold text-gray-700">Tỉ lệ Hoàn thành Công việc Toàn Hệ thống</span>
          </div>
          <span className="text-2xl font-black text-gray-800">{completionRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-1000"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex gap-6 mt-3">
          {stats.taskStatusBreakdown.map(s => (
            <div key={s.status} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }} />
              <span className="text-xs text-gray-500">{s.status}: <strong>{s.count}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Role Distribution Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <SectionHeader
            icon={PieIcon}
            title="Phân bổ Vai trò Người dùng"
            subtitle="Số lượng thành viên theo từng cấp bậc"
          />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={roleChart}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {roleChart.map((entry, index) => (
                  <Cell key={`role-${index}`} fill={ROLE_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-sm font-medium text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Role Stats below */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {stats.roleBreakdown.map(r => (
              <div key={r.role} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.role] || '#94a3b8' }} />
                  <span className="text-xs font-medium text-gray-600">{r.role}</span>
                </div>
                <span className="text-sm font-bold text-gray-800">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Status Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <SectionHeader
            icon={BarChart2}
            title="Trạng thái Công việc"
            subtitle="Tỉ lệ công việc theo trạng thái hiện tại"
          />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusChart}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {statusChart.map((entry, index) => (
                  <Cell key={`status-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-sm font-medium text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {stats.taskStatusBreakdown.map(s => {
              const icons: Record<string, React.ReactNode> = {
                Done: <CheckCircle size={14} className="text-emerald-500" />,
                'In Progress': <Activity size={14} className="text-blue-500" />,
                Todo: <XCircle size={14} className="text-gray-400" />,
              };
              return (
                <div key={s.status} className="flex flex-col items-center bg-gray-50 py-3 rounded-xl gap-1">
                  {icons[s.status] || null}
                  <span className="text-lg font-black text-gray-800">{s.count}</span>
                  <span className="text-xs text-gray-400">{s.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task by Department Bar Chart */}
      {deptChart.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <SectionHeader
            icon={BarChart2}
            title="Công việc theo Phòng Ban"
            subtitle="Số lượng công việc được giao theo từng bộ phận"
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.08)' }} />
              <Bar dataKey="tasks" name="Công việc" radius={[6, 6, 0, 0]}>
                {deptChart.map((_, index) => (
                  <Cell key={`dept-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Password Reset Requests */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <SectionHeader
          icon={Clock}
          title="Yêu cầu quên mật khẩu"
          subtitle="Danh sách người dùng đang chờ admin cấp lại mật khẩu"
        />
        {resetRequests.length === 0 ? (
          <div className="text-sm text-gray-400">Hiện chưa có yêu cầu nào.</div>
        ) : (
          <div className="space-y-3">
            {resetRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{request.email}</p>
                  <p className="text-xs text-gray-400">{new Date(request.createdAt).toLocaleString('vi-VN')} · {request.status === 'pending' ? 'Đang chờ xử lý' : 'Đã xử lý'}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${request.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {request.status === 'pending' ? 'Pending' : 'Resolved'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Role Summary Table */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <SectionHeader
          icon={UserCheck}
          title="Bảng Phân quyền Hệ thống"
          subtitle="Tổng hợp số lượng nhân sự theo vai trò"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vai Trò</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Số lượng</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tỉ lệ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quyền hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.roleBreakdown.map(r => {
                const percent = Math.round((r.count / stats.totalUsers) * 100);
                const permissions: Record<string, string> = {
                  Admin: 'Toàn quyền hệ thống, quản lý người dùng',
                  Director: 'Xem toàn bộ, phê duyệt báo cáo, phản hồi Director',
                  Manager: 'Quản lý phòng ban, giao việc nhân viên',
                  Employee: 'Xem & thực hiện công việc được giao',
                };
                return (
                  <tr key={r.role} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `${ROLE_COLORS[r.role]}20`,
                          color: ROLE_COLORS[r.role] || '#64748b'
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[r.role] || '#64748b' }} />
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">{r.count}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: ROLE_COLORS[r.role] || '#94a3b8' }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">{permissions[r.role] || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
