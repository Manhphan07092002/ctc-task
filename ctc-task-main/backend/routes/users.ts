import { Router } from 'express';
import bcrypt from 'bcryptjs';

const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export function userRoutes(db: any, mailer: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      // Ensure bio and phone columns exist (safe migration)
      await db.run(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN dob TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN hometown TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN cccd TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN gender TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'`).catch(() => {});
      const users = await db.all(`SELECT u.id, u.name, u.email, u.role, u.department, u.avatar, u.bio, u.phone, u.dob, u.hometown, u.cccd, u.gender, u.preferences, u.isLocked, r.permissions FROM users u LEFT JOIN roles r ON u.role = r.name`);
      res.json(users.map((u: any) => ({ ...u, isLocked: Boolean(u.isLocked), permissions: u.permissions ? JSON.parse(u.permissions) : [], preferences: u.preferences ? JSON.parse(u.preferences) : {} })));
    } catch (e) { console.error('GET /api/users error:', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      await db.run(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN dob TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN hometown TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN cccd TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN gender TEXT DEFAULT ''`).catch(() => {});
      await db.run(`ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'`).catch(() => {});
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, email, hashedPassword, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}']);
      res.json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id', async (req, res) => {
    const { name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        await db.run('UPDATE users SET name=?, email=?, password=?, role=?, department=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=? WHERE id=?', [name, email, hashed, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}', req.params.id]);
      } else {
        await db.run('UPDATE users SET name=?, email=?, role=?, department=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=? WHERE id=?', [name, email, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}', req.params.id]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:id/reset-password', async (req, res) => {
    const { newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [req.params.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const finalPassword = newPassword && String(newPassword).trim().length >= 6 ? String(newPassword).trim() : generateRandomPassword(8);
      const hashed = await bcrypt.hash(finalPassword, 10);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL, isLocked = 0 WHERE id = ?', [hashed, req.params.id]);
      await db.run("UPDATE password_reset_requests SET status = 'resolved' WHERE userId = ? AND status = 'pending'", [req.params.id]);
      const emailSent = await mailer.sendResetPasswordEmail(user.email, finalPassword);
      return res.json({ success: true, emailSent, generatedPassword: finalPassword });
    } catch (e) { console.error('reset-password error', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/lock', async (req, res) => {
    try {
      await db.run('UPDATE users SET isLocked = 1, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Khóa tài khoản', req.params.id, 'user', 'Admin chủ động khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/unlock', async (req, res) => {
    try {
      await db.run('UPDATE users SET isLocked = 0, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Mở khóa tài khoản', req.params.id, 'user', 'Admin mở khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
