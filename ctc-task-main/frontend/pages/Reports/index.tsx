import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button, Card, Avatar } from '../../components/UI';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, FileEdit, Download, CalendarDays, Building2, Trash2, Search, Filter, PieChart, BarChart } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ReportModal } from './ReportModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Report } from '../../types';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { reports, tasks, users, roles, departments, saveReport, deleteReport, adminHardDeleteReport } = useData();
  const { user } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();

  // ── All hooks must be called before any conditional return ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const perms      = user?.permissions || [];
  const canApprove = perms.includes('approve_dept_reports');
  const canViewAll = perms.includes('view_all_reports');
  const canCreate  = perms.includes('create_report');

  // Initial tab: director starts on 'pending', others on 'mine'
  const [activeTab, setActiveTab] = useState<'mine' | 'pending' | 'all' | 'weekly_summary'>(
    canViewAll ? 'pending' : 'mine'
  );

  // Sync tab if user permissions change at runtime
  useEffect(() => {
    if (canViewAll && activeTab === 'mine') setActiveTab('pending');
  }, [canViewAll]);

  const myReports = useMemo(() => {
    if (!user) return [];
    return reports
      .filter(r => r.authorId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, user]);

  const pendingManagerReports = useMemo(() => {
    if (!canApprove || !user) return [];
    return reports
      .filter(r => r.department === user.department && r.status === 'Pending' && r.authorId !== user.id)
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());
  }, [reports, user, canApprove]);

  // List of roles that have manager capabilities (approve_dept_reports permission)
  const managerRoleNames = useMemo(() => {
    return new Set(
      roles
        .filter(r => Array.isArray(r.permissions) && r.permissions.includes('approve_dept_reports'))
        .map(r => r.name)
    );
  }, [roles]);

  // IDs of users who are department managers dynamically computed
  const managerIds = useMemo(
    () => new Set(users.filter(u => managerRoleNames.has(u.role)).map(u => u.id)),
    [users, managerRoleNames]
  );

  const pendingDirectorReports = useMemo(() => {
    if (!canViewAll) return [];
    return reports
      .filter(r => r.status === 'Pending' && managerIds.has(r.authorId))
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());
  }, [reports, canViewAll, managerIds]);

  const directorReports = useMemo(() => {
    if (!canViewAll) return [];
    // Director only sees Approved reports authored by department managers (Trưởng phòng)
    return reports
      .filter(r => r.status === 'Approved' && managerIds.has(r.authorId))
      .sort((a, b) => new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime());
  }, [reports, canViewAll, managerIds]);

  // ── Early return AFTER all hooks ──
  if (!user) return null;

  const handleOpenCreate = () => { setSelectedReport(null); setIsModalOpen(true); };
  const handleOpenView   = (r: Report) => { setSelectedReport(r); setIsModalOpen(true); };
  const getUserDetails   = (id: string) => users.find(u => u.id === id);

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-create/update consolidated dept report when manager approves an employee's report
  // ──────────────────────────────────────────────────────────────────────────
  const autoConsolidateForManager = async (approvedReport: Report) => {
    if (!user || !canApprove) return;

    let weekStart = '';
    let weekEnd = '';
    try {
      const c = JSON.parse(approvedReport.content);
      weekStart = c.weekStart || '';
      weekEnd   = c.weekEnd   || '';
    } catch {}
    if (!weekStart || !weekEnd) return;

    const fmtD = (iso: string) => {
      if (!iso) return '';
      const parts = iso.split('-');
      return `${parts[2]}/${parts[1]}`;
    };

    // All approved employee reports for same dept + same week (include the newly approved one)
    const weekDeptReports = [
      ...reports.filter(r =>
        r.id !== approvedReport.id &&
        r.department === user.department &&
        r.authorId !== user.id &&
        r.status === 'Approved'
      ),
      approvedReport,
    ].filter(r => {
      try {
        const c = JSON.parse(r.content);
        return c.weekStart === weekStart && c.weekEnd === weekEnd;
      } catch { return false; }
    });

    // Aggregate all task rows from each employee's report
    const aggregatedTasks = weekDeptReports.flatMap(r => {
      const authorName = users.find(u => u.id === r.authorId)?.name || 'Nhân viên';
      try {
        const c = JSON.parse(r.content);
        return (Array.isArray(c.tasks) ? c.tasks : [])
          .filter((t: any) => t.content?.trim())
          .map((t: any) => ({ ...t, id: Math.random().toString(36).slice(2), assignee: authorName }));
      } catch { return []; }
    });

    // Find existing consolidated report for this manager + week (to update instead of duplicate)
    const existing = reports.find(r =>
      r.authorId === user.id &&
      r.department === user.department &&
      (() => {
        try { const c = JSON.parse(r.content); return c.weekStart === weekStart && c.weekEnd === weekEnd; }
        catch { return false; }
      })()
    );

    let prevNextWeekPlan = '';
    if (existing) {
      try { prevNextWeekPlan = JSON.parse(existing.content).nextWeekPlan || ''; } catch {}
    }

    const consolidated: Report = {
      id: existing?.id || Math.random().toString(36).slice(2, 9),
      title: `Báo cáo tổng hợp phòng ${user.department} · Tuần ${fmtD(weekStart)}–${fmtD(weekEnd)}`,
      content: JSON.stringify({ tasks: aggregatedTasks, nextWeekPlan: prevNextWeekPlan, weekStart, weekEnd }),
      authorId: user.id,
      department: user.department,
      status: 'Pending',
      createdAt: existing?.createdAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      directorFeedback: existing?.directorFeedback,
      managerFeedback: existing?.managerFeedback,
    };

    await saveReport(consolidated);
  };

  const exportCsv = () => {
    const header = ['Tiêu đề', 'Phòng ban', 'Trạng thái', 'Tác giả', 'Người duyệt', 'Ngày tạo'];
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = displayedReports.map(r => [
      r.title,
      r.department,
      r.status,
      getUserDetails(r.authorId)?.name || r.authorId,
      (r.approvedBy && getUserDetails(r.approvedBy)?.name) || '',
      r.approvedAt || r.submittedAt || r.createdAt,
    ]);
    const csv = [header, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingList = canViewAll ? pendingDirectorReports : pendingManagerReports;

  let displayedReports: Report[] = [];
  if (activeTab === 'all'     && canViewAll)  displayedReports = directorReports;
  else if (activeTab === 'pending')            displayedReports = pendingList;
  else if (activeTab === 'weekly_summary')     displayedReports = [];
  else                                         displayedReports = myReports;

  // Apply department filter for director
  if (canViewAll && activeTab === 'all' && filterDept !== 'all') {
    displayedReports = displayedReports.filter(r => r.department === filterDept);
  }

  // Search & Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayedReports = displayedReports.filter(r => 
      r.title.toLowerCase().includes(q) || 
      (getUserDetails(r.authorId)?.name || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    displayedReports = displayedReports.filter(r => r.status === statusFilter);
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':    return <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center gap-1"><FileEdit size={12}/> Nháp</span>;
      case 'Pending':  return <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock size={12}/> Chờ duyệt</span>;
      case 'Approved': return <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Đã duyệt</span>;
      case 'Rejected': return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1"><XCircle size={12}/> Từ chối</span>;
      default: return null;
    }
  };

  const myStats = {
    total:    myReports.length,
    pending:  myReports.filter(r => r.status === 'Pending').length,
    approved: myReports.filter(r => r.status === 'Approved').length,
    rejected: myReports.filter(r => r.status === 'Rejected').length,
  };

  const pieData = [
    { name: 'Đã duyệt', value: myStats.approved, color: '#10b981' },
    { name: 'Chờ duyệt', value: myStats.pending, color: '#f59e0b' },
    { name: 'Từ chối', value: myStats.rejected, color: '#ef4444' },
  ].filter(d => d.value > 0);
  
  const deptData = canViewAll ? departments.filter(d => !['GIÁM ĐỐC','ADMIN'].includes(d.name)).map(dept => {
    return {
      name: dept.name,
      approved: reports.filter(r => r.department === dept.name && r.status === 'Approved').length,
      pending: reports.filter(r => r.department === dept.name && r.status === 'Pending').length,
    };
  }) : [];

  const currentWeekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).setHours(0,0,0,0);
  }, []);

  const unsubmittedEmployees = useMemo(() => {
    if (canViewAll || !canApprove) return [];
    if (!user) return [];
    const myDept = user.department;
    const deptUsers = users.filter(u => u.department === myDept && u.role !== 'Admin');
    const submittedIds = new Set(
      reports.filter(r => r.department === myDept && new Date(r.createdAt).getTime() >= currentWeekStart).map(r => r.authorId)
    );
    return deptUsers.filter(u => !submittedIds.has(u.id));
  }, [canViewAll, canApprove, user, users, reports, currentWeekStart]);

  const unsubmittedDepts = useMemo(() => {
    if (!canViewAll) return [];
    const activeDepts = departments.filter(d => !['GIÁM ĐỐC', 'ADMIN'].includes(d.name)).map(d => d.name);
    const submittedDepts = new Set(
      reports.filter(r => new Date(r.createdAt).getTime() >= currentWeekStart).map(r => r.department)
    );
    return activeDepts.filter(d => !submittedDepts.has(d));
  }, [canViewAll, departments, reports, currentWeekStart]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Báo cáo</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gửi, theo dõi và xuất báo cáo công việc hàng tuần</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors shadow-sm border ${showAnalytics ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            <PieChart size={16}/> Thống kê
          </button>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={16}/> Xuất CSV
          </button>
          {(canCreate || canApprove) && !canViewAll && (
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">
              <PlusCircle size={16}/>
              {canApprove ? 'Tạo báo cáo tổng hợp phòng' : 'Tạo báo cáo tuần này'}
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS (non-director) */}
      {!canViewAll && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tổng báo cáo', value: myStats.total,    bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100',   icon: <FileText size={22}/> },
            { label: 'Chờ duyệt',    value: myStats.pending,  bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', icon: <Clock size={22}/> },
            { label: 'Đã duyệt',     value: myStats.approved, bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100',  icon: <CheckCircle size={22}/> },
            { label: 'Từ chối',      value: myStats.rejected, bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100',    icon: <XCircle size={22}/> },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border ${s.bg} ${s.border} p-4 flex items-center gap-3`}>
              <div className={`${s.text} opacity-80`}>{s.icon}</div>
              <div>
                <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS DASHBOARD */}
      {showAnalytics && (
        <div className={`grid grid-cols-1 ${canViewAll ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 animate-in fade-in slide-in-from-top-4 duration-300`}>
          {!canViewAll ? (
            <>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart size={16}/> Tỷ lệ trạng thái báo cáo</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RePieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <ReTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {canApprove && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full max-h-[330px]">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-500"/> Chưa nộp báo cáo tuần này</h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {unsubmittedEmployees.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-6">
                        <CheckCircle size={32} className="text-green-400 mb-2 opacity-50"/>
                        <span className="text-sm font-medium">Tất cả nhân viên đã nộp</span>
                      </div>
                    ) : (
                      unsubmittedEmployees.map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors">
                          <Avatar src={u.avatar} alt={u.name} size={8}/>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{u.name}</p>
                            <p className="text-xs text-red-500 font-medium">Chưa nộp</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChart size={16}/> Thống kê theo phòng ban</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ReBarChart data={deptData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <ReTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Bar dataKey="approved" name="Đã duyệt" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="pending" name="Chờ duyệt" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full max-h-[360px]">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Building2 size={16} className="text-amber-500"/> Phòng ban chưa nộp tuần này</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {unsubmittedDepts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-6">
                      <CheckCircle size={32} className="text-green-400 mb-2 opacity-50"/>
                      <span className="text-sm font-medium">Tất cả phòng ban đã nộp</span>
                    </div>
                  ) : (
                    unsubmittedDepts.map(d => (
                      <div key={d} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors">
                        <div className="p-2 bg-white text-red-500 rounded-lg shadow-sm border border-red-100">
                          <Building2 size={16}/>
                        </div>
                        <p className="text-sm font-bold text-gray-800 flex-1">{d}</p>
                        <span className="text-[10px] font-bold text-red-500 bg-white px-2 py-1 rounded shadow-sm border border-red-100">Thiếu</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {!canViewAll && (
          <button
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab==='mine'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('mine')}
          >
            <FileText size={15}/> Báo cáo của tôi
            <span className="bg-gray-100 text-gray-600 text-[11px] px-1.5 py-0.5 rounded-full">{myStats.total}</span>
          </button>
        )}
        {!canViewAll && canApprove && (
          <button
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab==='pending'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={15}/> Cần duyệt
            {pendingList.length > 0 && <span className="bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingList.length}</span>}
          </button>
        )}
        {canViewAll && (
          <>
            <button className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab==='pending'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={()=>setActiveTab('pending')}>
              <Clock size={15}/> Chưa duyệt
              {pendingDirectorReports.length>0&&<span className="bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingDirectorReports.length}</span>}
            </button>
            <button className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab==='all'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={()=>setActiveTab('all')}>
              <CheckCircle size={15}/> Đã duyệt
              {directorReports.length>0&&<span className="bg-green-100 text-green-700 text-[11px] px-1.5 py-0.5 rounded-full">{directorReports.length}</span>}
            </button>
            <button className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab==='weekly_summary'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={()=>setActiveTab('weekly_summary')}>
              <CalendarDays size={15}/> Tổng hợp tuần
            </button>
          </>
        )}
      </div>

      {/* FILTERS & SEARCH */}
      {activeTab !== 'weekly_summary' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm báo cáo..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-gray-50/50 hover:bg-white focus:bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
                <option value="Draft">Nháp</option>
              </select>
            </div>

            {/* DEPT FILTER */}
            {activeTab === 'all' && canViewAll && (
              <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl border border-gray-200">
                {['all',...departments.filter(d=>!['GIÁM ĐỐC','ADMIN'].includes(d.name)).map(d=>d.name)].map(n=>(
                  <button key={n} onClick={()=>setFilterDept(n)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${filterDept===n?'bg-white text-blue-700 shadow-sm border border-gray-200':'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'}`}>
                    {n==='all'?'Tất cả phòng':n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY SUMMARY */}
      {activeTab==='weekly_summary'&&canViewAll?(
        <div className="space-y-5">
          {Object.entries(
            [...directorReports,...pendingDirectorReports].reduce((acc,r)=>{
              let k='Tuần không xác định';
              try{const c=JSON.parse(r.content||'{}');if(c.weekStart&&c.weekEnd)k=`Tuần ${c.weekStart} – ${c.weekEnd}`;}catch{}
              if(!acc[k])acc[k]=[];acc[k].push(r);return acc;
            },{} as Record<string,Report[]>)
          ).sort((a,b)=>b[0].localeCompare(a[0])).map(([week,rpts])=>(
            <div key={week} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                <h3 className="font-bold text-blue-800 flex items-center gap-2"><CalendarDays size={16}/>{week}</h3>
                <span className="text-xs font-medium text-blue-600 bg-white px-2.5 py-1 rounded-full border border-blue-200">{rpts.length} phòng</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {departments.filter(d=>!['GIÁM ĐỐC','ADMIN'].includes(d.name)).map(dept=>{
                  const rpt=rpts.find(r=>r.department===dept.name);
                  return(
                    <div key={dept.id} onClick={()=>rpt&&handleOpenView(rpt)}
                      className={`p-4 rounded-xl border-2 transition-all ${rpt?'border-green-200 bg-green-50/40 hover:bg-green-50 cursor-pointer shadow-sm hover:shadow':'border-dashed border-gray-200 bg-gray-50/50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rpt?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}`}><Building2 size={18}/></div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm ${rpt?'text-gray-800':'text-gray-400'}`}>{dept.name}</h4>
                          {rpt&&<div className="mt-0.5">{renderStatusBadge(rpt.status)}</div>}
                        </div>
                      </div>
                      {rpt?<p className="text-xs text-gray-500 line-clamp-2">{rpt.title}</p>:<p className="text-xs text-gray-400 flex items-center gap-1"><XCircle size={12}/>Chưa nộp</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {directorReports.length===0&&pendingDirectorReports.length===0&&(
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              <FileText size={40} className="mx-auto mb-3 opacity-20"/><p className="font-medium">Không có dữ liệu tổng hợp</p>
            </div>
          )}
        </div>
      ):(
        /* REPORT LIST */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 grid grid-cols-12 gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-6 md:col-span-5">Báo cáo</div>
            <div className="col-span-3 hidden md:block text-center">Người duyệt</div>
            <div className="col-span-2 text-center">Trạng thái</div>
            <div className="col-span-6 md:col-span-2 text-right">Ngày</div>
          </div>
          <div className="divide-y divide-gray-100">
            {displayedReports.length===0?(
              <div className="py-16 text-center text-gray-400">
                <FileText size={44} className="mx-auto mb-3 opacity-20"/>
                <p className="font-medium text-gray-500">Không có báo cáo nào</p>
                <p className="text-sm mt-1 text-gray-400">{activeTab==='pending'?'Tất cả báo cáo đã được xử lý ✓':'Nhấn nút tạo báo cáo để bắt đầu'}</p>
              </div>
            ):displayedReports.map(report=>{
              const author=getUserDetails(report.authorId);
              let approver=report.approvedBy?getUserDetails(report.approvedBy):null;
              if(!approver&&report.status==='Pending'){const dept=departments.find(d=>d.name===report.department);if(dept?.managerId)approver=getUserDetails(dept.managerId);}
              const lColor=report.status==='Approved'?'border-l-green-400':report.status==='Pending'?'border-l-yellow-400':report.status==='Rejected'?'border-l-red-400':'border-l-gray-200';
              const iColor=report.status==='Approved'?'bg-green-100 text-green-600':report.status==='Pending'?'bg-yellow-100 text-yellow-600':report.status==='Rejected'?'bg-red-100 text-red-500':'bg-gray-100 text-gray-400';
              const d=new Date(report.approvedAt||report.submittedAt||report.createdAt);
              return(
                <div key={report.id} onClick={()=>handleOpenView(report)}
                  className={`px-5 py-4 grid grid-cols-12 gap-3 items-center hover:bg-blue-50/40 transition-colors cursor-pointer group border-l-4 ${lColor}`}>
                  <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${iColor}`}><FileText size={18}/></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-sm group-hover:text-blue-600 transition-colors">{report.title}</p>
                      {(canViewAll||canApprove)&&author&&(
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Avatar src={author.avatar} alt={author.name} size={4}/>{author.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 hidden md:flex items-center justify-center">
                    {approver?(<div className="flex items-center gap-2"><Avatar src={approver.avatar} alt={approver.name} size={6}/><span className="truncate max-w-[90px] text-xs text-gray-600">{approver.name}</span></div>):<span className="text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 flex justify-center">{renderStatusBadge(report.status)}</div>
                  <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">{d.toLocaleDateString('vi-VN')}</p>
                      <p className="text-[11px] text-gray-400">{d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    {report.authorId===user.id&&(
                      <button onClick={e=>{e.stopPropagation();setDeleteConfirmId(report.id);}} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

            <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (r) => {
          await saveReport(r);
          // If manager just approved an employee's report: auto-create/update consolidated dept report
          if (
            r.status === 'Approved' &&
            canApprove &&
            !canViewAll &&
            r.authorId !== user?.id &&
            r.department === user?.department
          ) {
            await autoConsolidateForManager(r);
          }
          // Refresh notifications so badge updates immediately
          setTimeout(refreshNotifications, 800);
        }}
        onDelete={(id) => { deleteReport(id); setIsModalOpen(false); }}
        onAdminHardDelete={(id) => { adminHardDeleteReport(id); setIsModalOpen(false); }}
        initialReport={selectedReport}
        currentUser={user}
        tasks={tasks}
        departments={departments}
        users={users}
        allReports={reports}
        t={t}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Xóa báo cáo"
        message="Bạn có chắc chắn muốn xóa báo cáo này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteReport(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
