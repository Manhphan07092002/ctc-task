import { Router } from 'express';
import { randomUUID } from 'crypto';

export function contractLinkRoutes(db: any) {
  const router = Router();

  // GET all links
  router.get('/', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM contract_links ORDER BY createdAt DESC');
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch contract links' }); }
  });

  // CREATE link
  router.post('/', async (req, res) => {
    const { outputContractId, inputContractId, linkType, description } = req.body;
    if (!outputContractId || !inputContractId) {
      return res.status(400).json({ error: 'outputContractId and inputContractId are required' });
    }
    if (outputContractId === inputContractId) {
      return res.status(400).json({ error: 'Cannot link a contract to itself' });
    }
    try {
      const id = randomUUID();
      await db.run(
        'INSERT INTO contract_links (id, outputContractId, inputContractId, linkType, description, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, outputContractId, inputContractId, linkType || 'related', description || null, req.user?.id || null, new Date().toISOString()]
      );
      res.status(201).json({ id });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Link already exists' });
      }
      res.status(500).json({ error: 'Failed to create link' });
    }
  });

  // UPDATE link
  router.put('/:id', async (req, res) => {
    const { linkType, description } = req.body;
    try {
      await db.run(
        'UPDATE contract_links SET linkType = ?, description = ? WHERE id = ?',
        [linkType || 'related', description || null, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update link' }); }
  });

  // DELETE link
  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM contract_links WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete link' }); }
  });

  return router;
}
