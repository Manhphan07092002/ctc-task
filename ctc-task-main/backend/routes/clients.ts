import express from 'express';

export function clientRoutes(db: any) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const clients = await db.all('SELECT * FROM clients ORDER BY name ASC');
      res.json(clients);
    } catch (error) {
      console.error('[Clients] Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  return router;
}
