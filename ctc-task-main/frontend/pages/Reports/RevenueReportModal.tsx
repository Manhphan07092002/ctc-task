import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { X, Save, Send, Trash2, DollarSign } from 'lucide-react';
import { RevenueReport } from '../../services/revenueService';

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
  assignee?: string;
}

interface RevenueReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: RevenueReport | null;
  onSave?: (report: RevenueReport) => void;
}

export const RevenueReportModal: React.FC<RevenueReportModalProps> = ({ isOpen, onClose, report, onSave }) => {
  const { user } = useAuth();
  const { contracts, saveRevenueReport, users } = useData();

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [managerFeedback, setManagerFeedback] = useState('');
  const [directorFeedback, setDirectorFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (report) {
        setReportType(report.reportType);
        setPeriodStart(report.periodStart);
        setPeriodEnd(report.periodEnd);
        setManagerFeedback(report.managerFeedback || '');
        setDirectorFeedback(report.directorFeedback || '');
        try {
          const parsed = JSON.parse(report.content || '[]');
          setRows(Array.isArray(parsed) ? parsed : []);
        } catch { setRows([]); }
      } else {
        setReportType('monthly');
        setPeriodStart('');
        setPeriodEnd('');
        setManagerFeedback('');
        setDirectorFeedback('');
        setRows([]);
      }
    }
  }, [isOpen, report]);

  const addContractRow = (c: any) => {
    if (rows.find(r => r.contractId === c.id)) return;
    setRows(prev => [...prev, {
      contractId: c.id, contractNumber: c.contractNumber, clientName: c.clientName,
      contractName: c.contractName, preTaxValue: c.preTaxValue, deliveredMonth: 0,
      deliveredCumulative: 0, invoiceDate: c.invoiceDate || '', invoiceNumber: c.invoiceNumber || '',
      assignee: getUserName(c.createdBy || '') || undefined,
    }]);
  };

  const updateRow = (idx: number, field: keyof RevenueRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const totalPreTax = rows.reduce((s, r) => s + r.preTaxValue, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.deliveredMonth, 0);
  const totalCumulative = rows.reduce((s, r) => s + r.deliveredCumulative, 0);

  const isReadOnly = !!(report && (report.status === 'Approved' || (report.authorId !== user?.id && user?.role !== 'Admin')));

  // ── Permissions ──
  const perms = user?.permissions || [];
  const canApprove = perms.includes('approve_dept_reports') || perms.includes('approve_revenue_reports');
  const canViewAll = perms.includes('view_all_reports') || user?.role === 'Admin';

  const isPendingMgrReview = !!(
    report &&
    report.status === 'Pending' &&
    canApprove &&
    user?.department === report.department &&
    report.authorId !== user?.id
  );

  const isPendingDirReview = !!(
    report &&
    report.status === 'Pending' &&
    canViewAll &&
    report.authorId !== user?.id &&
    !isPendingMgrReview
  );

  const isManagerReview = isPendingMgrReview;
  const isDirectorPendingReview = isPendingDirReview;

  const handleSave = async (status: string) => {
    if (!user) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const monthLabel = periodStart ? new Date(periodStart).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : '';

    const finalStatus = status;

    const r: RevenueReport = {
      id: report ? report.id : Math.random().toString(36).slice(2, 9),
      title: report ? report.title : `Báo cáo doanh thu ${monthLabel}`,
      reportType, periodStart, periodEnd,
      content: JSON.stringify(rows),
      totalPreTax, totalDelivered, totalCumulative,
      authorId: report ? report.authorId : user.id,
      department: report ? report.department : (user.department || ''),
      status: finalStatus,
      createdAt: report ? report.createdAt : now,
      submittedAt: finalStatus === 'Pending' && !report?.submittedAt ? now : report?.submittedAt,
      approvedAt: finalStatus === 'Approved' ? now : report?.approvedAt,
      approvedBy: finalStatus === 'Approved' ? user.id : report?.approvedBy,
      managerFeedback: isManagerReview ? managerFeedback : report?.managerFeedback,
      directorFeedback: isDirectorPendingReview ? directorFeedback : report?.directorFeedback,
    };

    try {
      await saveRevenueReport({ ...r, _isNew: !report });
      if (onSave) onSave(r);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Không thể lưu báo cáo doanh thu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-200">
              <DollarSign size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-900">Tạo Báo cáo Doanh thu</h2>
              <p className="text-sm text-orange-700/80">Khai báo doanh thu theo hợp đồng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-orange-100 rounded-full transition-colors text-orange-800">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 custom-scrollbar">

          {/* Period */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Loại báo cáo</label>
                <select value={reportType} onChange={e => setReportType(e.target.value as any)} disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-shadow disabled:bg-gray-50">
                  <option value="monthly">Theo tháng</option>
                  <option value="weekly">Theo tuần</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Từ ngày</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-shadow disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Đến ngày</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} disabled={isReadOnly}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-shadow disabled:bg-gray-50" />
              </div>
            </div>
          </div>

          {/* Add contracts */}
          {!isReadOnly && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Thêm hợp đồng từ danh sách</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {contracts.filter(c => !rows.find(r => r.contractId === c.id)).map(c => (
                  <button key={c.id} onClick={() => addContractRow(c)}
                    className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors truncate max-w-[250px] text-left">
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
              <h3 className="font-bold text-sm">CHI TIẾT BÁO CÁO</h3>
              <span className="text-xs opacity-80">{rows.length} hợp đồng</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center w-10">STT</th>
                    {rows.some(r => r.assignee) && <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Người TH</th>}
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Số HĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Chủ đầu tư</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-left">Tên HĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right">Giá trị trước thuế</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right w-32">Doanh thu tháng</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right w-32">Lũy kế</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center">Ngày XHĐ</th>
                    <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center">Số HĐ</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/20">
                      <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                      {rows.some(ro => ro.assignee) && <td className="px-3 py-2 font-medium text-blue-600 text-xs">{r.assignee || '—'}</td>}
                      <td className="px-3 py-2 font-semibold text-gray-800 text-xs">{r.contractNumber}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs">{r.clientName}</td>
                      <td className="px-3 py-2 text-gray-700 text-xs max-w-[180px] truncate" title={r.contractName}>{r.contractName}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtMoney(r.preTaxValue)}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={r.deliveredMonth} onChange={e => updateRow(idx, 'deliveredMonth', Number(e.target.value))} disabled={isReadOnly}
                          className="w-full text-right text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none transition-shadow disabled:bg-gray-50 disabled:text-gray-600" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={r.deliveredCumulative} onChange={e => updateRow(idx, 'deliveredCumulative', Number(e.target.value))} disabled={isReadOnly}
                          className="w-full text-right text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none transition-shadow disabled:bg-gray-50 disabled:text-gray-600" />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{r.invoiceNumber || '—'}</td>
                      <td className="px-3 py-2">
                        {!isReadOnly && <button onClick={() => removeRow(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm">Chưa có hợp đồng nào được thêm.</td></tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-orange-50 border-t-2 border-orange-200 font-bold">
                      <td colSpan={4} className="px-3 py-2 text-right text-orange-800">Tổng cộng:</td>
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
        </div>

        {/* Feedbacks */}
        <div className="px-6 py-2 pb-6 bg-gray-50/50 space-y-4">
          {(report?.managerFeedback || isManagerReview || (canApprove && report && report.authorId !== user?.id)) && (
            <div className="bg-gradient-to-br from-orange-50/80 to-orange-100/30 border border-orange-200/60 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-orange-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                Ý kiến Trưởng phòng
              </h3>
              <textarea value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)} disabled={!isManagerReview} rows={2} placeholder="Nhập ý kiến..." className="w-full resize-none text-sm text-gray-800 bg-white/60 border border-orange-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-default" />
            </div>
          )}

          {(report?.directorFeedback || isDirectorPendingReview || (report?.status === 'Approved' && report?.authorId !== user?.id && canViewAll && !isManagerReview)) && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/30 border border-indigo-200/60 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                Ý kiến Giám đốc
              </h3>
              <textarea value={directorFeedback} onChange={e => setDirectorFeedback(e.target.value)} disabled={!isDirectorPendingReview && !(report?.status === 'Approved' && report?.authorId !== user?.id && canViewAll && !isManagerReview)} rows={2} placeholder="Nhập ý kiến..." className="w-full resize-none text-sm text-gray-800 bg-white/60 border border-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-default" />
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button>

          <div className="flex gap-2">
            {/* Author Actions */}
            {!isReadOnly && (!report || report.authorId === user?.id) && (
              <>
                <button onClick={() => handleSave('Draft')} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Save size={16} /> Lưu nháp
                </button>
                <button onClick={() => handleSave('Pending')} disabled={isSubmitting || rows.length === 0} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                  <Send size={16} /> {report?.status?.startsWith('Pending') ? 'Cập nhật' : 'Gửi duyệt'}
                </button>
              </>
            )}

            {/* Manager Actions */}
            {isManagerReview && report?.status === 'Pending' && (
              <>
                <button onClick={() => handleSave('Rejected')} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                  Từ chối
                </button>
                <button onClick={() => handleSave('Approved')} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                  Duyệt (Gửi GĐ)
                </button>
              </>
            )}

            {/* Director Actions */}
            {isDirectorPendingReview && report?.status === 'Pending' && (
              <>
                <button onClick={() => handleSave('Rejected')} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                  Từ chối
                </button>
                <button onClick={() => handleSave('Approved')} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                  Duyệt Báo cáo
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
