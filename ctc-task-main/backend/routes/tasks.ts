import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function taskRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const allTasks = await prisma.tasks.findMany();
      res.json(allTasks.map(t => ({
        ...t,
        assignees: t.assignees ? JSON.parse(t.assignees) : [],
        tags: t.tags ? JSON.parse(t.tags) : [],
        subtasks: t.subtasks ? JSON.parse(t.subtasks) : [],
        comments: t.comments ? JSON.parse(t.comments) : []
      })));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch tasks' }); }
  });

  router.post('/', async (req, res) => {
    const t = req.body;
    try {
      await prisma.tasks.create({
        data: {
          id: t.id, title: t.title, description: t.description,
          startDate: t.startDate, dueDate: t.dueDate, estimatedEndAt: t.estimatedEndAt,
          priority: t.priority, status: t.status,
          assignees: JSON.stringify(t.assignees || []),
          tags: JSON.stringify(t.tags || []),
          createdBy: t.createdBy, department: t.department, recurrence: t.recurrence,
          subtasks: JSON.stringify(t.subtasks || []),
          comments: JSON.stringify(t.comments || [])
        }
      });
      res.json({ id: t.id });
    } catch (e) { res.status(500).json({ error: 'Failed task create' }); }
  });

  router.put('/:id', async (req, res) => {
    const t = req.body;
    try {
      await prisma.tasks.update({
        where: { id: req.params.id },
        data: {
          title: t.title, description: t.description,
          startDate: t.startDate, dueDate: t.dueDate, estimatedEndAt: t.estimatedEndAt,
          priority: t.priority, status: t.status,
          assignees: JSON.stringify(t.assignees || []),
          tags: JSON.stringify(t.tags || []),
          department: t.department, recurrence: t.recurrence,
          subtasks: JSON.stringify(t.subtasks || []),
          comments: JSON.stringify(t.comments || [])
        }
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed task update' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await prisma.tasks.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
