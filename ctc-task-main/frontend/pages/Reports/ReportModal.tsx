import React, { useState, useEffect } from 'react';
import {
  X, Send, Save, CheckCircle, XCircle, Plus, Trash2,
  CalendarDays, Building2, User, FileText, ChevronDown, GripVertical,
  Paperclip, Image, FileUp, Download as DownloadIcon
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Report, ReportStatus, Task, User as UserType, Department } from '../../types';
import { apiFetch } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TaskRow {
  id: string;
  assignee?: string;
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
  attachments?: Attachment[];
}

interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (r: Report) => void;
  onDelete?: (id: string) => void;
  onAdminHardDelete?: (id: string) => void;
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

const DateInput = ({ value, onChange, disabled, className }: { value: string, onChange: (v: string) => void, disabled?: boolean, className?: string }) => {
  const [type, setType] = useState<'text'|'date'>('text');
  return (
    <input
      type={type}
      value={type === 'text' ? fmtDate(value) : value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setType('date')}
      onBlur={() => setType('text')}
      disabled={disabled}
      className={className || "border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 text-center"}
      style={{ minWidth: '130px' }}
    />
  );
};

function parseContent(raw: string): StructuredContent | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.tasks)) return obj as StructuredContent;
  } catch {}
  return null;
}

const newRow = (): TaskRow => ({
  id: Math.random().toString(36).slice(2),
  assignee: '',
  content: '',
  result: '',
  nextAction: '',
  note: ''
});

const RESULT_OPTIONS: { value: TaskRow['result']; label: string; color: string }[] = [
  { value: 'done',        label: 'Đã hoàn thành',   color: 'text-green-600'  },
  { value: 'in_progress', label: 'Đang thực hiện',  color: 'text-blue-600'   },
  { value: 'pending',     label: 'Chưa thực hiện',  color: 'text-gray-500'   },
  { value: '',            label: '—',                color: 'text-gray-300'   },
];

// ─── Component ───────────────────────────────────────────────────────────────
export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen, onClose, onSave, onDelete, onAdminHardDelete, initialReport, currentUser, tasks, departments, users, allReports,
}) => {
  const week = getWeekRange();

  const [title, setTitle]         = useState('');
  const [weekStart, setWeekStart] = useState(week.start);
  const [weekEnd,   setWeekEnd]   = useState(week.end);
  const [rows, setRows]           = useState<TaskRow[]>([newRow()]);
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [directorFeedback, setDirectorFeedback] = useState('');
  const [managerFeedback, setManagerFeedback] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmHardDelete, setShowConfirmHardDelete] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(rows);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setRows(items);
  };

  const isAdmin = (currentUser.permissions || []).includes('admin_panel');

  // ── Permissions ──
  const perms = currentUser.permissions || [];
  const canApprove   = perms.includes('approve_dept_reports');
  const canViewAll   = perms.includes('view_all_reports');
  const canDirectorF = perms.includes('director_feedback');

  const isAuthor = initialReport?.authorId === currentUser.id;
  const isReadOnly = !!(
    initialReport &&
    (isAuthor ? !['Draft', 'Rejected'].includes(initialReport.status) : initialReport.status !== 'Draft')
  );

  // Manager reviewing a PENDING report from same dept (not own) — checked FIRST
  const isPendingMgrReview = !!(
    initialReport &&
    initialReport.status === 'Pending' &&
    canApprove &&
    currentUser.department === initialReport.department &&
    initialReport.authorId !== currentUser.id
  );

  // Director reviewing a PENDING — only if NOT also the dept manager for same report
  const isPendingDirReview = !!(
    initialReport &&
    initialReport.status === 'Pending' &&
    canViewAll &&
    initialReport.authorId !== currentUser.id &&
    !isPendingMgrReview
  );

  // Director viewing someone else's pending = read-only form + director approve button
  const isFormReadOnly = isReadOnly || isPendingDirReview;
  // Manager review: only manager approving EMPLOYEE/dept reports (same dept, not own)
  const isManagerReview = isPendingMgrReview;
  // Director review modes
  const isDirectorPendingReview = isPendingDirReview;
  const isDirectorFeedbackReview = !!(
    initialReport &&
    initialReport.status === 'Approved' &&
    initialReport.authorId !== currentUser.id &&
    canDirectorF &&
    !canApprove
  );
  const isDirectorReview = isDirectorFeedbackReview || isDirectorPendingReview;

  // ── Load initial data & Autosave ──
  useEffect(() => {
    if (!isOpen) return;
    if (initialReport) {
      setTitle(initialReport.title);
      setDirectorFeedback(initialReport.directorFeedback || '');
      setManagerFeedback(initialReport.managerFeedback || '');
      const parsed = parseContent(initialReport.content);
      if (parsed) {
        setRows(parsed.tasks.length ? parsed.tasks : [newRow()]);
        setNextWeekPlan(parsed.nextWeekPlan || '');
        setWeekStart(parsed.weekStart || week.start);
        setWeekEnd(parsed.weekEnd   || week.end);
        setAttachments(parsed.attachments || []);
      } else {
        setRows([{ id: '1', content: initialReport.content || '', result: '', nextAction: '', note: '' }]);
        setNextWeekPlan('');
        setAttachments([]);
      }
    } else {
      const w = getWeekRange();
      const draftKey = `draft_report_${currentUser.id}_new`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.rows && parsed.rows.length) {
            setTitle(parsed.title || '');
            setNextWeekPlan(parsed.nextWeekPlan || '');
            setWeekStart(parsed.weekStart || w.start);
            setWeekEnd(parsed.weekEnd || w.end);
            setRows(parsed.rows);
            return;
          }
        } catch {}
      }
      setWeekStart(w.start); setWeekEnd(w.end);
      setTitle(`Báo cáo tuần ${fmtDate(w.start)} – ${fmtDate(w.end)} · ${currentUser.name}`);
      setRows([newRow()]);
      setNextWeekPlan('');
      setDirectorFeedback('');
      setAttachments([]);
    }
  }, [isOpen, initialReport]);

  useEffect(() => {
    if (isFormReadOnly || !isOpen) return;
    const data = { title, nextWeekPlan, weekStart, weekEnd, rows };
    const key = `draft_report_${currentUser.id}_${initialReport?.id || 'new'}`;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(data));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, nextWeekPlan, weekStart, weekEnd, rows, isFormReadOnly, isOpen, currentUser.id, initialReport?.id]);

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
      assignee: currentUser.name,
      content: t.title,
      result: (t.status === 'Done' ? 'done' : t.status === 'In Progress' ? 'in_progress' : 'pending') as TaskRow['result'],
      nextAction: '',
      note: '',
    }));
    if (newRows.length) setRows(newRows);
  };

  // ── Aggregate Department Reports ──
  const importDepartmentReports = () => {
    if (!allReports) return;
    const deptReports = allReports.filter(r =>
      r.department === currentUser.department &&
      r.authorId !== currentUser.id &&
      r.status === 'Approved'
    );
    let newRows: TaskRow[] = [];
    deptReports.forEach(r => {
      const authorName = users.find(u => u.id === r.authorId)?.name || 'Nhân viên';
      const parsed = parseContent(r.content);
      if (parsed && parsed.weekStart === weekStart && parsed.weekEnd === weekEnd && parsed.tasks) {
        parsed.tasks.filter(t => t.content.trim() !== '').forEach(t => {
          newRows.push({
            id: Math.random().toString(36).slice(2),
            assignee: authorName,
            content: t.content,
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
      alert('Không có báo cáo nào đã được duyệt trong tuần này của phòng để tổng hợp.');
    }
  };

  // ── Save ──
  const buildContent = () => {
    const data: StructuredContent = { tasks: rows, nextWeekPlan, weekStart, weekEnd, attachments: attachments.length > 0 ? attachments : undefined };
    return JSON.stringify(data);
  };

  // ── File upload ──
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setAttachments(prev => [...prev, ...data.files]);
      }
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSave = (status: ReportStatus) => {
    const report = {
      id: initialReport?.id || Math.random().toString(36).slice(2, 9),
      title,
      content: buildContent(),
      authorId: currentUser.id,
      department: currentUser.department,
      status,
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      submittedAt: status === 'Pending' ? new Date().toISOString() : initialReport?.submittedAt,
      approvedAt: status === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: status === 'Approved' ? currentUser.id : undefined,
      directorFeedback,
      managerFeedback,
    };
    onSave({ ...report });
    localStorage.removeItem(`draft_report_${currentUser.id}_${initialReport?.id || 'new'}`);
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoUrl = `${window.location.origin}/logo.png`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In Báo Cáo - ${title || 'Báo cáo công việc'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 30px; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .header-logo { width: 70px; height: 70px; object-fit: contain; flex-shrink: 0; }
          .header-text { flex: 1; }
          .company { font-weight: bold; text-transform: uppercase; color: #1e40af; font-size: 13px; margin-bottom: 3px; }
          .dept { font-size: 15px; font-weight: bold; margin-bottom: 3px; color: #374151; }
          .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #1e3a8a; }
          .meta { display: flex; gap: 30px; font-size: 13px; color: #555; margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; color: #1e40af; text-transform: uppercase; }
          .section-title { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .plan-box, .feedback-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; white-space: pre-wrap; min-height: 50px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
          .sig-box { width: 200px; }
          .sig-title { font-weight: bold; margin-bottom: 80px; }
          @media print {
            body { padding: 0; margin: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="Logo" class="header-logo" />
          <div class="header-text">
            <div class="company">CÔNG TY CỔ PHẦN XÂY LẮP BƯU ĐIỆN MIỀN TRUNG</div>
            <div class="dept">${currentUser.department || 'Phòng ban'}</div>
            <div class="title">BÁO CÁO CÔNG VIỆC THỰC HIỆN</div>
            <div class="meta">
              <span><strong>Tuần:</strong> ${fmtDate(weekStart)} - ${fmtDate(weekEnd)}</span>
              <span><strong>Người báo cáo:</strong> ${initialReport ? (users.find(u => u.id === initialReport.authorId)?.name || currentUser.name) : currentUser.name}</span>
            </div>
          </div>
        </div>

        <div class="section-title">1. Nội dung công việc thực hiện</div>
        <table>
          <thead>
            <tr>
              <th width="5%" style="text-align: center">STT</th>
              <th width="30%">Nội dung công việc</th>
              <th width="15%">Kết quả</th>
              <th width="20%">Công việc tiếp theo</th>
              <th width="15%">Nhân viên</th>
              <th width="15%">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td align="center">${i + 1}</td>
                <td>${r.content || ''}</td>
                <td>${RESULT_OPTIONS.find(o => o.value === r.result)?.label || ''}</td>
                <td>${r.nextAction || ''}</td>
                <td>${r.assignee || ''}</td>
                <td>${r.note || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">2. Kế hoạch tuần tới</div>
        <div class="plan-box">${nextWeekPlan || 'Không có'}</div>

        ${managerFeedback || directorFeedback ? `
          <div class="section-title">3. Ý kiến chỉ đạo / Nhận xét</div>
          ${managerFeedback ? `<div class="feedback-box"><strong>Trưởng phòng:</strong><br/>${managerFeedback}</div>` : ''}
          ${directorFeedback ? `<div class="feedback-box"><strong>Giám đốc:</strong><br/>${directorFeedback}</div>` : ''}
        ` : ''}

        <div class="footer">
          <div class="sig-box">
            <div class="sig-title">Người báo cáo</div>
            <div>${initialReport ? (users.find(u => u.id === initialReport.authorId)?.name || currentUser.name) : currentUser.name}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Trưởng phòng</div>
            <div></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Giám đốc</div>
            <div>${initialReport?.approvedBy ? users.find(u => u.id === initialReport.approvedBy)?.name : ''}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() { 
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // isManagerAction=true → save managerFeedback; false → save directorFeedback
  const handleAction = (status: ReportStatus, isManagerAction = false) => {
    if (!initialReport) return;
    onSave({
      ...initialReport,
      status,
      approvedAt: status === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: status === 'Approved' ? currentUser.id : undefined,
      managerFeedback: isManagerAction ? managerFeedback : initialReport.managerFeedback,
      directorFeedback: !isManagerAction ? directorFeedback : initialReport.directorFeedback,
    });
    onClose();
  };

  const handleDelete = () => {
    setShowConfirmDelete(true);
  };

  const executeDelete = () => {
    if (initialReport && onDelete) {
      onDelete(initialReport.id);
      setShowConfirmDelete(false);
    }
  };

  const executeHardDelete = () => {
    if (initialReport && onAdminHardDelete) {
      onAdminHardDelete(initialReport.id);
      setShowConfirmHardDelete(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-5xl my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* ── TOP BAR ── */}
        <div className="relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="CTC Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-blue-200/80 uppercase tracking-widest mb-0.5">CÔNG TY CỔ PHẦN XÂY LẮP BƯU ĐIỆN MIỀN TRUNG</p>
                <h1 className="text-xl font-bold tracking-tight">{currentUser.department || 'Phòng ban'}</h1>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-sm">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── FORM BODY ── */}
        <div className="p-8 flex flex-col gap-8 overflow-y-auto max-h-[75vh] custom-scrollbar">

          {/* Title & Reporter Info */}
          <div className="text-center space-y-4">
            <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
              Báo cáo nội dung công việc
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Date Range */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                <CalendarDays size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Tuần từ</span>
                <DateInput value={weekStart} onChange={setWeekStart} disabled={isFormReadOnly} className="bg-transparent border-b border-dashed border-gray-300 px-1 py-0.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-500 disabled:text-gray-500 text-center" />
                <span className="text-sm font-medium text-gray-400">đến</span>
                <DateInput value={weekEnd} onChange={setWeekEnd} disabled={isFormReadOnly} className="bg-transparent border-b border-dashed border-gray-300 px-1 py-0.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-500 disabled:text-gray-500 text-center" />
              </div>

              {/* Reporter */}
              <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100/50">
                <User size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Báo cáo bởi:</span>
                <span className="text-sm font-bold text-blue-800">
                  {initialReport ? (users?.find(u => u.id === initialReport.authorId)?.name || initialReport.title.split('·')[1]?.trim() || currentUser.name) : currentUser.name}
                </span>
              </div>
            </div>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isFormReadOnly}
              placeholder="Tiêu đề báo cáo (tùy chọn)..."
              className="w-full max-w-2xl mx-auto text-center text-sm border-0 border-b-2 border-transparent hover:border-gray-200 focus:outline-none focus:border-blue-500 text-gray-600 bg-transparent py-2 transition-colors disabled:text-gray-400 disabled:hover:border-transparent"
            />
          </div>

          {/* ── TASK TABLE ── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><FileText size={16} /></span>
                Nội dung thực hiện
              </h3>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  {canApprove && (
                    <button onClick={importDepartmentReports} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors border border-indigo-100 shadow-sm">
                      <Building2 size={14}/> Tổng hợp phòng
                    </button>
                  )}
                  <button onClick={importDoneTasks} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors border border-blue-100 shadow-sm">
                    <Send size={14} className="rotate-90"/> Thêm từ DS
                  </button>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="grid bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ gridTemplateColumns: '32px 40px 1fr 140px 1fr 140px 140px 40px' }}>
                <div className="px-2 py-3.5" />
                <div className="px-1 py-3.5 text-center">STT</div>
                <div className="px-3 py-3.5">Nội dung</div>
                <div className="px-3 py-3.5 text-center">Kết quả</div>
                <div className="px-3 py-3.5">Bước tiếp theo</div>
                <div className="px-3 py-3.5">Ghi chú</div>
                <div className="px-3 py-3.5">Nhân viên</div>
                <div className="px-2 py-3.5" />
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tasks-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-gray-100">
                      {rows.map((row, idx) => (
                        <Draggable key={row.id} draggableId={row.id} index={idx} isDragDisabled={isFormReadOnly}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              className={`grid items-start transition-colors group relative ${snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-1 ring-blue-200 rounded-xl z-50' : 'hover:bg-blue-50/30 bg-white'}`} 
                              style={{ ...provided.draggableProps.style, gridTemplateColumns: '32px 40px 1fr 140px 1fr 140px 140px 40px' }}
                            >
                              <div className="px-1 py-4 flex items-center justify-center mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                                {!isFormReadOnly && <GripVertical size={16} />}
                              </div>
                              <div className="px-1 py-4 text-center text-xs font-semibold text-gray-400 mt-1">{idx + 1}</div>
                              <div className="px-2 py-3">
                      <textarea value={row.content} onChange={e => updateRow(row.id, 'content', e.target.value)} disabled={isFormReadOnly} rows={2} placeholder="Mô tả công việc..." className="w-full resize-none text-sm font-medium text-gray-800 bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 transition-all disabled:cursor-default placeholder-gray-300" />
                    </div>
                    <div className="px-2 py-3 flex items-start justify-center mt-1">
                      {isReadOnly ? (
                        <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${row.result === 'done' ? 'bg-green-100 text-green-700' : row.result === 'in_progress' ? 'bg-blue-100 text-blue-700' : row.result === 'pending' ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}>
                          {RESULT_OPTIONS.find(o => o.value === row.result)?.label || '—'}
                        </span>
                      ) : (
                        <div className="relative w-full">
                          <select value={row.result} onChange={e => updateRow(row.id, 'result', e.target.value as TaskRow['result'])} className="w-full appearance-none text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-all">
                            {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-3">
                      <textarea value={row.nextAction} onChange={e => updateRow(row.id, 'nextAction', e.target.value)} disabled={isFormReadOnly} rows={2} placeholder="Bước tiếp theo..." className="w-full resize-none text-sm text-gray-600 bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 transition-all disabled:cursor-default placeholder-gray-300" />
                    </div>
                    <div className="px-2 py-3">
                      <textarea value={row.note} onChange={e => updateRow(row.id, 'note', e.target.value)} disabled={isFormReadOnly} rows={2} placeholder="Ghi chú..." className="w-full resize-none text-xs text-gray-500 bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 transition-all disabled:cursor-default placeholder-gray-300" />
                    </div>
                    <div className="px-2 py-3">
                       <input value={row.assignee || ''} onChange={e => updateRow(row.id, 'assignee', e.target.value)} disabled={isFormReadOnly} placeholder="Người làm..." className="w-full text-sm font-medium text-gray-700 bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 transition-all disabled:cursor-default placeholder-gray-300" />
                    </div>
                    <div className="px-1 py-3 flex items-start justify-center mt-1">
                      {!isReadOnly && rows.length > 1 && (
                        <button onClick={() => removeRow(row.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Xóa dòng">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {!isReadOnly && (
                <div className="p-2 bg-gray-50/50 border-t border-gray-100">
                  <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-xl transition-colors border border-transparent hover:border-blue-200">
                    <Plus size={16} /> Thêm công việc
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── NEXT WEEK PLAN ── */}
            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/30 border border-amber-200/60 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><CalendarDays size={16} /></span>
                Kế hoạch tuần tới
              </h3>
              <textarea value={nextWeekPlan} onChange={e => setNextWeekPlan(e.target.value)} disabled={isFormReadOnly} rows={4} placeholder="- Kế hoạch 1&#10;- Kế hoạch 2..." className="w-full resize-none text-sm text-gray-700 bg-white/60 border border-amber-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-default" />
            </div>

            {/* ── FEEDBACKS ── */}
            <div className="space-y-4">
              {(initialReport?.managerFeedback || isManagerReview || (canApprove && initialReport && initialReport.authorId !== currentUser.id)) && (
                <div className="bg-gradient-to-br from-orange-50/80 to-orange-100/30 border border-orange-200/60 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-orange-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center"><User size={16} /></span>
                    Ý kiến Trưởng phòng
                  </h3>
                  <textarea value={managerFeedback} onChange={e => setManagerFeedback(e.target.value)} disabled={!isManagerReview && !(canApprove && initialReport && initialReport.authorId !== currentUser.id)} rows={2} placeholder="Nhập ý kiến..." className="w-full resize-none text-sm text-gray-800 bg-white/60 border border-orange-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-default" />
                </div>
              )}

              {(initialReport?.directorFeedback || isDirectorReview) && (
                <div className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/30 border border-indigo-200/60 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><User size={16} /></span>
                    Ý kiến Giám đốc
                  </h3>
                  <textarea value={directorFeedback} onChange={e => setDirectorFeedback(e.target.value)} disabled={!isDirectorReview} rows={2} placeholder="Nhập ý kiến..." className="w-full resize-none text-sm text-gray-800 bg-white/60 border border-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-default" />
                </div>
              )}
            </div>
          </div>

          {/* ── ATTACHMENTS ── */}
          <div className="bg-gradient-to-br from-slate-50/80 to-slate-100/30 border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><Paperclip size={16} /></span>
              Tài liệu đính kèm
              {attachments.length > 0 && <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">{attachments.length}</span>}
            </h3>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-slate-200 group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${file.type.startsWith('image/') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {file.type.startsWith('image/') ? <Image size={16}/> : <FileText size={16}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-[11px] text-gray-400">{fmtSize(file.size)}</p>
                    </div>
                    {file.type.startsWith('image/') && (
                      <img src={file.url} alt={file.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    )}
                    <a href={file.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <DownloadIcon size={14}/>
                    </a>
                    {!isFormReadOnly && (
                      <button onClick={() => removeAttachment(idx)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            {!isFormReadOnly && (
              <label
                className={`flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50'); }}
                onDragLeave={e => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50'); }}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50'); handleFileUpload(e.dataTransfer.files); }}
              >
                <input type="file" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                {uploading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                    <span className="text-sm font-medium">Đang tải lên...</span>
                  </div>
                ) : (
                  <>
                    <FileUp size={20} className="text-slate-400"/>
                    <span className="text-sm text-slate-500">Kéo thả hoặc <span className="text-blue-600 font-semibold">chọn file</span></span>
                    <span className="text-[11px] text-slate-400">Ảnh, PDF, Word, Excel (tối đa 10MB/file)</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            {initialReport && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold">{initialReport.department}</span>
                <span>•</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${initialReport.status === 'Approved' ? 'bg-green-100 text-green-700' : initialReport.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : initialReport.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                  {initialReport.status === 'Approved' ? '✓ Đã duyệt' : initialReport.status === 'Pending' ? '⏳ Chờ duyệt' : initialReport.status === 'Rejected' ? '✗ Từ chối' : 'Nháp'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center gap-2" title="In Báo Cáo">
              <FileText size={16} /> In
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-xl transition-colors">
              Đóng
            </button>

            {/* Author saving draft */}
            {!isReadOnly && !initialReport && (
              <Button onClick={() => handleSave('Draft')} variant="secondary" className="!rounded-xl shadow-sm">
                <Save size={16} className="mr-2" /> Lưu nháp
              </Button>
            )}
            {!isReadOnly && initialReport?.status === 'Draft' && initialReport?.authorId === currentUser.id && (
              <Button onClick={() => handleSave('Draft')} variant="secondary" className="!rounded-xl shadow-sm">
                <Save size={16} className="mr-2" /> Cập nhật nháp
              </Button>
            )}

            {/* Author submitting */}
            {!isReadOnly && (!initialReport || ['Draft', 'Rejected'].includes(initialReport.status)) && initialReport?.authorId !== currentUser.id /* if new */ && (
              <Button onClick={() => handleSave('Pending')} className="!rounded-xl shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700">
                <Send size={16} className="mr-2" /> {canApprove ? 'Gửi Giám Đốc' : 'Gửi duyệt'}
              </Button>
            )}
            {!isReadOnly && initialReport?.authorId === currentUser.id && ['Draft', 'Pending', 'Pending Manager', 'Pending Director', 'Rejected'].includes(initialReport.status) && (
              <Button onClick={() => handleSave('Pending')} className="!rounded-xl shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700">
                <Send size={16} className="mr-2" /> {initialReport.status.startsWith('Pending') ? 'Cập nhật' : 'Gửi lại'}
              </Button>
            )}

            {/* Manager review actions */}
            {isManagerReview && (
              <>
                <Button onClick={() => handleAction('Rejected', true)} className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
                  <XCircle size={16} className="mr-2" /> Trả lại
                </Button>
                <Button onClick={() => handleAction('Approved', true)} className="!rounded-xl shadow-md bg-green-600 hover:bg-green-700">
                  <CheckCircle size={16} className="mr-2" /> Duyệt & Gửi GĐ
                </Button>
              </>
            )}

            {/* Director review actions */}
            {isDirectorReview && (
              <>
                {isDirectorPendingReview && (
                  <Button onClick={() => handleAction('Rejected', false)} className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
                    <XCircle size={16} className="mr-2" /> Từ chối
                  </Button>
                )}
                {isDirectorPendingReview && (
                  <Button onClick={() => handleAction('Approved', false)} className="!rounded-xl shadow-md bg-green-600 hover:bg-green-700">
                    <CheckCircle size={16} className="mr-2" /> Phê duyệt
                  </Button>
                )}
                {isDirectorFeedbackReview && (
                  <Button onClick={() => handleAction('Approved', false)} className="!rounded-xl shadow-md bg-indigo-600 hover:bg-indigo-700">
                    <Save size={16} className="mr-2" /> Cập nhật nhận xét
                  </Button>
                )}
              </>
            )}

            {/* Admin actions */}
            {isAdmin && initialReport?.isDeleted === 1 && (
              <Button onClick={executeHardDelete} className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
                <Trash2 size={16} className="mr-2" /> Xóa vĩnh viễn
              </Button>
            )}
            {initialReport?.authorId === currentUser.id && initialReport.status === 'Draft' && (
              <Button onClick={handleDelete} className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
                <Trash2 size={16} className="mr-2" /> Xóa
              </Button>
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={showConfirmDelete}
          title="Xóa báo cáo"
          message="Bạn có chắc chắn muốn xóa báo cáo này? Hành động này không thể hoàn tác."
          onConfirm={executeDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
        <ConfirmDialog
          isOpen={showConfirmHardDelete}
          title="Xóa vĩnh viễn báo cáo"
          message="Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo này khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác."
          onConfirm={executeHardDelete}
          onCancel={() => setShowConfirmHardDelete(false)}
        />
      </div>
    </div>
  );
};
