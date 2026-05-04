import 'dotenv/config'; // Trigger restart
import express from 'express';
import crypto from 'crypto';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { initDb } from './db.js';
import { initDbPostgres } from './db_pg.js';
import { createMailer } from './mailer.js';

import { authRoutes, forgotPasswordRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { taskRoutes } from './routes/tasks.js';
import { noteRoutes } from './routes/notes.js';
import { meetingRoutes } from './routes/meetings.js';
import { reportRoutes } from './routes/reports.js';
import { roleRoutes } from './routes/roles.js';
import { departmentRoutes } from './routes/departments.js';
import { notificationRoutes } from './routes/notifications.js';
import { adminRoutes } from './routes/admin.js';
import { eventRoutes } from './routes/events.js';
import { activityRoutes } from './routes/activity.js';
import { mailRoutes } from './routes/mail.js';
import { uploadRoutes } from './routes/upload.js';
import { contractRoutes } from './routes/contracts.js';
import { revenueRoutes } from './routes/revenue.js';
import { clientRoutes } from './routes/clients.js';
import { productRoutes } from './routes/products.js';

import { initSocket } from './socket.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';

import { scheduleFridayReminder } from './schedulers/fridayReminder.js';
import { scheduleNoteReminders } from './schedulers/noteReminder.js';
import { scheduleDailyTaskReminder } from './schedulers/dailyTaskReminder.js';
import { initMailScheduler } from './schedulers/mailScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️ CẢNH BÁO: JWT_SECRET không có trong .env. Đã tự động tạo một khóa ngẫu nhiên cho phiên này.');
  }

  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  initSocket(httpServer);

  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: { error: 'Too many requests from this IP' },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts from this IP' },
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', loginLimiter);

  // PostgreSQL only when DATABASE_URL starts with postgres:// or postgresql://
  const isPg = /^postgre(s|sql):\/\//i.test(process.env.DATABASE_URL || '');
  const db = isPg ? await initDbPostgres() : await initDb();

  const mailer = createMailer(db);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  app.use('/api/users', userRoutes(db, mailer));
  app.use('/api/tasks', taskRoutes(null, db));
  app.use('/api/notes', noteRoutes(db));
  app.use('/api/meetings', meetingRoutes(null, db));
  app.use('/api/reports', requireAuth, reportRoutes(null, db));
  app.use('/api/roles', roleRoutes(db));
  app.use('/api/departments', departmentRoutes(db));
  app.use('/api/notifications', notificationRoutes(db));
  app.use('/api/admin', requireAuth, requireAdmin, adminRoutes(db, mailer));
  app.use('/api/events', eventRoutes(db));
  app.use('/api/activity', activityRoutes(null, db));
  app.use('/api/mail', mailRoutes(db));
  app.use('/api/contracts', requireAuth, contractRoutes(null, db));
  app.use('/api/revenue-reports', requireAuth, revenueRoutes(null, db));
  app.use('/api/clients', requireAuth, clientRoutes(db));
  app.use('/api/products', requireAuth, productRoutes(db));

  scheduleFridayReminder(db);
  scheduleNoteReminders(db);
  scheduleDailyTaskReminder(db);
  initMailScheduler(db);

  app.use('/api/upload', requireAuth, uploadRoutes());

  // Serve uploaded files
  const uploadsPath = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsPath));

  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
