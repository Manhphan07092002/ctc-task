import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, RefreshCw, AlertCircle, CheckCircle, Clock,
  XCircle, FileEdit, Trash2, ChevronDown, Filter, Eye,
  ThumbsUp, ThumbsDown, MessageSquare, Building2, X, Save
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Report, User } from '../../types';

const STATUS_META: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  Draft: { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Nháp', icon: <FileEdit size={11} /> },
  Pending: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Chờ duyệt', icon: <Clock size={11} /> },
  Approved: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Đã duyệt', icon: <CheckCircle size={11} /> },
  Rejected: { cls: 'bg-red-100 text-red-600 border-red-200', label: 'Từ chối', icon: <XCircle size={11} /> },
};

const RejectModal: React.FC<{
  report: Report; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}> = ({ report, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ThumbsDown size={15} className="text-red-500" /></div>
            <h3 className="font-bold text-gray-800">Từ chối báo cáo</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-600">Báo cáo: <strong>{report.title}</strong></p>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Lý do từ chối <span className="text-red-500">*</span></label>
          <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do từ chối để thông báo cho người gửi..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none text-sm resize-none" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
          <button disabled={!reason.trim() || saving}
            onClick={async () => { setSaving(true); await onConfirm(reason); setSaving(false); }}
            className="px-5 py-2 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 hover:bg-red-600 transition-colors">
            {saving ? <><RefreshCw size={14} className="animate-spin" />Đang xử lý...</> : <><ThumbsDown size={14} />Từ chối</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminReportManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailReport, setDetailReport] = useState<Report | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rr, ur] = await Promise.all([fetch('/api/reports'), fetch('/api/users')]);
      const list: Report[] = await rr.json();
      setReports(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setUsers(await ur.json());
    } catch { setError('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const patchReport = async (r: Report, patch: Partial<Report>) => {
    const updated = { ...r, ...patch };
    const res = await fetch(`/api/reports/${r.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Lỗi cập nhật');
    return updated as Report;
  };

  const handleApprove = async (r: Report) => {
    try {
      const updated = await patchReport(r, { status: 'Approved', approvedAt: new Date().toISOString() });
      showToast('Đã phê duyệt báo cáo!');
      await fetchAll();
      if (detailReport?.id === r.id) setDetailReport(updated);
    } catch { showToast('Lỗi phê duyệt', 'error'); }
  };

  const handleReject = async (r: Report, reason: string) => {
    try {
      const updated = await patchReport(r, { status: 'Rejected', directorFeedback: reason });
      showToast('Đã từ chối báo cáo');
      setRejectTarget(null);
      await fetchAll();
      if (detailReport?.id === r.id) setDetailReport(updated);
    } catch { showToast('Lỗi xử lý', 'error'); }
  };

  const handleSetPending = async (r: Report) => {
    try {
      const updated = await patchReport(r, { status: 'Pending' });
      showToast('Đã chuyển về Chờ duyệt');
      await fetchAll();
      if (detailReport?.id === r.id) setDetailReport(updated);
    } catch { showToast('Lỗi', 'error'); }
  };

  const handleDelete = async (r: Report) => {
    if (!confirm(`Xóa báo cáo "${r.title}"?`)) return;
    setDeletingId(r.id);
    try {
      await fetch(`/api/reports/${r.id}`, { method: 'DELETE' });
      showToast(`Đã xóa: ${r.title}`);
      if (detailReport?.id === r.id) setDetailReport(null);
      await fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
    finally { setDeletingId(null); }
  };

  const getUser = (id?: string) => users.find(u => u.id === id);
  const departments = [...new Set(reports.map(r => r.department).filter(Boolean))].sort();

  const filtered = reports.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.department?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterDept && r.department !== filterDept) return false;
    return true;
  });

  const statusCounts = Object.keys(STATUS_META).reduce((acc, k) => ({ ...acc, [k]: reports.filter(r => r.status === k).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6 pb-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-200">
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Quản lý Báo cáo</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tổng cộng <strong className="text-gray-700">{reports.length}</strong> báo cáo</p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm"><RefreshCw size={16} /></button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([status, s]) => (
          <button key={status} onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`rounded-xl p-4 flex items-center gap-3 border transition-all cursor-pointer
              ${filterStatus === status ? s.cls + ' ring-2 ring-offset-1 ring-current shadow-md' : s.cls + ' hover:opacity-80'}`}>
            <span>{s.icon}</span>
            <div className="text-left">
              <p className="text-2xl font-black leading-none">{statusCounts[status] || 0}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={15} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, phòng ban..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-200 outline-none text-sm shadow-sm" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={14} />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-orange-200 outline-none shadow-sm appearance-none">
            <option value="">Tất cả phòng ban</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={13} />
        </div>
        {(filterStatus || filterDept || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterDept(''); }}
            className="px-3 py-2.5 text-xs text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50">Xóa bộ lọc</button>
        )}
      </div>

      {/* Table + Detail */}
      <div className={`flex gap-5 ${detailReport ? 'flex-col xl:flex-row' : ''}`}>
        <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${detailReport ? 'xl:flex-1' : 'flex-1'}`}>
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-3">
              <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-24 gap-3 text-red-500">
              <AlertCircle size={40} strokeWidth={1.5} /><p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p>Không có báo cáo nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Báo cáo</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tác giả</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ngày tạo</th>
                    <th className="text-right py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => {
                    const author = getUser(r.authorId);
                    const s = STATUS_META[r.status];
                    const isActive = detailReport?.id === r.id;
                    return (
                      <tr key={r.id}
                        className={`transition-colors cursor-pointer group ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50/70'}`}
                        onClick={() => setDetailReport(isActive ? null : r)}>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                              <FileText size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 truncate max-w-[220px]">{r.title}</p>
                              <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 size={10} />{r.department}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          {author && (
                            <div className="flex items-center gap-2">
                              <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full object-cover" />
                              <span className="text-xs text-gray-600 truncate max-w-[100px]">{author.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${s?.cls}`}>
                            {s?.icon} {s?.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {r.status === 'Pending' && (<>
                              <button onClick={() => handleApprove(r)} title="Phê duyệt"
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><ThumbsUp size={13} /></button>
                              <button onClick={() => setRejectTarget(r)} title="Từ chối"
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><ThumbsDown size={13} /></button>
                            </>)}
                            {(r.status === 'Approved' || r.status === 'Rejected') && (
                              <button onClick={() => handleSetPending(r)} title="Đặt lại Chờ duyệt"
                                className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded-lg"><Clock size={13} /></button>
                            )}
                            <button onClick={() => setDetailReport(isActive ? null : r)} title="Xem chi tiết"
                              className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Eye size={13} /></button>
                            <button disabled={deletingId === r.id} onClick={() => handleDelete(r)} title="Xóa"
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-50">
                              {deletingId === r.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detailReport && (() => {
          const author = getUser(detailReport.authorId);
          const approver = getUser(detailReport.approvedBy);
          const s = STATUS_META[detailReport.status];
          return (
            <div className="xl:w-96 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Chi tiết báo cáo</h3>
                <button onClick={() => setDetailReport(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
              <div className="h-px bg-gray-100" />
              <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tiêu đề</p><p className="font-bold text-gray-800">{detailReport.title}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Phòng ban</p><p className="text-sm font-semibold">{detailReport.department}</p></div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Trạng thái</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${s?.cls}`}>{s?.icon} {s?.label}</span>
                </div>
              </div>
              {author && (
                <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tác giả</p>
                  <div className="flex items-center gap-2">
                    <img src={author.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-sm font-semibold text-gray-700">{author.name}</span>
                  </div>
                </div>
              )}
              {approver && (
                <div><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Người duyệt</p>
                  <div className="flex items-center gap-2">
                    <img src={approver.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-sm font-semibold text-gray-700">{approver.name}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Nội dung</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {detailReport.content || 'Không có nội dung.'}
                </div>
              </div>
              {detailReport.directorFeedback && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare size={10} /> Phản hồi</p>
                  <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700 leading-relaxed whitespace-pre-wrap">{detailReport.directorFeedback}</div>
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detailReport.status === 'Pending' && (<>
                  <button onClick={() => handleApprove(detailReport)}
                    className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors">
                    <ThumbsUp size={13} />Phê duyệt
                  </button>
                  <button onClick={() => setRejectTarget(detailReport)}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors">
                    <ThumbsDown size={13} />Từ chối
                  </button>
                </>)}
                {(detailReport.status === 'Approved' || detailReport.status === 'Rejected') && (
                  <button onClick={() => handleSetPending(detailReport)}
                    className="flex-1 py-2 bg-yellow-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-yellow-600 transition-colors">
                    <Clock size={13} />Đặt lại chờ duyệt
                  </button>
                )}
                <button onClick={() => handleDelete(detailReport)}
                  className="p-2 bg-gray-100 text-red-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors" title="Xóa">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal report={rejectTarget} onClose={() => setRejectTarget(null)}
          onConfirm={reason => handleReject(rejectTarget, reason)} />
      )}
    </div>
  );
}
