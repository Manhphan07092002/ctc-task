const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let src = fs.readFileSync(path, 'utf8');

const startStr = '  // ─── Render ────────────────────────────────────────────────────────────────\n  return (\n    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">';
const endStr = '\n    </div>\n  );\n};';

const si = src.indexOf(startStr);
const ei = src.lastIndexOf(endStr);

if (si === -1 || ei === -1) {
  console.error("Could not find start or end block for ReportModal render");
  process.exit(1);
}

const newRender = `  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-5xl my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* ── TOP BAR ── */}
        <div className="relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl backdrop-blur-sm shadow-inner">
                IC
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
              <div className="grid bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ gridTemplateColumns: '40px 1fr 140px 1fr 140px 140px 40px' }}>
                <div className="px-3 py-3.5 text-center">STT</div>
                <div className="px-3 py-3.5">Nội dung</div>
                <div className="px-3 py-3.5 text-center">Kết quả</div>
                <div className="px-3 py-3.5">Bước tiếp theo</div>
                <div className="px-3 py-3.5">Ghi chú</div>
                <div className="px-3 py-3.5">Nhân viên</div>
                <div className="px-2 py-3.5" />
              </div>

              <div className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <div key={row.id} className="grid items-start hover:bg-blue-50/30 transition-colors group relative" style={{ gridTemplateColumns: '40px 1fr 140px 1fr 140px 140px 40px' }}>
                    <div className="px-3 py-4 text-center text-xs font-semibold text-gray-400 mt-1">{idx + 1}</div>
                    <div className="px-2 py-3">
                      <textarea value={row.content} onChange={e => updateRow(row.id, 'content', e.target.value)} disabled={isFormReadOnly} rows={2} placeholder="Mô tả công việc..." className="w-full resize-none text-sm font-medium text-gray-800 bg-transparent border-0 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 transition-all disabled:cursor-default placeholder-gray-300" />
                    </div>
                    <div className="px-2 py-3 flex items-start justify-center mt-1">
                      {isReadOnly ? (
                        <span className={\`text-xs font-bold px-2.5 py-1.5 rounded-lg \${row.result === 'done' ? 'bg-green-100 text-green-700' : row.result === 'in_progress' ? 'bg-blue-100 text-blue-700' : row.result === 'pending' ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}\`}>
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
                ))}
              </div>

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
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            {initialReport && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold">{initialReport.department}</span>
                <span>•</span>
                <span className={\`px-3 py-1 rounded-full text-xs font-bold \${initialReport.status === 'Approved' ? 'bg-green-100 text-green-700' : initialReport.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : initialReport.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}\`}>
                  {initialReport.status === 'Approved' ? '✓ Đã duyệt' : initialReport.status === 'Pending' ? '⏳ Chờ duyệt' : initialReport.status === 'Rejected' ? '✗ Từ chối' : 'Nháp'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
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
            {!isReadOnly && initialReport?.authorId === currentUser.id && ['Draft', 'Rejected'].includes(initialReport.status) && (
              <Button onClick={() => handleSave('Pending')} className="!rounded-xl shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700">
                <Send size={16} className="mr-2" /> Gửi lại
              </Button>
            )}

            {/* Manager review actions */}
            {isManagerReview && (
              <>
                <Button onClick={() => handleAction('Rejected', true)} variant="danger" className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
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
                  <Button onClick={() => handleAction('Rejected', false)} variant="danger" className="!rounded-xl shadow-sm bg-red-500 hover:bg-red-600 text-white">
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
              <Button onClick={executeHardDelete} variant="danger" className="!rounded-xl shadow-sm">
                <Trash2 size={16} className="mr-2" /> Xóa vĩnh viễn
              </Button>
            )}
            {initialReport?.authorId === currentUser.id && initialReport.status === 'Draft' && (
              <Button onClick={handleDelete} variant="danger" className="!rounded-xl shadow-sm">
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
};`;

const result = src.slice(0, si) + newRender + src.slice(ei + endStr.length);
fs.writeFileSync(path, result, 'utf8');
console.log('Successfully upgraded ReportModal UI. Total lines:', result.split('\\n').length);
