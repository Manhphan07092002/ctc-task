import React from 'react';
import { Target, Briefcase, DollarSign, PieChart as PieChartIcon, BarChart2, AlertTriangle, TrendingUp, Building } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { ProjectStats, ProjectRisk } from './hooks/useProjectStats';

interface Props {
  stats: ProjectStats;
  onNavigateToProject: (id: string) => void;
}

const StatCard = ({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) => (
  <div className={`bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 ${color} hover:shadow-md transition-shadow group`}>
    <p className="text-[11px] text-gray-500 font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
      <Icon size={14} className="opacity-70" /> {label}
    </p>
    <p className="text-2xl font-black text-gray-800 group-hover:text-gray-900 transition-colors">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1 font-medium">{sub}</p>}
  </div>
);

const RiskRow = ({ risk, onClick }: { risk: ProjectRisk; onClick: () => void }) => {
  const cls = risk.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700';
  const iconCls = risk.severity === 'high' ? 'text-red-500' : 'text-amber-500';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${cls}`} onClick={onClick}>
      <AlertTriangle size={16} className={`flex-shrink-0 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{risk.projectCode} — {risk.name}</p>
        <p className="text-[11px] opacity-80">{risk.message}</p>
      </div>
    </div>
  );
};

export const ProjectOverviewTab: React.FC<Props> = ({ stats, onNavigateToProject }) => {
  const completionRate = stats.totalProjects > 0 ? Math.round((stats.completedCount / stats.totalProjects) * 100) : 0;
  const gaugeData = [{ name: 'Hoàn thành', value: completionRate, fill: '#10B981' }];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard icon={Target} label="Tổng dự án" value={String(stats.totalProjects)} color="border-l-blue-500" sub={`${stats.activeProjects} đang hoạt động`} />
        <StatCard icon={TrendingUp} label="Đang chạy" value={String(stats.statusCounts.in_progress || 0)} color="border-l-indigo-500" />
        <StatCard icon={Briefcase} label="Giá trị HĐ" value={`${(stats.totalContractValue / 1000000).toFixed(0)}M`} color="border-l-purple-500" />
        <StatCard icon={DollarSign} label="Đã thanh toán" value={`${(stats.totalPaid / 1000000).toFixed(0)}M`} color="border-l-emerald-500" />
        <StatCard icon={PieChartIcon} label="Công nợ" value={`${(stats.totalDebt / 1000000).toFixed(0)}M`} color="border-l-orange-500" />
        <StatCard icon={AlertTriangle} label="Cảnh báo" value={String(stats.risks.length)} color={stats.risks.length > 0 ? 'border-l-red-500' : 'border-l-gray-300'} sub={stats.overdue > 0 ? `${stats.overdue} quá hạn` : 'Không có rủi ro'} />
      </div>

      {/* Risk alerts */}
      {stats.risks.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <AlertTriangle size={18} className="text-red-500" /> Cảnh báo Rủi ro ({stats.risks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {stats.risks.slice(0, 9).map(r => (
              <RiskRow key={`${r.id}-${r.type}`} risk={r} onClick={() => onNavigateToProject(r.id)} />
            ))}
          </div>
          {stats.risks.length > 9 && (
            <p className="text-xs text-gray-400 text-center mt-3 font-medium">...và {stats.risks.length - 9} cảnh báo khác</p>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-sm">
            <BarChart2 size={18} className="text-brand-500" /> Ngân sách & Giá trị HĐ (Top 10)
          </h3>
          <div className="h-80 w-full">
            {stats.projectFinancials.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.projectFinancials} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
                  <YAxis tickFormatter={val => `${(val / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F3F4F6' }}
                    formatter={(val: any) => [Number(val).toLocaleString('vi-VN') + ' đ', '']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="budget" name="Ngân sách" fill="#93C5FD" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="contractValue" name="Giá trị HĐ" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="paidAmount" name="Đã thanh toán" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm">Chưa có dữ liệu tài chính</div>
            )}
          </div>
        </div>

        {/* Right column: Pie + Gauge */}
        <div className="space-y-6">
          {/* Status Pie */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
              <PieChartIcon size={18} className="text-brand-500" /> Trạng thái
            </h3>
            <div className="h-48 w-full">
              {stats.statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                      {stats.statusPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => [val + ' dự án', 'Số lượng']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm">Chưa có dự án</div>
              )}
            </div>
          </div>

          {/* Department Pie */}
          {stats.departmentPie.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                <Building size={18} className="text-brand-500" /> Phân bổ phòng ban
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.departmentPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                      {stats.departmentPie.map((entry, index) => <Cell key={`dept-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => [val + ' dự án', '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Completion gauge */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2 text-sm">
              <TrendingUp size={18} className="text-emerald-500" /> Tỷ lệ hoàn thành
            </h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#E5E7EB" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="64" cy="64" r="56" stroke="#10B981" strokeWidth="10" fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionRate / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-gray-800">{completionRate}%</span>
                  <span className="text-[10px] text-gray-400 font-medium">{stats.completedCount}/{stats.totalProjects}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
