import { Router } from 'express';

export function notificationRoutes(db: any) {
  const router = Router();

  router.get('/:userId', async (req, res) => {
    try {
      const notifications = await db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', [req.params.userId]);
      res.json(notifications);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.patch('/:id/read', async (req, res) => {
    try {
      await db.run('UPDATE notifications SET isRead = 1 WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.patch('/read-all/:userId', async (req, res) => {
    try {
      await db.run('UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0', [req.params.userId]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM notifications WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
