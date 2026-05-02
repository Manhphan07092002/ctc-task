import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function revenueRoutes(_prisma: any, db: any) {
  const router = Router();

  // GET all revenue reports (not deleted)
  router.get('/', async (_req, res) => {
    try {
      const rows = await db.all('SELECT * FROM revenue_reports WHERE isDeleted IS NULL OR isDeleted = 0 ORDER BY createdAt DESC');
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch revenue reports' }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const { id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, submittedAt } = req.body;
    try {
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO revenue_reports (id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, createdAt, submittedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, reportType, periodStart, periodEnd, content ?? null, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, authorId, department, status || 'Draft', now, submittedAt ?? null]
      );

      // Log activity
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'revenue_report.created', id, 'revenue_report', now]
      );

      // Notify manager if submitting
      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [department, department]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'revenue_submitted', 'Báo cáo doanh thu mới', `Nhân viên vừa nộp báo cáo doanh thu: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create revenue report', detail: e.message }); }
  });

  // UPDATE (also used for approve/reject)
  router.put('/:id', async (req, res) => {
    const { title, content, reportType, periodStart, periodEnd, totalPreTax, totalDelivered, totalCumulative, status, submittedAt, approvedAt, approvedBy, managerFeedback, directorFeedback } = req.body;
    try {
      const existing = await db.get('SELECT * FROM revenue_reports WHERE id = ?', [req.params.id]);

      await db.run(
        `UPDATE revenue_reports SET title=?, content=?, reportType=?, periodStart=?, periodEnd=?, totalPreTax=?, totalDelivered=?, totalCumulative=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, managerFeedback=?, directorFeedback=? WHERE id=?`,
        [title, content ?? null, reportType, periodStart, periodEnd, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, status, submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, managerFeedback ?? null, directorFeedback ?? null, req.params.id]
      );

      // Log
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), approvedBy || 'system', `revenue_report.${status}`, req.params.id, 'revenue_report', new Date().toISOString()]
      );

      // Notify author on status change
      if (existing && existing.status !== status) {
        let msg = `Báo cáo doanh thu đã chuyển sang: ${status}`;
        if (status === 'Approved') msg = 'Báo cáo doanh thu đã được duyệt.';
        if (status === 'Rejected') msg = 'Báo cáo doanh thu đã bị từ chối.';
        await sendNotification(db, existing.authorId, 'revenue_updated', 'Cập nhật báo cáo doanh thu', msg, req.params.id);
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update revenue report' }); }
  });

  // SOFT DELETE (only Draft/Rejected)
  router.delete('/:id', async (req, res) => {
    try {
      const report = await db.get('SELECT status FROM revenue_reports WHERE id = ?', [req.params.id]);
      if (!report) return res.status(404).json({ error: 'Not found' });
      if (report.status === 'Approved' || report.status.startsWith('Pending')) {
        return res.status(403).json({ error: 'Cannot delete approved or pending report' });
      }
      await db.run('UPDATE revenue_reports SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete revenue report' }); }
  });

  return router;
}
