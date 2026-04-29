import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function reportRoutes(prisma: PrismaClient, db: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const reports = await prisma.reports.findMany();
      res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch reports' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      await prisma.reports.create({ data: { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } });
      await prisma.activity_logs.create({
        data: { id: randomUUID(), userId: authorId, action: 'report.created', entityId: id, entityType: 'report', createdAt: new Date().toISOString() }
      });

      // Notify Manager
      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [department, department]);
        if (dept && dept.managerId) {
          await sendNotification(db, dept.managerId, 'report_submitted', 'Báo cáo mới', `Nhân viên vừa nộp báo cáo: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      const existingReport = await prisma.reports.findUnique({ where: { id: req.params.id } });
      
      await prisma.reports.update({ where: { id: req.params.id }, data: { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } });
      await prisma.activity_logs.create({
        data: { id: randomUUID(), userId: approvedBy || 'system', action: `report.${status}`, entityId: req.params.id, entityType: 'report', createdAt: new Date().toISOString() }
      });

      if (existingReport && existingReport.status !== status) {
        // Notify Author about status change
        let msg = `Báo cáo của bạn đã chuyển sang trạng thái: ${status}`;
        if (status === 'Approved') msg = 'Báo cáo của bạn đã được duyệt.';
        if (status === 'Rejected') msg = 'Báo cáo của bạn đã bị từ chối.';
        
        await sendNotification(db, existingReport.authorId, 'report_updated', 'Cập nhật báo cáo', msg, req.params.id);
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update report' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await prisma.reports.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete report' }); }
  });

  return router;
}
