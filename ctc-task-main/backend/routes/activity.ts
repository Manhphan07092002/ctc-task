import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function activityRoutes(prisma: PrismaClient) {
  const router = Router();

  const enrichLogs = async (logs: any[]) => {
    const userIds = [...new Set(logs.map(l => l.userId).filter(id => id && id !== 'system'))];
    if (userIds.length === 0) return logs.map(l => ({ ...l, user: null }));
    
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatar: true, email: true, department: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return logs.map(l => ({
      ...l,
      user: l.userId === 'system' 
        ? { name: 'Hệ thống', avatar: '', department: 'System' } 
        : userMap.get(l.userId) || null
    }));
  };

  router.get('/', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await prisma.activity_logs.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      const enriched = await enrichLogs(logs);
      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });

  router.get('/user/:userId', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await prisma.activity_logs.findMany({
        where: { userId: req.params.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      const enriched = await enrichLogs(logs);
      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch user activity logs' });
    }
  });

  return router;
}
