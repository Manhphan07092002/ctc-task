import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function adminRoutes(db: any, mailer: any) {
  const router = Router();
  const upload = multer({ dest: path.join(__dirname, '../../tmp') });

  // --- Password Reset Requests ---
  router.get('/password-reset-requests', async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || '') === '1';
      const requests = includeResolved
        ? await db.all('SELECT * FROM password_reset_requests ORDER BY createdAt DESC')
        : await db.all("SELECT * FROM password_reset_requests WHERE status = 'pending' ORDER BY createdAt DESC");
      res.json(requests);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/password-reset-requests/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM password_reset_tokens WHERE userId = (SELECT userId FROM password_reset_requests WHERE id = ?)', [req.params.id]);
      await db.run('DELETE FROM password_reset_requests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- Database Management ---
  router.get('/database/tables', async (_req, res) => {
    try {
      const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`);
      const data = [] as { name: string; count: number | null }[];
      for (const table of tables) {
        try {
          const row = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
          data.push({ name: table.name, count: row?.count ?? 0 });
        } catch { data.push({ name: table.name, count: null }); }
      }
      res.json(data);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/database/table/:table', async (req, res) => {
    try {
      const { table } = req.params;
      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);
      const totalRow = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      const rows = await db.all(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
      res.json({ table, total: totalRow?.count ?? 0, rows });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/database/table/:table/row/:id', async (req, res) => {
    try {
      await db.run(`DELETE FROM ${req.params.table} WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/database/export', async (_req, res) => {
    try {
      const file = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'Database file not found' });
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="database.sqlite"');
      fs.createReadStream(file).pipe(res);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/database/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file import' });
      const targetPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
      await fs.promises.copyFile(req.file.path, targetPath);
      await fs.promises.unlink(req.file.path).catch(() => { });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Import thất bại' }); }
  });

  // --- SMTP Config ---
  router.get('/system-config/smtp', async (_req, res) => {
    try {
      const smtp = await mailer.getSystemConfig();
      res.json({ SMTP_HOST: smtp.SMTP_HOST, SMTP_PORT: smtp.SMTP_PORT, SMTP_SECURE: smtp.SMTP_SECURE, SMTP_USER: smtp.SMTP_USER, SMTP_PASS: smtp.SMTP_PASS ? '********' : '', SMTP_FROM: smtp.SMTP_FROM });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/smtp', async (req, res) => {
    try {
      const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = req.body;
      const entries: [string, string][] = [
        ['SMTP_HOST', SMTP_HOST || ''], ['SMTP_PORT', String(SMTP_PORT || '587')],
        ['SMTP_SECURE', String(SMTP_SECURE || 'false')], ['SMTP_USER', SMTP_USER || ''], ['SMTP_FROM', SMTP_FROM || ''],
      ];
      if (SMTP_PASS && SMTP_PASS !== '********') entries.push(['SMTP_PASS', SMTP_PASS]);
      for (const [key, value] of entries) {
        await db.run('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/smtp/test', async (req, res) => {
    try {
      const { testEmail } = req.body;
      const { transporter, smtp } = await mailer.createTransporter();
      if (!transporter) return res.status(400).json({ error: 'SMTP chưa được cấu hình đầy đủ' });
      await transporter.sendMail({ from: smtp.SMTP_FROM, to: testEmail || smtp.SMTP_USER, subject: 'CTC Task - Test cấu hình SMTP', text: 'Chúc mừng, cấu hình SMTP của anh đã hoạt động.', html: '<div style="font-family:Arial,sans-serif"><h3>CTC Task</h3><p>Chúc mừng, cấu hình SMTP của anh đã hoạt động.</p></div>' });
      res.json({ success: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message || 'Lỗi gửi mail' }); }
  });

  // --- AI Keys ---
  router.get('/system-config/ai-keys', async (_req, res) => {
    try {
      const config = await db.get(`SELECT value FROM system_config WHERE key = 'gemini_api_keys'`);
      if (config && config.value) return res.json({ keys: JSON.parse(config.value) });
      res.json({ keys: [] });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/ai-keys', async (req, res) => {
    try {
      const { keys } = req.body;
      if (!Array.isArray(keys)) return res.status(400).json({ error: 'Invalid keys format' });
      await db.run('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['gemini_api_keys', JSON.stringify(keys)]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- Stats ---
  router.get('/stats', async (_req, res) => {
    try {
      const userCountDesc = await db.get('SELECT COUNT(*) as count FROM users');
      const taskCountDesc = await db.get('SELECT COUNT(*) as count FROM tasks');
      const reportCountDesc = await db.get('SELECT COUNT(*) as count FROM reports');
      const meetingCountDesc = await db.get('SELECT COUNT(*) as count FROM meetings WHERE status != "ended"');
      const roleBreakdown = await db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');
      const taskStatusBreakdown = await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
      const taskDeptBreakdown = await db.all('SELECT department, COUNT(*) as count FROM tasks GROUP BY department');
      res.json({ totalUsers: userCountDesc.count, totalTasks: taskCountDesc.count, totalReports: reportCountDesc.count, activeMeetings: meetingCountDesc.count, roleBreakdown, taskStatusBreakdown, taskDeptBreakdown });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch admin stats' }); }
  });

  return router;
}
