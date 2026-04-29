import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

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

import { scheduleFridayReminder } from './schedulers/fridayReminder.js';
import { scheduleNoteReminders } from './schedulers/noteReminder.js';
import { scheduleDailyTaskReminder } from './schedulers/dailyTaskReminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const prisma = new PrismaClient();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Database
  const db = await initDb();

  // Email helpers
  const mailer = createMailer(db);

  // ===== ROUTES =====
  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  app.use('/api/users', userRoutes(db, mailer));
  app.use('/api/tasks', taskRoutes(prisma));
  app.use('/api/notes', noteRoutes(db));
  app.use('/api/meetings', meetingRoutes(prisma, db));
  app.use('/api/reports', reportRoutes(prisma));
  app.use('/api/roles', roleRoutes(db));
  app.use('/api/departments', departmentRoutes(db));
  app.use('/api/notifications', notificationRoutes(db));
  app.use('/api/admin', adminRoutes(db, mailer));

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

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
