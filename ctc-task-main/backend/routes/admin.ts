import os from 'os';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
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
      if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Tên bảng không hợp lệ' });

      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);
      const totalRow = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      const rows = await db.all(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
      res.json({ table, total: totalRow?.count ?? 0, rows });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/database/table/:table/row/:id', async (req, res) => {
    try {
      const { table } = req.params;
      if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Tên bảng không hợp lệ' });

      await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Helper: read/write db_history JSON file
  const HISTORY_FILE = path.join(__dirname, '../db_history.json');
  const readHistory = (): any[] => {
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
  };
  const appendHistory = (entry: object) => {
    const list = readHistory();
    list.unshift(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, 200), null, 2));
  };

  router.get('/database/export', async (req: any, res) => {
    try {
      const file = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'Database file not found' });

      // Log export to JSON file (safe across DB replacements)
      appendHistory({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        action: 'export',
        filename: 'database.sqlite',
        performedBy: req.user?.id || 'admin',
        note: 'Xuất toàn bộ database',
        createdAt: new Date().toISOString(),
      });

      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="database.sqlite"');
      fs.createReadStream(file).pipe(res);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/database/import', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file import' });
      const targetPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
      const originalName = (req.file as any).originalname || 'unknown.sqlite';

      // Log to JSON file BEFORE replacing the database (survives DB replacement)
      appendHistory({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        action: 'import',
        filename: originalName,
        performedBy: req.user?.id || 'admin',
        note: 'Nhập database từ file ' + originalName,
        createdAt: new Date().toISOString(),
      });

      // Close database connection to release file lock on Windows
      if (db && typeof db.close === 'function') {
        await db.close();
      }

      await fs.promises.copyFile(req.file.path, targetPath);
      await fs.promises.unlink(req.file.path).catch(() => { });

      res.json({ success: true, message: 'Import thành công. Hệ thống đang khởi động lại, trang sẽ tự làm mới sau 10 giây...' });

      // Force restart: touch server.ts for tsx/nodemon, and exit process for PM2
      setTimeout(() => {
        try {
          const now = new Date();
          fs.utimesSync(path.join(__dirname, '../server.ts'), now, now);
        } catch(e) {}
        setTimeout(() => { process.exit(0); }, 500);
      }, 1000);
    } catch (e: any) {
      res.status(500).json({ error: 'Import thất bại: ' + e.message });
    }
  });

  // --- DB History (stored in JSON file, survives database replacement) ---
  router.get('/database/history', async (_req, res) => {
    try {
      res.json(readHistory());
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- SMTP Config ---
  router.get('/system-config/smtp', async (_req, res) => {
    try {
      const smtp = await mailer.getSystemConfig();
      res.json({ 
        IMAP_HOST: smtp.IMAP_HOST, IMAP_PORT: smtp.IMAP_PORT,
        SMTP_HOST: smtp.SMTP_HOST, SMTP_PORT: smtp.SMTP_PORT, 
        SMTP_SECURE: smtp.SMTP_SECURE, SMTP_USER: smtp.SMTP_USER, 
        SMTP_PASS: smtp.SMTP_PASS ? '********' : '', SMTP_FROM: smtp.SMTP_FROM 
      });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/smtp', async (req, res) => {
    try {
      const { IMAP_HOST, IMAP_PORT, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = req.body;
      const entries: [string, string][] = [
        ['IMAP_HOST', IMAP_HOST || ''], ['IMAP_PORT', String(IMAP_PORT || '993')],
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
      const reportStatusBreakdown = await db.all('SELECT status, COUNT(*) as count FROM reports GROUP BY status');
      
      const logsCountResult = await db.get('SELECT COUNT(*) as count FROM activity_logs');
      const emailsCountResult = await db.get('SELECT COUNT(*) as count FROM scheduled_emails');
      const sentEmailsCountResult = await db.get('SELECT COUNT(*) as count FROM mail_tracking');
      const resetRequestsCountResult = await db.get('SELECT COUNT(*) as count FROM password_reset_requests WHERE status="pending"');
      let dbSize = 0;
      try {
        const dbPath = path.resolve(process.env.DB_PATH || 'database.sqlite');
        if (fs.existsSync(dbPath)) {
          dbSize = fs.statSync(dbPath).size;
        }
      } catch (e) {}

      const systemInfo = {
        nodeVersion: process.version,
        platform: os.platform(),
        memoryUsage: process.memoryUsage().rss,
        uptime: process.uptime(),
        dbSize
      };

      res.json({ 
        totalUsers: userCountDesc.count, totalTasks: taskCountDesc.count, 
        totalReports: reportCountDesc.count, activeMeetings: meetingCountDesc.count, 
        totalLogs: logsCountResult ? logsCountResult.count : 0,
        scheduledEmails: emailsCountResult ? emailsCountResult.count : 0,
        sentEmails: sentEmailsCountResult ? sentEmailsCountResult.count : 0,
        pendingResets: resetRequestsCountResult ? resetRequestsCountResult.count : 0,
        roleBreakdown, taskStatusBreakdown, taskDeptBreakdown, reportStatusBreakdown,
        systemInfo
      });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch admin stats' }); }
  });

  // --- Detailed Logs & Emails ---
  router.get('/activity-logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await db.all('SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?', [limit]);
      res.json(logs);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch logs' }); }
  });

  router.get('/scheduled-emails', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const emails = await db.all('SELECT * FROM scheduled_emails ORDER BY scheduledAt ASC LIMIT ?', [limit]);
      res.json(emails);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch emails' }); }
  });

  return router;
}
