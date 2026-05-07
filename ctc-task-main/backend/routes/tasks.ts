import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function taskRoutes(db: any) {
  const router = Router();

  function groupByKey(rows: any[], key: string): Record<string, any[]> {
    return rows.reduce((acc: Record<string, any[]>, r: any) => {
      (acc[r[key]] ??= []).push(r);
      return acc;
    }, {});
  }

  async function buildTasks(thresholdDate?: string) {
    let tasksQuery = 'SELECT * FROM tasks';
    const params: any[] = [];
    if (thresholdDate) {
      tasksQuery += ' WHERE startDate >= ? OR dueDate >= ? OR startDate IS NULL OR dueDate IS NULL';
      params.push(thresholdDate, thresholdDate);
    }
    
    const [tasks, assignees, tags, subtasks, comments] = await Promise.all([
      db.all(tasksQuery, params),
      db.all('SELECT taskId, userId FROM task_assignees'),
      db.all('SELECT taskId, tag FROM task_tags'),
      db.all('SELECT id, taskId, title, isCompleted FROM task_subtasks ORDER BY sortOrder'),
      db.all('SELECT id, taskId, userId, content, createdAt FROM task_comments ORDER BY createdAt'),
    ]);

    const aMap = groupByKey(assignees, 'taskId');
    const tMap = groupByKey(tags, 'taskId');
    const sMap = groupByKey(subtasks, 'taskId');
    const cMap = groupByKey(comments, 'taskId');

    return tasks.map((t: any) => ({
      ...t,
      assignees: (aMap[t.id] ?? []).map((r: any) => r.userId),
      tags: (tMap[t.id] ?? []).map((r: any) => r.tag),
      subtasks: (sMap[t.id] ?? []).map((r: any) => ({
        id: r.id, title: r.title, isCompleted: Boolean(r.isCompleted),
      })),
      comments: (cMap[t.id] ?? []).map((r: any) => ({
        id: r.id, userId: r.userId, content: r.content, createdAt: r.createdAt,
      })),
    }));
  }

  async function saveRelated(taskId: string, t: any) {
    await db.run('DELETE FROM task_assignees WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_tags WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_comments WHERE taskId = ?', [taskId]);

    for (const userId of (t.assignees ?? [])) {
      await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, userId]);
    }
    for (const tag of (t.tags ?? [])) {
      await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', [taskId, tag]);
    }
    const subtasks: any[] = t.subtasks ?? [];
    for (let i = 0; i < subtasks.length; i++) {
      const s = subtasks[i];
      await db.run(
        'INSERT INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)',
        [s.id ?? randomUUID(), taskId, s.title, s.isCompleted ? 1 : 0, i],
      );
    }
    for (const c of (t.comments ?? [])) {
      await db.run(
        'INSERT INTO task_comments (id, taskId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)',
        [c.id ?? randomUUID(), taskId, c.userId, c.content, c.createdAt ?? new Date().toISOString()],
      );
    }
  }

  router.get('/', async (_req, res) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      res.json(await buildTasks(sixMonthsAgo.toISOString()));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch tasks' }); }
  });

  router.get('/archive', async (_req, res) => {
    try {
      res.json(await buildTasks());
    } catch (e) { res.status(500).json({ error: 'Failed to fetch tasks archive' }); }
  });

  router.post('/', async (req, res) => {
    const t = req.body;
    try {
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, dueDate, estimatedEndAt, priority, status, createdBy, department, recurrence, contractId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.title, t.description ?? null, t.startDate ?? null, t.dueDate ?? null,
          t.estimatedEndAt ?? null, t.priority ?? null, t.status ?? null,
          t.createdBy ?? null, t.department ?? null, t.recurrence ?? null, t.contractId ?? null],
      );
      await saveRelated(t.id, t);

      if (t.createdBy) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), t.createdBy, 'task.created', t.id, 'task', new Date().toISOString()],
        );
      }
      if (Array.isArray(t.assignees)) {
        for (const assigneeId of t.assignees) {
          if (assigneeId !== t.createdBy) {
            await sendNotification(db, assigneeId, 'task_assigned', 'Công việc mới', `Bạn vừa được giao một công việc mới: ${t.title}`, t.id);
          }
        }
      }
      res.json({ id: t.id });
    } catch (e) { res.status(500).json({ error: 'Failed task create' }); }
  });

  router.put('/:id', async (req, res) => {
    const t = req.body;
    try {
      await db.run(
        'UPDATE tasks SET title=?, description=?, startDate=?, dueDate=?, estimatedEndAt=?, priority=?, status=?, department=?, recurrence=?, contractId=? WHERE id=?',
        [t.title, t.description ?? null, t.startDate ?? null, t.dueDate ?? null,
          t.estimatedEndAt ?? null, t.priority ?? null, t.status ?? null,
          t.department ?? null, t.recurrence ?? null, t.contractId ?? null, req.params.id],
      );
      await saveRelated(req.params.id, t);

      if (t.updatedBy || t.createdBy) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), t.updatedBy ?? t.createdBy ?? 'system', 'task.updated', req.params.id, 'task', new Date().toISOString()],
        );
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed task update' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM task_assignees WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_tags WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_comments WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
