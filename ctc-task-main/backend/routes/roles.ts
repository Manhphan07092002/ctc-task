import { Router } from 'express';

export function roleRoutes(db: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const roles = await db.all('SELECT * FROM roles ORDER BY isSystem DESC, name ASC');
      const result = await Promise.all(roles.map(async (r: any) => {
        const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', [r.name]);
        return { ...r, permissions: JSON.parse(r.permissions || '[]'), userCount: count };
      }));
      res.json(result);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch roles' }); }
  });

  router.post('/', async (req, res) => {
    const { id, name, description, color, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    try {
      const newId = id || `role-${Date.now()}`;
      await db.run('INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, 0)', [newId, name.trim(), description || '', color || '#6366f1', JSON.stringify(permissions || [])]);
      res.status(201).json({ id: newId });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { name, description, color, permissions } = req.body;
    try {
      const existing = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (existing.isSystem) {
        await db.run('UPDATE roles SET description = ?, color = ?, permissions = ? WHERE id = ?', [description ?? existing.description, color ?? existing.color, JSON.stringify(permissions ?? JSON.parse(existing.permissions || '[]')), req.params.id]);
      } else {
        await db.run('UPDATE roles SET name = ?, description = ?, color = ?, permissions = ? WHERE id = ?', [name ?? existing.name, description ?? existing.description, color ?? existing.color, JSON.stringify(permissions ?? JSON.parse(existing.permissions || '[]')), req.params.id]);
      }
      res.json({ success: true });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const role = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
      if (!role) return res.status(404).json({ error: 'Not found' });
      if (role.isSystem) return res.status(403).json({ error: 'Không thể xóa vai trò hệ thống' });
      const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', [role.name]);
      if (count > 0) return res.status(409).json({ error: `Đang có ${count} người dùng với vai trò này` });
      await db.run('DELETE FROM roles WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete role' }); }
  });

  return router;
}
