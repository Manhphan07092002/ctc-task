import React, { useState, useEffect } from 'react';
import {
  X, Send, Save, CheckCircle, XCircle, Plus, Trash2,
  CalendarDays, Building2, User, FileText, ChevronDown
} from 'lucide-react';
import { Button } from '../../components/UI';
import { Report, ReportStatus, Task, User as UserType, Department } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TaskRow {
  id: string;
  content: string;
  result: 'done' | 'in_progress' | 'pending' | '';
  nextAction: string;
  note: string;
}

interface StructuredContent {
  tasks: TaskRow[];
  nextWeekPlan: string;
  weekStart: string;
  weekEnd: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (r: Report) => void;
  initialReport: Report | null;
  currentUser: UserType;
  tasks: Task[];
  departments: Department[];
  users: UserType[];
  allReports: Report[];
  t: (key: string) => string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return {
    start: mon.toISOString().split('T')[0],
    end:   fri.toISOString().split('T')[0],
  };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseContent(raw: string): StructuredContent | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.tasks)) return obj as StructuredContent;
  } catch {}
  return null;
}

function newRow(): TaskRow {
  return { id: Math.random().toString(36).slice(2), content: '', result: '', nextAction: '', note: '' };
}

const RESULT_OPTIONS: { value: TaskRow['result']; label: string; color: string }[] = [
  { value: 'done',        label: 'Đã hoàn thành',   color: 'text-green-600'  },
  { value: 'in_progress', label: 'Đang thực hiện',  color: 'text-blue-600'   },
  { value: 'pending',     label: 'Chưa thực hiện',  color: 'text-gray-500'   },
  { value: '',            label: '—',                color: 'text-gray-300'   },
];

// ─── Component ───────────────────────────────────────────────────────────────
export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen, onClose, onSave, initialReport, currentUser, tasks, departments, users, allReports,
}) => {
  const week = getWeekRange();

  const [title, setTitle]         = useState('');
  const [weekStart, setWeekStart] = useState(week.start);
  const [weekEnd,   setWeekEnd]   = useState(week.end);
  const [rows, setRows]           = useState<TaskRow[]>([newRow()]);
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [directorFeedback, setDirectorFeedback] = useState('');

  // ── Permissions ──
  const perms = currentUser.permissions || [];
  const canApprove   = perms.includes('approve_dept_reports');
  const canViewAll   = perms.includes('view_all_reports');
  const canDirectorF = perms.includes('director_feedback');

  const isReadOnly = !!(
    initialReport &&
    initialReport.status !== 'Draft' &&
    initialReport.authorId !== currentUser.id
  );

  const isPendingDirReview = !!(
    initialReport &&
    initialReport.status === 'Pending' &&
    canViewAll &&
    initialReport.authorId !== currentUser.id
  );
  const isPendingMgrReview = !!(
    initialReport &&
    initialReport.status === 'Pending' &&
    canApprove &&
    currentUser.department === initialReport.department &&
    initialReport.authorId !== currentUser.id
  );

  // Director viewing someone else's pending = read-only form + director approve button
  const isFormReadOnly = isReadOnly || isPendingDirReview;
  // Manager review: only manager approving EMPLOYEE reports (same dept, not own)
  const isManagerReview = isPendingMgrReview;
  // Director review modes
  const isDirectorPendingReview = isPendingDirReview;
  const isDirectorFeedbackReview = !!(
    initialReport &&
    initialReport.status === 'Approved' &&
    initialReport.authorId !== currentUser.id &&
    canDirectorF
  );
  const isDirectorReview = isDirectorFeedbackReview;

  // ── Load initial data ──
  useEffect(() => {
    if (!isOpen) return;
    if (initialReport) {
      setTitle(initialReport.title);
      setDirectorFeedback(initialReport.directorFeedback || '');
      const parsed = parseContent(initialReport.content);
      if (parsed) {
        setRows(parsed.tasks.length ? parsed.tasks : [newRow()]);
        setNextWeekPlan(parsed.nextWeekPlan || '');
        setWeekStart(parsed.weekStart || week.start);
        setWeekEnd(parsed.weekEnd   || week.end);
      } else {
        setRows([{ id: '1', content: initialReport.content || '', result: '', nextAction: '', note: '' }]);
        setNextWeekPlan('');
      }
    } else {
      const w = getWeekRange();
      setWeekStart(w.start); setWeekEnd(w.end);
      setTitle(`Báo cáo tuần ${fmtDate(w.start)} – ${fmtDate(w.end)} · ${currentUser.name}`);
      setRows([newRow()]);
      setNextWeekPlan('');
      setDirectorFeedback('');
    }
  }, [isOpen, initialReport]);

  if (!isOpen) return null;

  // ── Row helpers ──
  const updateRow = (id: string, field: keyof TaskRow, val: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow    = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  // ── Import from task list ──
  const importDoneTasks = () => {
    const myTasks = tasks.filter(t => t.assignees.includes(currentUser.id));
    const newRows: TaskRow[] = myTasks.map(t => ({
      id: t.id,
      content: t.title,
      result: t.status === 'Done' ? 'done' : t.status === 'In Progress' ? 'in_progress' : 'pending',
      nextAction: '',
      note: '',
    }));
    if (newRows.length) setRows(newRows);
  };

  // ── Aggregate Department Reports ──
  const importDepartmentReports = () => {
    if (!allReports) return;
    
    // Find Approved reports in current department authored by others (employees)
    const deptReports = allReports.filter(r => 
      r.department === currentUser.department && 
      r.authorId !== currentUser.id && 
      r.status === 'Approved'
    );

    let newRows: TaskRow[] = [];
    deptReports.forEach(r => {
      const authorName = users.find(u => u.id === r.authorId)?.name || 'Nhân viên';
      const parsed = parseContent(r.content);
      if (parsed && parsed.tasks) {
        // filter out empty rows
        const validTasks = parsed.tasks.filter(t => t.content.trim() !== '');
        validTasks.forEach(t => {
          newRows.push({
            id: Math.random().toString(36).slice(2),
            content: `[${authorName}] ${t.content}`,
            result: t.result,
            nextAction: t.nextAction,
            note: t.note,
          });
        });
      }
    });

    if (newRows.length > 0) {
      if (rows.length === 1 && rows[0].content.trim() === '') {
        setRows(newRows);
      } else {
        setRows(prev => [...prev, ...newRows]);
      }
    } else {
      alert("Không có báo cáo nào đã được duyệt trong tuần này của phòng để tổng hợp.");
    }
  };

  // ── Save ──
  const buildContent = (): string => {
    const data: StructuredContent = { tasks: rows, nextWeekPlan, weekStart, weekEnd };
    return JSON.stringify(data);
  };

  const handleSave = (status: ReportStatus) => {
    // If a manager (canApprove) is sending their own report globally, it should become Approved so it shows in Toàn Cục directly.
    const finalStatus = (status === 'Pending' && canApprove) ? 'Approved' : status;

    const report: Report = {
      id: initialReport?.id || Math.random().toString(36).slice(2, 9),
      title,
      content: buildContent(),
      authorId: currentUser.id,
      department: currentUser.department,
      status,
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      submittedAt: status === 'Pending' ? new Date().toISOString() : initialReport?.submittedAt,
      approvedAt: finalStatus === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: finalStatus === 'Approved' ? currentUser.id : undefined,
      directorFeedback,
    };
    onSave({ ...report, status: finalStatus });
    onClose();
  };

  const handleAction = (status: ReportStatus) => {
    if (!initialReport) return;
    onSave({
      ...initialReport,
      status,
      approvedAt: status === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: status === 'Approved' ? currentUser.id : undefined,
      directorFeedback,
    });
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6 flex flex-col overflow-hidden">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white">
          <div className="flex items-center gap-3">
            {/* Logo placeholder */}
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-lg">
              IC
            </div>
            <div>
              <p className="text-xs text-blue-100 leading-tight">CÔNG TY CỔ PHẦN XÂY LẮP BƯU ĐIỆN MIỀN TRUNG</p>
              <p className="text-sm font-semibold leading-tight">{currentUser.department || 'Phòng ban'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── FORM BODY ── */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">

          {/* Title & Reporter Info */}
          <div className="text-center space-y-2">
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">
              Báo cáo nội dung công việc đã và đang thực hiện
            </h2>

            {/* Date Range */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <CalendarDays size={14} className="text-blue-500" />
                <span>Tuần từ</span>
              </div>
              <input
                type="date"
                value={weekStart}
                onChange={e => setWeekStart(e.target.value)}
                disabled={isFormReadOnly}
                className="border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
              />
              <span className="text-gray-400 text-sm">đến</span>
              <input
                type="date"
                value={weekEnd}
                onChange={e => setWeekEnd(e.target.value)}
                disabled={isFormReadOnly}
                className="border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
              />
            </div>

            {/* Reporter + Editable Title */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <User size={14} className="text-blue-500" />
              <span>Người báo cáo:</span>
              <span className="font-semibold text-gray-800">
                {initialReport
                  ? (users?.find(u => u.id === initialReport.authorId)?.name || initialReport.title.split('·')[1]?.trim() || currentUser.name)
                  : currentUser.name}
              </span>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isFormReadOnly}
              placeholder="Tiêu đề báo cáo..."
              className="w-full text-center text-sm border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400 text-gray-700 bg-transparent py-1 disabled:text-gray-500"
            />
          </div>

          {/* ── TASK TABLE ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                Nội dung công việc tuần này
              </h3>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  {canApprove && (
                    <button
                      onClick={importDepartmentReports}
                      className="text-xs text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors border border-brand-100 font-medium"
                    >
                      Tổng hợp báo cáo phòng
                    </button>
                  )}
                  <button
                    onClick={importDoneTasks}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 font-medium"
                  >
                    ↓ Import từ danh sách công việc
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid bg-blue-50 border-b border-gray-200 text-xs font-bold text-blue-800 uppercase tracking-wider"
                style={{ gridTemplateColumns: '40px 1fr 160px 1fr 120px 36px' }}>
                <div className="px-3 py-3 text-center">STT</div>
                <div className="px-3 py-3">Nội dung công việc</div>
                <div className="px-3 py-3 text-center">Kết quả</div>
                <div className="px-3 py-3">Công việc phải làm tiếp theo</div>
                <div className="px-3 py-3 text-center">Ghi chú</div>
                <div className="px-2 py-3" />
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid items-center hover:bg-gray-50/70 transition-colors group"
                    style={{ gridTemplateColumns: '40px 1fr 160px 1fr 120px 36px' }}
                  >
                    {/* STT */}
                    <div className="px-3 py-2 text-center text-sm text-gray-400 font-medium">{idx + 1}</div>

                    {/* Nội dung */}
                    <div className="px-2 py-2">
                      <textarea
                        value={row.content}
                        onChange={e => updateRow(row.id, 'content', e.target.value)}
                        disabled={isFormReadOnly}
                        rows={2}
                        placeholder="Mô tả công việc..."
                        className="w-full resize-none text-sm text-gray-800 bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded-lg p-1.5 transition-all disabled:cursor-default placeholder-gray-300"
                      />
                    </div>

                    {/* Kết quả */}
                    <div className="px-2 py-2 flex items-start justify-center">
                      {isReadOnly ? (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          row.result === 'done'        ? 'bg-green-100 text-green-700' :
                          row.result === 'in_progress' ? 'bg-blue-100 text-blue-700'  :
                          row.result === 'pending'     ? 'bg-gray-100 text-gray-600'  :
                          'text-gray-300'}`}>
                          {RESULT_OPTIONS.find(o => o.value === row.result)?.label || '—'}
                        </span>
                      ) : (
                        <div className="relative w-full">
                          <select
                            value={row.result}
                            onChange={e => updateRow(row.id, 'result', e.target.value as TaskRow['result'])}
                            className="w-full appearance-none text-xs border border-gray-200 rounded-lg px-2 py-1.5 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white cursor-pointer"
                          >
                            {RESULT_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-1.5 top-2 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                    </div>

                    {/* Công việc tiếp theo */}
                    <div className="px-2 py-2">
                      <textarea
                        value={row.nextAction}
                        onChange={e => updateRow(row.id, 'nextAction', e.target.value)}
                        disabled={isFormReadOnly}
                        rows={2}
                        placeholder="Bước tiếp theo..."
                        className="w-full resize-none text-sm text-gray-800 bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded-lg p-1.5 transition-all disabled:cursor-default placeholder-gray-300"
                      />
                    </div>

                    {/* Ghi chú */}
                    <div className="px-2 py-2">
                      <textarea
                        value={row.note}
                        onChange={e => updateRow(row.id, 'note', e.target.value)}
                        disabled={isFormReadOnly}
                        rows={2}
                        placeholder="Ghi chú..."
                        className="w-full resize-none text-xs text-gray-600 bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded-lg p-1.5 transition-all disabled:cursor-default placeholder-gray-300"
                      />
                    </div>

                    {/* Delete */}
                    <div className="px-1 py-2 flex items-center justify-center">
                      {!isReadOnly && rows.length > 1 && (
                        <button
                          onClick={() => removeRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row button */}
              {!isReadOnly && (
                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-500 hover:text-blue-700 hover:bg-blue-50/50 transition-colors border-t border-dashed border-gray-200"
                >
                  <Plus size={16} />
                  Thêm dòng công việc
                </button>
              )}
            </div>
          </div>

          {/* ── NEXT WEEK PLAN ── */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalendarDays size={14} />
              Kế hoạch tuần tới
            </h3>
            <textarea
              value={nextWeekPlan}
              onChange={e => setNextWeekPlan(e.target.value)}
              disabled={isFormReadOnly}
              rows={3}
              placeholder={`- Xử lý các công việc chưa thực hiện được ở tuần trước\n- Theo dõi các gói thầu ...\n- ...`}
              className="w-full resize-none text-sm text-gray-700 bg-white/80 border border-amber-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder-gray-400 disabled:bg-amber-50/30 disabled:cursor-default"
            />
          </div>

          {/* ── DIRECTOR FEEDBACK ── */}
          {(initialReport?.directorFeedback || isDirectorReview) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                <User size={14} />
                Ý kiến Giám đốc
              </h3>
              <textarea
                value={directorFeedback}
                onChange={e => setDirectorFeedback(e.target.value)}
                disabled={!isDirectorReview}
                rows={3}
                placeholder="Nhập nhận xét của Giám đốc..."
                className="w-full resize-none text-sm text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-300 disabled:bg-blue-50/30 disabled:cursor-default"
              />
            </div>
          )}

          {/* ── STATUS BADGE (view mode) ── */}
          {initialReport && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 size={14} />
              <span>Phòng {initialReport.department}</span>
              <span className="mx-1">·</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                initialReport.status === 'Approved' ? 'bg-green-100 text-green-700' :
                initialReport.status === 'Pending'  ? 'bg-yellow-100 text-yellow-700' :
                initialReport.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {initialReport.status === 'Approved' ? '✓ Đã duyệt' :
                 initialReport.status === 'Pending'  ? '⏳ Chờ duyệt' :
                 initialReport.status === 'Rejected' ? '✗ Từ chối' : 'Nháp'}
              </span>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Đóng
          </button>

          <div className="flex gap-2">
            {/* Employee / Manager sending their OWN report */}
            {!isFormReadOnly && !isManagerReview && !isDirectorPendingReview && (
              <>
                <button
                  onClick={() => handleSave('Draft')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Save size={15} /> Lưu nháp
                </button>
                <button
                  onClick={() => handleSave('Pending')}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  <Send size={15} /> Gửi báo cáo
                </button>
              </>
            )}

            {/* MANAGER approves employee report: Từ chối / Duyệt & Gửi GĐ */}
            {isManagerReview && (
              <>
                <button
                  onClick={() => handleAction('Rejected')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <XCircle size={15} /> Từ chối
                </button>
                <button
                  onClick={() => handleAction('Approved')}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
                >
                  <CheckCircle size={15} /> Duyệt &amp; Gửi Giám Đốc
                </button>
              </>
            )}

            {/* DIRECTOR approves manager's Pending report: Phê duyệt only */}
            {isDirectorPendingReview && (
              <>
                <button
                  onClick={() => handleAction('Approved')}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm"
                >
                  <CheckCircle size={15} /> Phê duyệt
                </button>
              </>
            )}

            {/* DIRECTOR feedback on Approved report */}
            {isDirectorReview && (
              <button
                onClick={() => handleAction(initialReport!.status)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-sm"
              >
                <Save size={15} /> Lưu nhận xét
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
