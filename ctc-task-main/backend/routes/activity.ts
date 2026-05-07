import { Router } from 'express';

export function activityRoutes(db: any) {
  const router = Router();

  async function enrichLogs(logs: any[]) {
    const userIds = [...new Set(logs.map((l: any) => l.userId).filter((id: string) => id && id !== 'system'))];
    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `?`).join(', ');
      const users = await db.all(`SELECT id, name, avatar, email, department FROM users WHERE id IN (${placeholders})`, userIds);
      users.forEach((u: any) => userMap.set(u.id, u));
    }
    return logs.map((l: any) => ({
      ...l,
      user: l.userId === 'system'
        ? { name: 'Hệ thống', avatar: '', department: 'System' }
        : userMap.get(l.userId) || null,
    }));
  }

  router.get('/', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await db.all(
        'SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?',
        [limit],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch activity logs' }); }
  });

  router.get('/user/:userId', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await db.all(
        'SELECT * FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
        [req.params.userId, limit],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch user activity logs' }); }
  });

  return router;
}
