import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function reportRoutes(_prisma: any, db: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const reports = await db.all('SELECT * FROM reports');
      res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch reports' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      await db.run(
        'INSERT INTO reports (id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, content ?? null, authorId, department, status, createdAt, submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, directorFeedback ?? null, managerFeedback ?? null],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'report.created', id, 'report', new Date().toISOString()],
      );

      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [department, department]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'report_submitted', 'Báo cáo mới', `Nhân viên vừa nộp báo cáo: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      const existing = await db.get('SELECT * FROM reports WHERE id = ?', [req.params.id]);

      await db.run(
        'UPDATE reports SET title=?, content=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, directorFeedback=?, managerFeedback=? WHERE id=?',
        [title, content ?? null, status, submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, directorFeedback ?? null, managerFeedback ?? null, req.params.id],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), approvedBy || 'system', `report.${status}`, req.params.id, 'report', new Date().toISOString()],
      );

      if (existing && existing.status !== status) {
        let msg = `Báo cáo của bạn đã chuyển sang trạng thái: ${status}`;
        if (status === 'Approved') msg = 'Báo cáo của bạn đã được duyệt.';
        if (status === 'Rejected') msg = 'Báo cáo của bạn đã bị từ chối.';
        await sendNotification(db, existing.authorId, 'report_updated', 'Cập nhật báo cáo', msg, req.params.id);
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update report' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM reports WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete report' }); }
  });

  return router;
}
