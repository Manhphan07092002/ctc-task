import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

export function reportRoutes(prisma: PrismaClient) {
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
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      await prisma.reports.update({ where: { id: req.params.id }, data: { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } });
      await prisma.activity_logs.create({
        data: { id: randomUUID(), userId: approvedBy || 'system', action: `report.${status}`, entityId: req.params.id, entityType: 'report', createdAt: new Date().toISOString() }
      });
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
