import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { initDb } from './db.js';
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

import { initSocket } from './socket.js';

import { scheduleFridayReminder } from './schedulers/fridayReminder.js';
import { scheduleNoteReminders } from './schedulers/noteReminder.js';
import { scheduleDailyTaskReminder } from './schedulers/dailyTaskReminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3000;
  const prisma = new PrismaClient();

  // Khởi tạo Socket.io
  initSocket(httpServer);

  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
  }));
  app.use(express.json());

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests from this IP' }
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts from this IP' }
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', loginLimiter);

  // Database
  const db = await initDb();

  // Email helpers
  const mailer = createMailer(db);

  // ===== ROUTES =====
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  app.use('/api/users', userRoutes(db, mailer));
  app.use('/api/tasks', taskRoutes(prisma, db));
  app.use('/api/notes', noteRoutes(db));
  app.use('/api/meetings', meetingRoutes(prisma, db));
  app.use('/api/reports', reportRoutes(prisma, db));
  app.use('/api/roles', roleRoutes(db));
  app.use('/api/departments', departmentRoutes(db));
  app.use('/api/notifications', notificationRoutes(db));
  app.use('/api/admin', adminRoutes(db, mailer));
  app.use('/api/events', eventRoutes(db));
  app.use('/api/activity', activityRoutes(prisma));

  // ===== SCHEDULERS =====
  scheduleFridayReminder(db);
  scheduleNoteReminders(db);
  scheduleDailyTaskReminder(db);

  // ===== STATIC FRONTEND =====
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
