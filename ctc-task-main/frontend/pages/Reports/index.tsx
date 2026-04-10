import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Avatar } from '../../components/UI';
import { PlusCircle, FileText, CheckCircle, Clock, XCircle, FileEdit } from 'lucide-react';
import { ReportModal } from './ReportModal';
import { Report } from '../../types';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { reports, tasks, users, departments, saveReport } = useData();
  const { user } = useAuth();

  // ── All hooks must be called before any conditional return ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const perms      = user?.permissions || [];
  const canApprove = perms.includes('approve_dept_reports');
  const canViewAll = perms.includes('view_all_reports');
  const canCreate  = perms.includes('create_report');

  // Initial tab: director starts on 'all', others on 'mine'
  const [activeTab, setActiveTab] = useState<'mine' | 'pending' | 'all'>(
    canViewAll ? 'all' : 'mine'
  );

  // Sync tab if user permissions change at runtime
  useEffect(() => {
    if (canViewAll && activeTab === 'mine') setActiveTab('all');
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

  const pendingDirectorReports = useMemo(() => {
    if (!canViewAll || !user) return [];
    return reports
      .filter(r => r.status === 'Pending' && r.authorId !== user.id)
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());
  }, [reports, canViewAll, user]);

  const directorReports = useMemo(() => {
    if (!canViewAll) return [];
    return reports
      .filter(r => r.status === 'Approved')
      .sort((a, b) => new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime());
  }, [reports, canViewAll]);

  // ── Early return AFTER all hooks ──
  if (!user) return null;

  const handleOpenCreate = () => { setSelectedReport(null); setIsModalOpen(true); };
  const handleOpenView   = (r: Report) => { setSelectedReport(r); setIsModalOpen(true); };
  const getUserDetails   = (id: string) => users.find(u => u.id === id);

  const pendingList = canViewAll ? pendingDirectorReports : pendingManagerReports;

  let displayedReports: Report[] = [];
  if (activeTab === 'all'     && canViewAll)  displayedReports = directorReports;
  else if (activeTab === 'pending')            displayedReports = pendingList;
  else                                         displayedReports = myReports;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':    return <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center gap-1"><FileEdit size={12}/> Nháp</span>;
      case 'Pending':  return <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock size={12}/> Chờ duyệt</span>;
      case 'Approved': return <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Đã duyệt</span>;
      case 'Rejected': return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1"><XCircle size={12}/> Từ chối</span>;
      default: return null;
    }
  };

  const tabClass = (tab: string) =>
    `py-3 px-5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý Báo cáo</h2>
          <p className="text-gray-500 text-sm mt-1">Gửi hoặc xem báo cáo công việc hàng tuần</p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate}>
            <PlusCircle size={18} className="mr-2" /> Tạo báo cáo tuần này
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button className={tabClass('mine')} onClick={() => setActiveTab('mine')}>
          Báo cáo của tôi
        </button>

        {(canApprove || canViewAll) && (
          <button className={tabClass('pending')} onClick={() => setActiveTab('pending')}>
            Cần duyệt
            {pendingList.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                {pendingList.length}
              </span>
            )}
          </button>
        )}

        {canViewAll && (
          <button className={tabClass('all')} onClick={() => setActiveTab('all')}>
            Toàn cục (Đã duyệt)
            {directorReports.length > 0 && (
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                {directorReports.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Director banner */}
      {activeTab === 'all' && canViewAll && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 mb-6">
          <p className="font-bold text-base">Chế độ Xem Toàn Cục</p>
          <p className="text-sm mt-0.5">Bạn đang xem tất cả báo cáo đã được Trưởng phòng phê duyệt trên toàn hệ thống.</p>
        </div>
      )}

      {/* Report table */}
      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 grid grid-cols-12 gap-4 items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5 md:col-span-4">Tiêu đề</div>
          <div className="col-span-3 hidden md:block text-center">Người duyệt</div>
          <div className="col-span-2 text-center">Trạng thái</div>
          <div className="col-span-5 md:col-span-3 text-right">Ngày cập nhật</div>
        </div>

        <div className="divide-y divide-gray-100">
          {displayedReports.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <FileText size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Không có báo cáo nào.</p>
            </div>
          ) : displayedReports.map(report => {
            const author   = getUserDetails(report.authorId);
            let   approver = report.approvedBy ? getUserDetails(report.approvedBy) : null;
            if (!approver && report.status === 'Pending') {
              const dept = departments.find(d => d.name === report.department);
              if (dept?.managerId) approver = getUserDetails(dept.managerId);
            }

            return (
              <div
                key={report.id}
                onClick={() => handleOpenView(report)}
                className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-blue-50/40 transition-colors cursor-pointer group"
              >
                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex flex-shrink-0 items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{report.title}</p>
                    {(canViewAll || canApprove) && author && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Avatar src={author.avatar} alt={author.name} size={4} /> {author.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="col-span-3 hidden md:flex items-center justify-center">
                  {approver ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Avatar src={approver.avatar} alt={approver.name} size={6} />
                      <span className="truncate max-w-[100px]">{approver.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>

                <div className="col-span-2 flex justify-center">
                  {renderStatusBadge(report.status)}
                </div>

                <div className="col-span-5 md:col-span-3 text-right text-sm text-gray-500">
                  {new Date(report.approvedAt || report.submittedAt || report.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(r) => saveReport(r)}
        initialReport={selectedReport}
        currentUser={user}
        tasks={tasks}
        departments={departments}
        t={t}
      />
    </div>
  );
}
