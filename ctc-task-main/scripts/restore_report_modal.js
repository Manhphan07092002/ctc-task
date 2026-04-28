const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let c = fs.readFileSync(path, 'utf8');

// The replacement block to insert after state declarations (after showConfirmHardDelete line)
const insertAfter = `  const [showConfirmHardDelete, setShowConfirmHardDelete] = useState(false);`;

const newBlock = `
  const isAdmin = (currentUser.permissions || []).includes('admin_panel');

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

  // ── Load initial data ──
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
      } else {
        setRows([{ id: '1', content: initialReport.content || '', result: '', nextAction: '', note: '' }]);
        setNextWeekPlan('');
      }
    } else {
      const w = getWeekRange();
      setWeekStart(w.start); setWeekEnd(w.end);
      setTitle(\`Báo cáo tuần \${fmtDate(w.start)} – \${fmtDate(w.end)} · \${currentUser.name}\`);
      setRows([newRow()]);
      setNextWeekPlan('');
      setDirectorFeedback('');
    }
  }, [isOpen, initialReport]);

  if (!isOpen) return null;

  // ── Row helpers ──
  const updateRow = (id, field, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow    = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  // ── Import from task list ──
  const importDoneTasks = () => {
    const myTasks = tasks.filter(t => t.assignees.includes(currentUser.id));
    const newRows = myTasks.map(t => ({
      id: t.id,
      assignee: currentUser.name,
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
    const deptReports = allReports.filter(r =>
      r.department === currentUser.department &&
      r.authorId !== currentUser.id &&
      r.status === 'Approved'
    );
    let newRows = [];
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
    const data = { tasks: rows, nextWeekPlan, weekStart, weekEnd };
    return JSON.stringify(data);
  };

  const handleSave = (status) => {
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
    onClose();
  };

  // isManagerAction=true → save managerFeedback; false → save directorFeedback
  const handleAction = (status, isManagerAction = false) => {
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
`;

// Insert the new block right after the showConfirmHardDelete line
c = c.replace(insertAfter + '\n', insertAfter + '\n' + newBlock);

// Remove orphaned executeDelete that is no longer in the right place
// (it's now after the new block, before the render)
c = c.replace(`
  const executeDelete = () => {
    if (initialReport && onDelete) {
      onDelete(initialReport.id);
      setShowConfirmDelete(false);
    }
  };

  // ─── Render`, `
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

  // ─── Render`);

fs.writeFileSync(path, c, 'utf8');
console.log('Done restoring ReportModal logic. Lines:', c.split('\n').length);
