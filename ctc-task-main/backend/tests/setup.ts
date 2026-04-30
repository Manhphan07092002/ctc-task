import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import express from 'express';
import { authRoutes } from '../routes/auth.js';
import { taskRoutes } from '../routes/tasks.js';
import { meetingRoutes } from '../routes/meetings.js';
import { reportRoutes } from '../routes/reports.js';
import { activityRoutes } from '../routes/activity.js';

export async function createTestDb() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      password TEXT, role TEXT NOT NULL, department TEXT NOT NULL, avatar TEXT NOT NULL
    );
    CREATE TABLE roles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1', permissions TEXT NOT NULL DEFAULT '[]',
      isSystem INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      startDate TEXT, dueDate TEXT, estimatedEndAt TEXT, priority TEXT, status TEXT,
      createdBy TEXT, department TEXT, recurrence TEXT
    );
    CREATE TABLE task_assignees (taskId TEXT NOT NULL, userId TEXT NOT NULL, PRIMARY KEY (taskId, userId));
    CREATE TABLE task_tags (taskId TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (taskId, tag));
    CREATE TABLE task_subtasks (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, title TEXT NOT NULL,
      isCompleted INTEGER NOT NULL DEFAULT 0, sortOrder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE task_comments (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, userId TEXT NOT NULL,
      content TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE activity_logs (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, action TEXT NOT NULL,
      entityId TEXT, entityType TEXT, metadata TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, relatedId TEXT,
      isRead INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
    );
    CREATE TABLE password_reset_tokens (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE, expiresAt TEXT NOT NULL, usedAt TEXT
    );
    CREATE TABLE password_reset_requests (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', emailStatus TEXT NOT NULL DEFAULT 'unknown',
      emailSentAt TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE meetings (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      hostId TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL,
      meetingLink TEXT NOT NULL, status TEXT NOT NULL, participants TEXT NOT NULL
    );
    CREATE TABLE meeting_participants (
      meetingId TEXT NOT NULL, userId TEXT NOT NULL,
      PRIMARY KEY (meetingId, userId)
    );
    CREATE TABLE signals (
      id TEXT PRIMARY KEY, meetingId TEXT NOT NULL,
      \`from\` TEXT NOT NULL, \`to\` TEXT NOT NULL,
      type TEXT NOT NULL, data TEXT NOT NULL, timestamp INTEGER NOT NULL
    );
    CREATE TABLE reports (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
      authorId TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL,
      createdAt TEXT NOT NULL, submittedAt TEXT, approvedAt TEXT,
      approvedBy TEXT, directorFeedback TEXT, managerFeedback TEXT
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
      color TEXT, managerId TEXT
    );
  `);

  const hashed = await bcrypt.hash('password123', 10);
  await db.run(
    'INSERT INTO users (id, name, email, password, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['u-test', 'Test User', 'test@example.com', hashed, 'Employee', 'IT', 'https://example.com/avatar.jpg'],
  );
  await db.run(
    'INSERT INTO roles (id, name, permissions, isSystem) VALUES (?, ?, ?, ?)',
    ['r-employee', 'Employee', JSON.stringify(['view_own_tasks', 'create_report']), 1],
  );

  return db;
}

export function createTestApp(db: any) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes(db));
  app.use('/api/tasks', taskRoutes(null, db));
  app.use('/api/meetings', meetingRoutes(null, db));
  app.use('/api/reports', reportRoutes(null, db));
  app.use('/api/activity', activityRoutes(null, db));
  return app;
}
