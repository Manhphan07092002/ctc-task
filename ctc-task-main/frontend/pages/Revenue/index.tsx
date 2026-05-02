import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PlusCircle, Search, FileText, Trash2, X, Save, Send, CheckCircle, XCircle, DollarSign, CalendarDays, Clock, Download } from 'lucide-react';
import { RevenueReport } from '../../services/revenueService';
import { Contract } from '../../services/contractService';

const fmtMoney = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

interface RevenueRow {
  contractId: string;
  contractNumber: string;
  clientName: string;
  contractName: string;
  preTaxValue: number;
  deliveredMonth: number;
  deliveredCumulative: number;
  invoiceDate: string;
  invoiceNumber: string;
}

const RevenuePage: React.FC = () => {
  const { user } = useAuth();
  const { contracts, revenueReports, users, departments, saveRevenueReport, deleteRevenueReport } = useData();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [search, setSearch] = useState('');
  const [editingReport, setEditingReport] = useState<RevenueReport | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<RevenueReport | null>(null);

  // Form
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [managerFeedback, setManagerFeedback] = useState('');
  const [directorFeedback, setDirectorFeedback] = useState('');

  const perms = user?.permissions || [];
  const canCreate = perms.includes('create_revenue_report');
  const canApprove = perms.includes('approve_dept_reports');
  const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback');
  const isDirector = perms.includes('director_feedback');
  const userDept = user?.department || '';

  const visibleReports = useMemo(() => {
    let list = revenueReports;
    if (!canViewAll) {
      list = list.filter(r => r.department === userDept || r.authorId === user?.id);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [revenueReports, search, canViewAll, userDept, user?.id]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-600', 'Pending Manager': 'bg-amber-100 text-amber-700',
      'Pending Director': 'bg-blue-100 text-blue-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-600',
    };
    const labels: Record<string, string> = {
      Draft: 'Nháp', 'Pending Manager': 'Chờ TP duyệt', 'Pending Director': 'Chờ GĐ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối',
    };
    return <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${map[s] || 'bg-gray-100 text-gray-500'}`}>{labels[s] || s}</span>;
  };

  const addContractRow = (c: Contract) => {
    if (rows.find(r => r.contractId === c.id)) return;
    setRows(prev => [...prev, {
      contractId: c.id, contractNumber: c.contractNumber, clientName: c.clientName,
      contractName: c.contractName, preTaxValue: c.preTaxValue, deliveredMonth: 0,
      deliveredCumulative: 0, invoiceDate: c.invoiceDate || '', invoiceNumber: c.invoiceNumber || '',
    }]);
  };

  const updateRow = (idx: number, field: keyof RevenueRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const totalPreTax = rows.reduce((s, r) => s + r.preTaxValue, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.deliveredMonth, 0);
  const totalCumulative = rows.reduce((s, r) => s + r.deliveredCumulative, 0);

  const handleSave = async (status: string) => {
    const now = new Date().toISOString();
    const monthLabel = periodStart ? new Date(periodStart).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : '';
    const report: RevenueReport = {
      id: editingReport?.id || Math.random().toString(36).slice(2, 9),
      title: editingReport?.title || `Báo cáo doanh thu ${monthLabel}`,
      reportType, periodStart, periodEnd,
      content: JSON.stringify(rows),
      totalPreTax, totalDelivered, totalCumulative,
      authorId: editingReport?.authorId || user?.id || '',
      department: editingReport?.department || userDept,
      status,
      approvedBy: editingReport?.approvedBy,
      approvedAt: editingReport?.approvedAt,
      managerFeedback: managerFeedback || editingReport?.managerFeedback,
      directorFeedback: directorFeedback || editingReport?.directorFeedback,
      createdAt: editingReport?.createdAt || now,
      submittedAt: status.startsWith('Pending') ? now : editingReport?.submittedAt,
    };
    if (status === 'Approved' || status === 'Rejected') {
      report.approvedBy = user?.id;
      report.approvedAt = now;
    }
    await saveRevenueReport(report);
    setActiveTab('list');
    setEditingReport(null);
  };

  const openEdit = (r: RevenueReport) => {
    setEditingReport(r);
    setReportType(r.reportType);
    setPeriodStart(r.periodStart);
    setPeriodEnd(r.periodEnd);
    setManagerFeedback(r.managerFeedback || '');
    setDirectorFeedback(r.directorFeedback || '');
    try { setRows(JSON.parse(r.content || '[]')); } catch { setRows([]); }
    setActiveTab('create');
  };

  const openCreate = () => {
    setEditingReport(null);
    setRows([]); setPeriodStart(''); setPeriodEnd('');
    setManagerFeedback(''); setDirectorFeedback('');
    setActiveTab('create');
  };

  const isAuthor = editingReport?.authorId === user?.id;
  const isManagerReview = canApprove && editingReport?.status === 'Pending Manager' && editingReport?.authorId !== user?.id;
  const isDirectorReview = isDirector && editingReport?.status === 'Pending Director';
  const isReadOnly = editingReport && !isAuthor && !isManagerReview && !isDirectorReview;

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-200">
              <DollarSign size={20} className="text-white"/>
            </div>
            Báo cáo Doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi doanh thu theo tuần và tháng</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'list' ? 'primary' : 'secondary'} onClick={() => setActiveTab('list')} size="sm">Danh sách</Button>
          {canCreate && <Button variant={activeTab === 'create' ? 'primary' : 'secondary'} onClick={openCreate} size="sm" className="gap-1"><PlusCircle size={14}/> Tạo mới</Button>}
        </div>
      </div>

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Tìm kiếm báo cáo..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"/>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {visibleReports.map(r => (
                <div key={r.id} onClick={() => openEdit(r)} className="px-5 py-4 flex items-center gap-4 hover:bg-orange-50/30 cursor-pointer transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.status === 'Approved' ? 'bg-green-100 text-green-600' : r.status === 'Rejected' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-600'}`}>
                    <DollarSign size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-sm group-hover:text-orange-600 transition-colors">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{getUserName(r.authorId)} · {r.reportType === 'monthly' ? 'Tháng' : 'Tuần'} · {new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{fmtMoney(r.totalDelivered)}</p>
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
              {visibleReports.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  <DollarSign size={44} className="mx-auto mb-3 opacity-20"/>
                  <p className="font-medium">Chưa có báo cáo doanh thu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT TAB */}
      {activeTab === 'create' && (
        <div className="space-y-5">
          {/* Period */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Loại báo cáo</label>
                <select value={reportType} onChange={e => setReportType(e.target.value as any)} disabled={!!isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500">
                  <option value="monthly">Theo tháng</option>
                  <option value="weekly">Theo tuần</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Từ ngày</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} disabled={!!isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Đến ngày</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} disabled={!!isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"/>
              </div>
            </div>
          </div>

          {/* Add contracts */}
          {!isReadOnly && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Thêm hợp đồng từ danh sách</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {contracts.filter(c => !rows.find(r => r.contractId === c.id)).map(c => (
                  <button key={c.id} onClick={() => addContractRow(c)}
                    className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors truncate max-w-[250px]">
                    + {c.contractNumber} — {c.clientName}
                  </button>
                ))}
                {contracts.length === 0 && <p className="text-xs text-gray-400">Chưa có hợp đồng. Vui lòng thêm hợp đồng trước.</p>}
              </div>
            </div>
          )}

          {/* Revenue table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">BÁO CÁO DOANH THU</h3>
              <span className="text-xs opacity-80">{rows.length} hợp đồng</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center w-10">STT</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Số HĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Chủ đầu tư</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Tên HĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right">Giá trị trước thuế</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right">Tháng báo cáo</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right">Lũy kế</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center">Ngày XHĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center">Số HĐ</th>
                    {!isReadOnly && <th className="px-3 py-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/20">
                      <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 text-xs">{r.contractNumber}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{r.clientName}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs max-w-[180px] truncate">{r.contractName}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtMoney(r.preTaxValue)}</td>
                      <td className="px-3 py-2 text-right">
                        {isReadOnly ? <span className="font-medium">{fmtMoney(r.deliveredMonth)}</span> :
                          <input type="number" value={r.deliveredMonth} onChange={e => updateRow(idx, 'deliveredMonth', Number(e.target.value))}
                            className="w-28 text-right text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-400"/>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isReadOnly ? <span className="font-medium">{fmtMoney(r.deliveredCumulative)}</span> :
                          <input type="number" value={r.deliveredCumulative} onChange={e => updateRow(idx, 'deliveredCumulative', Number(e.target.value))}
                            className="w-28 text-right text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-400"/>}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{r.invoiceNumber || '—'}</td>
                      {!isReadOnly && <td className="px-3 py-2"><button onClick={() => removeRow(idx)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13}/></button></td>}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm">Thêm hợp đồng vào báo cáo</td></tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-orange-50 border-t-2 border-orange-200 font-bold">
                      <td colSpan={4} className="px-3 py-2 text-right text-orange-800">Tổng:</td>
                      <td className="px-3 py-2 text-right text-orange-800">{fmtMoney(totalPreTax)}</td>
                      <td className="px-3 py-2 text-right text-orange-800">{fmtMoney(totalDelivered)}</td>
                      <td className="px-3 py-2 text-right text-orange-800">{fmtMoney(totalCumulative)}</td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr className="bg-orange-100/50">
                      <td colSpan={4} className="px-3 py-2 text-right text-orange-900 font-bold text-xs">Tổng giá trị trước thuế VAT 10%:</td>
                      <td className="px-3 py-2 text-right font-extrabold text-orange-900">{fmtMoney(Math.round(totalPreTax * 1.1))}</td>
                      <td colSpan={5}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Feedback sections */}
          {(isManagerReview || editingReport?.managerFeedback) && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-orange-800 mb-2">Ý kiến Trưởng phòng</h3>
              <textarea value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)} disabled={!isManagerReview} rows={2} placeholder="Nhập ý kiến..."
                className="w-full text-sm bg-white border border-orange-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-orange-400 disabled:opacity-60"/>
            </div>
          )}
          {(isDirectorReview || editingReport?.directorFeedback) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-indigo-800 mb-2">Ý kiến Giám đốc</h3>
              <textarea value={directorFeedback} onChange={e => setDirectorFeedback(e.target.value)} disabled={!isDirectorReview} rows={2} placeholder="Nhập ý kiến..."
                className="w-full text-sm bg-white border border-indigo-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"/>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <button onClick={() => { setActiveTab('list'); setEditingReport(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">← Quay lại</button>
            <div className="flex gap-2">
              {(isAuthor || !editingReport) && !isReadOnly && (
                <>
                  <button onClick={() => handleSave('Draft')} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5"><Save size={14}/> Lưu nháp</button>
                  <button onClick={() => handleSave('Pending Manager')} disabled={rows.length === 0} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5"><Send size={14}/> Gửi duyệt</button>
                </>
              )}
              {isManagerReview && (
                <>
                  <button onClick={() => handleSave('Rejected')} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 flex items-center gap-1.5"><XCircle size={14}/> Từ chối</button>
                  <button onClick={() => handleSave('Pending Director')} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl hover:shadow-lg flex items-center gap-1.5"><CheckCircle size={14}/> Duyệt & gửi GĐ</button>
                </>
              )}
              {isDirectorReview && (
                <>
                  <button onClick={() => handleSave('Rejected')} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 flex items-center gap-1.5"><XCircle size={14}/> Từ chối</button>
                  <button onClick={() => handleSave('Approved')} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl hover:shadow-lg flex items-center gap-1.5"><CheckCircle size={14}/> Phê duyệt</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Xóa báo cáo" message="Bạn có chắc muốn xóa báo cáo này?" onConfirm={async () => { if (deleteId) { await deleteRevenueReport(deleteId); setDeleteId(null); }}} onCancel={() => setDeleteId(null)} type="danger" confirmText="Xóa" cancelText="Hủy"/>
    </div>
  );
};

export default RevenuePage;
