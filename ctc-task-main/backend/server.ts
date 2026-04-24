import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const upload = multer({ dest: path.join(__dirname, '../tmp') });
  const prisma = new PrismaClient();

  const generateRandomPassword = (length = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const getSystemConfig = async () => {
    const rows = await db.all('SELECT key, value FROM system_config');
    const config = Object.fromEntries(rows.map((row: any) => [row.key, row.value]));
    return {
      SMTP_HOST: config.SMTP_HOST || process.env.SMTP_HOST || '',
      SMTP_PORT: config.SMTP_PORT || process.env.SMTP_PORT || '587',
      SMTP_SECURE: config.SMTP_SECURE || process.env.SMTP_SECURE || 'false',
      SMTP_USER: config.SMTP_USER || process.env.SMTP_USER || '',
      SMTP_PASS: config.SMTP_PASS || process.env.SMTP_PASS || '',
      SMTP_FROM: config.SMTP_FROM || process.env.SMTP_FROM || '',
    };
  };

  const createTransporter = async () => {
    const smtp = await getSystemConfig();
    const smtpConfigured = Boolean(smtp.SMTP_HOST && smtp.SMTP_USER && smtp.SMTP_PASS && smtp.SMTP_FROM);
    if (!smtpConfigured) return { transporter: null, smtp };

    const transporter = nodemailer.createTransport({
      host: smtp.SMTP_HOST,
      port: Number(smtp.SMTP_PORT || 587),
      secure: String(smtp.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: smtp.SMTP_USER,
        pass: smtp.SMTP_PASS,
      },
    });

    return { transporter, smtp };
  };

  const sendResetPasswordEmail = async (to: string, newPassword: string) => {
    const { transporter, smtp } = await createTransporter();
    if (!transporter) {
      console.warn('SMTP is not configured, skipping password reset email for', to);
      return false;
    }

    await transporter.sendMail({
      from: smtp.SMTP_FROM,
      replyTo: smtp.SMTP_FROM,
      to,
      subject: 'CTC Task - Cấp lại mật khẩu',
      text: `Xin chào,\n\nMật khẩu đăng nhập mới của bạn là: ${newPassword}\n\nVui lòng đăng nhập và đổi lại mật khẩu ngay.\n\nTrân trọng,\nCTC Task`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <div style="max-width:560px;margin:0 auto;padding:24px">
          <div style="padding:18px 20px;border-radius:16px 16px 0 0;background:#111827;color:#fff;text-align:center;font-weight:800;font-size:20px">CTC Task</div>
          <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px">
            <p style="margin:0 0 12px">Xin chào,</p>
            <p style="margin:0 0 16px">Mật khẩu đăng nhập mới của bạn là:</p>
            <div style="display:inline-block;padding:12px 16px;background:#f3f4f6;border-radius:12px;font-size:20px;font-weight:800;letter-spacing:1px">${newPassword}</div>
            <p style="margin:16px 0 0">Vui lòng đăng nhập và đổi lại mật khẩu ngay sau khi vào hệ thống.</p>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px">Trân trọng,<br/>CTC Task</p>
          </div>
        </div>
      </div>`,
    });
    return true;
  };

  const sendResetLinkEmail = async (to: string, resetLink: string) => {
    const { transporter, smtp } = await createTransporter();
    if (!transporter) {
      console.warn('SMTP is not configured, skipping reset link email for', to);
      return false;
    }

    await transporter.sendMail({
      from: smtp.SMTP_FROM,
      replyTo: smtp.SMTP_FROM,
      to,
      subject: 'CTC Task - Link đặt lại mật khẩu',
      text: `Xin chào,\n\nBạn vừa yêu cầu đặt lại mật khẩu cho tài khoản CTC Task.\n\nMở link này để đặt lại mật khẩu:\n${resetLink}\n\nLink sẽ hết hạn sau 30 phút.\n\nNếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.\n\nTrân trọng,\nCTC Task`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <div style="max-width:560px;margin:0 auto;padding:24px">
          <div style="padding:18px 20px;border-radius:16px 16px 0 0;background:#111827;color:#fff;text-align:center;font-weight:800;font-size:20px">CTC Task</div>
          <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px">
            <p style="margin:0 0 12px">Xin chào,</p>
            <p style="margin:0 0 16px">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản CTC Task.</p>
            <div style="text-align:center;margin:20px 0">
              <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;font-weight:800">Đặt lại mật khẩu</a>
            </div>
            <div style="padding:12px 14px;background:#f9fafb;border-radius:12px;word-break:break-all;font-size:13px;color:#374151">${resetLink}</div>
            <p style="margin:16px 0 0;color:#b45309;font-weight:700">Link này sẽ hết hạn sau 30 phút.</p>
            <p style="margin:0 0 16px">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px">Trân trọng,<br/>CTC Task</p>
          </div>
        </div>
      </div>`,
    });
    return true;
  };

  app.use(cors());
  app.use(express.json());

  // Initialize SQLite
  const db = await open({
    filename: process.env.DB_PATH || './database.sqlite',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      hostId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      meetingLink TEXT NOT NULL,
      status TEXT NOT NULL,
      participants TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      meetingId TEXT NOT NULL,
      \`from\` TEXT NOT NULL,
      \`to\` TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      avatar TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      startDate TEXT,
      dueDate TEXT,
      estimatedEndAt TEXT,
      priority TEXT,
      status TEXT,
      assignees TEXT,
      tags TEXT,
      createdBy TEXT,
      department TEXT,
      recurrence TEXT,
      subtasks TEXT,
      comments TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      color TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      authorId TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      submittedAt TEXT,
      approvedAt TEXT,
      approvedBy TEXT
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      permissions TEXT NOT NULL DEFAULT '[]',
      isSystem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      managerId TEXT
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      emailStatus TEXT NOT NULL DEFAULT 'unknown',
      emailSentAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      usedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  try {
    await db.exec('ALTER TABLE users ADD COLUMN password TEXT;');
  } catch(e) { /* ignores if column already exists */ }
  try {
    await db.exec("ALTER TABLE password_reset_requests ADD COLUMN emailStatus TEXT NOT NULL DEFAULT 'unknown';");
  } catch(e) { /* ignores if column already exists */ }
  try {
    await db.exec('ALTER TABLE password_reset_requests ADD COLUMN emailSentAt TEXT;');
  } catch(e) { /* ignores if column already exists */ }
  try {
    await db.exec('ALTER TABLE reports ADD COLUMN directorFeedback TEXT;');
  } catch(e) { /* ignores if column already exists */ }
  try {
    await db.exec('ALTER TABLE reports ADD COLUMN managerFeedback TEXT;');
  } catch(e) { /* ignores if column already exists */ }

  // Seed Roles
  const roleCount = await db.get('SELECT COUNT(*) as count FROM roles');
  if (roleCount.count === 0) {
    const INITIAL_ROLES = [
      {
        id: 'role-admin', name: 'Admin', description: 'Toàn quyền hệ thống: quản lý người dùng, xem tất cả dữ liệu, cấu hình hệ thống.',
        color: '#ef4444', permissions: JSON.stringify(['manage_users','view_all_tasks','view_all_reports','manage_meetings','admin_panel']), isSystem: 1
      },
      {
        id: 'role-director', name: 'Director', description: 'Xem toàn bộ báo cáo đã phê duyệt, cung cấp phản hồi Giám đốc. Chỉ xem công việc.',
        color: '#8b5cf6', permissions: JSON.stringify(['view_all_reports','director_feedback','view_all_tasks']), isSystem: 1
      },
      {
        id: 'role-manager', name: 'Manager', description: 'Quản lý nhân viên trong phòng ban, giao việc, duyệt báo cáo phòng ban.',
        color: '#3b82f6', permissions: JSON.stringify(['manage_dept_tasks','approve_dept_reports','view_dept_users']), isSystem: 1
      },
      {
        id: 'role-employee', name: 'Employee', description: 'Xem và thực hiện công việc được giao, tạo báo cáo tuần của bản thân.',
        color: '#10b981', permissions: JSON.stringify(['view_own_tasks','create_report','join_meetings']), isSystem: 1
      },
    ];
    for (const r of INITIAL_ROLES) {
      await db.run(
        'INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.description, r.color, r.permissions, r.isSystem]
      );
    }
  }

  // Seed Departments
  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count === 0) {
    const INITIAL_DEPTS = [
      { id: 'dept-board',     name: 'Board',     description: 'Hội đồng quản trị và ban lãnh đạo công ty.',         color: '#ef4444' },
      { id: 'dept-product',   name: 'Product',   description: 'Phát triển và quản lý sản phẩm.',                      color: '#3b82f6' },
      { id: 'dept-marketing', name: 'Marketing', description: 'Tiếp thị và truyền thông thương hiệu.',              color: '#f59e0b' },
      { id: 'dept-sales',     name: 'Sales',     description: 'Kiến tạo doanh thu và phát triển thị trường.',         color: '#10b981' },
      { id: 'dept-it',        name: 'IT',        description: 'Hạ tầng công nghệ và hệ thống nội bộ.',              color: '#8b5cf6' },
      { id: 'dept-hr',        name: 'HR',        description: 'Nhân sự, tuyển dụng và phát triển văn hoá doanh nghiệp.', color: '#ec4899' },
      { id: 'dept-finance',   name: 'Finance',   description: 'Kế toán, tài chính và kiểm soát ngân sách.',         color: '#14b8a6' },
    ];
    for (const d of INITIAL_DEPTS) {
      await db.run('INSERT INTO departments (id, name, description, color) VALUES (?, ?, ?, ?)',
        [d.id, d.name, d.description, d.color]);
    }
  }

  // Seed Data
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const INITIAL_USERS = [
      { id: 'u1', name: 'Alice Wilson', email: 'alice@ctc.com', password: await bcrypt.hash('123456', 10), role: 'Admin', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u1' },
      { id: 'u2', name: 'Bob Smith', email: 'bob@ctc.com', password: await bcrypt.hash('123456', 10), role: 'Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2' },
      { id: 'u3', name: 'Charlie Davis', email: 'charlie@ctc.com', password: await bcrypt.hash('123456', 10), role: 'Employee', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3' },
      { id: 'u4', name: 'Thái Hưng (Giám đốc)', email: 'director@ctc.com', password: await bcrypt.hash('123456', 10), role: 'Director', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=director' },
    ];
    for (const u of INITIAL_USERS) {
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.name, u.email, u.password, u.role, u.department, u.avatar]);
    }
  }

  const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks');
  if (taskCount.count === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const INITIAL_TASKS = [
      {
        id: 't1', title: 'Design System Review', description: 'Review the new color palette and component library compatibility.',
        startDate: todayStr, estimatedEndAt: new Date(new Date().setHours(17, 0, 0, 0)).toISOString().slice(0, 16),
        priority: 'High', status: 'In Progress', assignees: '["u1", "u2"]', tags: '["Design", "UI/UX"]',
        createdBy: 'u1', department: 'Board', recurrence: 'None', subtasks: '[{"id":"st1","title":"Check color contrast ratios","isCompleted":true}]', comments: '[]'
      }
    ];
    for (const t of INITIAL_TASKS) {
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, estimatedEndAt, priority, status, assignees, tags, createdBy, department, recurrence, subtasks, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.title, t.description, t.startDate, t.estimatedEndAt || null, t.priority, t.status, t.assignees, t.tags, t.createdBy, t.department, t.recurrence, t.subtasks, t.comments]
      );
    }
  }

  const noteCount = await db.get('SELECT COUNT(*) as count FROM notes');
  if (noteCount.count === 0) {
    const INITIAL_NOTES = [
      { id: 'n1', title: 'Brainstorming Ideas', content: '- New UI looks great\\n- Need to check contrast ratio', color: 'bg-yellow-100', createdAt: new Date().toISOString() }
    ];
    for (const n of INITIAL_NOTES) {
      await db.run('INSERT INTO notes (id, title, content, color, createdAt) VALUES (?, ?, ?, ?, ?)', [n.id, n.title, n.content, n.color, n.createdAt]);
    }
  }


  // --- Users API ---
  app.get('/api/users', async (req, res) => {
    try {
      const users = await prisma.users.findMany();
      const roles = await prisma.roles.findMany();
      res.json(users.map(u => {
        const role = roles.find(r => r.name === u.role);
        return { ...u, permissions: role?.permissions ? JSON.parse(role.permissions) : [] };
      }));
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.post('/api/users', async (req, res) => {
    const { id, name, email, password, role, department, avatar } = req.body;
    try {
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      await prisma.users.create({
        data: { id, name, email, password: hashedPassword, role, department, avatar }
      });
      res.json({ id });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.put('/api/users/:id', async (req, res) => {
    const { name, email, password, role, department, avatar } = req.body;
    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.users.update({
          where: { id: req.params.id },
          data: { name, email, password: hashedPassword, role, department, avatar }
        });
      } else {
        await prisma.users.update({
          where: { id: req.params.id },
          data: { name, email, role, department, avatar }
        });
      }
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.delete('/api/users/:id', async (req, res) => {
    try {
      await prisma.users.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
      if (!user || !user.password || !password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const role = await db.get('SELECT permissions FROM roles WHERE name = ?', [user.role]);
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        permissions: role?.permissions ? JSON.parse(role.permissions) : [],
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, password FROM users WHERE id = ?', [userId]);
      if (!user || !user.password) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword || '', user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
      return res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/users/:id/reset-password', async (req, res) => {
    const { newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [req.params.id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const finalPassword = newPassword && String(newPassword).trim().length >= 6
        ? String(newPassword).trim()
        : generateRandomPassword(8);

      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
      await db.run("UPDATE password_reset_requests SET status = 'resolved' WHERE userId = ? AND status = 'pending'", [req.params.id]);

      const emailSent = await sendResetPasswordEmail(user.email, finalPassword);
      return res.json({ success: true, emailSent, generatedPassword: finalPassword });
    } catch (e) {
      console.error('reset-password error', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await db.get('SELECT id, email FROM users WHERE lower(email) = lower(?)', [email]);
      if (!user) {
        return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
      }

      const recentPending = await db.get(
        "SELECT id, createdAt FROM password_reset_requests WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1",
        [user.id]
      );
      if (recentPending) {
        const elapsed = Date.now() - new Date(recentPending.createdAt).getTime();
        if (elapsed < 10 * 60 * 1000) {
          return res.status(429).json({ error: 'Bạn vừa yêu cầu gần đây. Vui lòng đợi vài phút rồi thử lại.' });
        }
      }

      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const appBaseUrl = process.env.APP_BASE_URL || 'https://ai.hieuhomecloud.online';
      const resetLink = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await db.run('DELETE FROM password_reset_tokens WHERE userId = ? AND usedAt IS NULL', [user.id]);
      await db.run(
        'INSERT INTO password_reset_tokens (id, userId, email, token, expiresAt, usedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), user.id, user.email, token, expiresAt, null]
      );

      if (recentPending) {
        await db.run(
          'UPDATE password_reset_requests SET email = ?, emailStatus = ?, emailSentAt = ?, createdAt = ? WHERE id = ?',
          [user.email, 'pending', null, new Date().toISOString(), recentPending.id]
        );
      } else {
        await db.run(
          "INSERT INTO password_reset_requests (id, userId, email, status, emailStatus, emailSentAt, createdAt) VALUES (?, ?, ?, 'pending', 'pending', NULL, ?)",
          [crypto.randomUUID(), user.id, user.email, new Date().toISOString()]
        );
      }

      let emailSent = false;
      let message = 'Đã tạo link đặt lại mật khẩu.';
      try {
        emailSent = await sendResetLinkEmail(user.email, resetLink);
        if (emailSent) {
          message = 'Đã gửi link đặt lại mật khẩu qua email.';
        } else {
          message = 'Đã tạo link đặt lại mật khẩu nhưng chưa gửi được email.';
        }
      } catch (mailError: any) {
        console.error('forgot-password mail error', mailError);
        message = mailError?.message || 'Đã tạo link đặt lại mật khẩu nhưng gửi email thất bại.';
      }

      await db.run("UPDATE password_reset_requests SET emailStatus = ?, emailSentAt = ? WHERE userId = ? AND status = 'pending'", [emailSent ? 'sent' : 'failed', emailSent ? new Date().toISOString() : null, user.id]);
      return res.json({ success: true, emailSent, message, resetLink, expiresAt });
    } catch (e) {
      console.error('forgot-password error', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/auth/reset-password/:token', async (req, res) => {
    try {
      const resetToken = await db.get(
        'SELECT userId, email, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?',
        [req.params.token]
      );
      if (!resetToken) {
        return res.status(404).json({ error: 'Link đặt lại mật khẩu không tồn tại' });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ error: 'Link này đã được sử dụng' });
      }
      if (new Date(resetToken.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Link đặt lại mật khẩu đã hết hạn' });
      }
      return res.json({ success: true, email: resetToken.email });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      if (!newPassword || String(newPassword).trim().length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }

      const resetToken = await db.get(
        'SELECT userId, email, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?',
        [token]
      );
      if (!resetToken) {
        return res.status(404).json({ error: 'Link đặt lại mật khẩu không tồn tại' });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ error: 'Link này đã được sử dụng' });
      }
      if (new Date(resetToken.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Link đặt lại mật khẩu đã hết hạn' });
      }

      const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetToken.userId]);
      const now = new Date().toISOString();
      await db.run('UPDATE password_reset_tokens SET usedAt = ? WHERE token = ?', [now, token]);
      await db.run("UPDATE password_reset_requests SET status = 'resolved', emailStatus = 'reset_done', emailSentAt = COALESCE(emailSentAt, ?) WHERE userId = ? AND status = 'pending'", [now, resetToken.userId]);

      return res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/admin/password-reset-requests', async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || '') === '1';
      const requests = includeResolved
        ? await db.all("SELECT * FROM password_reset_requests ORDER BY createdAt DESC")
        : await db.all("SELECT * FROM password_reset_requests WHERE status = 'pending' ORDER BY createdAt DESC");
      res.json(requests);
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/admin/password-reset-requests/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM password_reset_tokens WHERE userId = (SELECT userId FROM password_reset_requests WHERE id = ?) ', [req.params.id]);
      await db.run('DELETE FROM password_reset_requests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/admin/database/tables', async (req, res) => {
    try {
      const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`);
      const data = [] as { name: string; count: number | null }[];
      for (const table of tables) {
        try {
          const row = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
          data.push({ name: table.name, count: row?.count ?? 0 });
        } catch {
          data.push({ name: table.name, count: null });
        }
      }
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/admin/database/table/:table', async (req, res) => {
    try {
      const { table } = req.params;
      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);
      const totalRow = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      const rows = await db.all(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
      res.json({ table, total: totalRow?.count ?? 0, rows });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/admin/database/table/:table/row/:id', async (req, res) => {
    try {
      const { table, id } = req.params;
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/admin/database/export', async (req, res) => {
    try {
      const file = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
      if (!fs.existsSync(file)) {
        return res.status(404).json({ error: 'Database file not found' });
      }
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="database.sqlite"');
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/admin/database/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file import' });
      const sourcePath = req.file.path;
      const targetPath = process.env.DB_PATH || './database.sqlite';
      await fs.promises.copyFile(sourcePath, targetPath);
      await fs.promises.unlink(sourcePath).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Import thất bại' });
    }
  });


  app.get('/api/admin/system-config/smtp', async (req, res) => {
    try {
      const smtp = await getSystemConfig();
      res.json({
        SMTP_HOST: smtp.SMTP_HOST,
        SMTP_PORT: smtp.SMTP_PORT,
        SMTP_SECURE: smtp.SMTP_SECURE,
        SMTP_USER: smtp.SMTP_USER,
        SMTP_PASS: smtp.SMTP_PASS ? '********' : '',
        SMTP_FROM: smtp.SMTP_FROM,
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/admin/system-config/smtp', async (req, res) => {
    try {
      const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = req.body;
      const entries = [
        ['SMTP_HOST', SMTP_HOST || ''],
        ['SMTP_PORT', String(SMTP_PORT || '587')],
        ['SMTP_SECURE', String(SMTP_SECURE || 'false')],
        ['SMTP_USER', SMTP_USER || ''],
        ['SMTP_FROM', SMTP_FROM || ''],
      ];

      if (SMTP_PASS && SMTP_PASS !== '********') {
        entries.push(['SMTP_PASS', SMTP_PASS]);
      }

      for (const [key, value] of entries) {
        await db.run(
          'INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          [key, value]
        );
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/admin/system-config/smtp/test', async (req, res) => {
    try {
      const { testEmail } = req.body;
      const { transporter, smtp } = await createTransporter();
      if (!transporter) {
        return res.status(400).json({ error: 'SMTP chưa được cấu hình đầy đủ' });
      }
      await transporter.sendMail({
        from: smtp.SMTP_FROM,
        to: testEmail || smtp.SMTP_USER,
        subject: 'CTC Task - Test cấu hình SMTP',
        text: 'Chúc mừng, cấu hình SMTP của anh đã hoạt động.',
        html: '<div style="font-family:Arial,sans-serif"><h3>CTC Task</h3><p>Chúc mừng, cấu hình SMTP của anh đã hoạt động.</p></div>',
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error('smtp test failed', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // --- Notes API ---
  app.get('/api/notes', async (req, res) => {
    try {
      const notes = await prisma.notes.findMany();
      res.json(notes);
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.post('/api/notes', async (req, res) => {
    const { id, title, content, color, createdAt } = req.body;
    try {
      await prisma.notes.create({
        data: { id, title, content, color, createdAt }
      });
      res.json({ id });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.put('/api/notes/:id', async (req, res) => {
    const { title, content, color } = req.body;
    try {
      await prisma.notes.update({
        where: { id: req.params.id },
        data: { title, content, color }
      });
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.delete('/api/notes/:id', async (req, res) => {
    try {
      await prisma.notes.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  // --- Tasks API ---
  app.get('/api/tasks', async (req, res) => {
    try {
      const allTasks = await prisma.tasks.findMany();
      res.json(allTasks.map(t => ({
        ...t,
        assignees: t.assignees ? JSON.parse(t.assignees) : [],
        tags: t.tags ? JSON.parse(t.tags) : [],
        subtasks: t.subtasks ? JSON.parse(t.subtasks) : [],
        comments: t.comments ? JSON.parse(t.comments) : []
      })));
    } catch(e) { res.status(500).json({error: 'Failed to fetch tasks'}); }
  });
  app.post('/api/tasks', async (req, res) => {
    const t = req.body;
    try {
      await prisma.tasks.create({
        data: {
          id: t.id,
          title: t.title,
          description: t.description,
          startDate: t.startDate,
          dueDate: t.dueDate,
          estimatedEndAt: t.estimatedEndAt,
          priority: t.priority,
          status: t.status,
          assignees: JSON.stringify(t.assignees || []),
          tags: JSON.stringify(t.tags || []),
          createdBy: t.createdBy,
          department: t.department,
          recurrence: t.recurrence,
          subtasks: JSON.stringify(t.subtasks || []),
          comments: JSON.stringify(t.comments || [])
        }
      });
      res.json({ id: t.id });
    } catch(e) { res.status(500).json({error: 'Failed task create'}); }
  });
  app.put('/api/tasks/:id', async (req, res) => {
    const t = req.body;
    try {
      await prisma.tasks.update({
        where: { id: req.params.id },
        data: {
          title: t.title,
          description: t.description,
          startDate: t.startDate,
          dueDate: t.dueDate,
          estimatedEndAt: t.estimatedEndAt,
          priority: t.priority,
          status: t.status,
          assignees: JSON.stringify(t.assignees || []),
          tags: JSON.stringify(t.tags || []),
          department: t.department,
          recurrence: t.recurrence,
          subtasks: JSON.stringify(t.subtasks || []),
          comments: JSON.stringify(t.comments || [])
        }  
      });
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed task update'}); }
  });
  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      await prisma.tasks.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  // --- Meetings & Signals (Existing) ---
  app.get('/api/meetings', async (req, res) => {
    try {
      const meetings = await prisma.meetings.findMany();
      res.json(meetings.map(m => ({ ...m, participants: JSON.parse(m.participants) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.get('/api/meetings/:id', async (req, res) => {
    try {
      const m = await prisma.meetings.findUnique({ where: { id: req.params.id } });
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.json({ ...m, participants: JSON.parse(m.participants) });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/meetings', async (req, res) => {
    const { id, title, description, hostId, startTime, endTime, meetingLink, status, participants } = req.body;
    try {
      await prisma.meetings.create({
        data: { id, title, description, hostId, startTime, endTime, meetingLink, status, participants: JSON.stringify(participants) }
      });
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      await prisma.meetings.update({
        where: { id },
        data: { title, description, status, participants: JSON.stringify(participants), startTime, endTime }
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id/join', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
      const meeting = await prisma.meetings.findUnique({ where: { id } });
      if (meeting) {
        const participants = JSON.parse(meeting.participants);
        if (!participants.includes(userId)) {
          participants.push(userId);
          await prisma.meetings.update({
            where: { id },
            data: { participants: JSON.stringify(participants) }
          });
        }
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id/leave', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
      const meeting = await prisma.meetings.findUnique({ where: { id } });
      if (meeting) {
        const participants = JSON.parse(meeting.participants);
        const updated = participants.filter((p: string) => p !== userId);
        await prisma.meetings.update({
          where: { id },
          data: { participants: JSON.stringify(updated) }
        });
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.delete('/api/meetings/:id', async (req, res) => {
    try {
      await prisma.meetings.delete({ where: { id: req.params.id } });
      await prisma.signals.deleteMany({ where: { meetingId: req.params.id } });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Signals API
  app.get('/api/meetings/:meetingId/signals', async (req, res) => {
    const { meetingId } = req.params;
    const { since } = req.query;
    try {
      const signals = await db.all('SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC', [meetingId, since || 0]);
      res.json(signals.map(s => ({ ...s, data: JSON.parse(s.data) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/meetings/:meetingId/signals', async (req, res) => {
    const { meetingId } = req.params;
    const { id, from, to, type, data } = req.body;
    try {
      const timestamp = Date.now();
      await db.run('INSERT INTO signals (id, meetingId, `from`, `to`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, meetingId, from, to, type, JSON.stringify(data), timestamp]);
      res.status(201).json({ id, timestamp });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- Roles API ---
  app.get('/api/roles', async (req, res) => {
    try {
      const roles = await prisma.roles.findMany({ orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
      const result = await Promise.all(roles.map(async (r) => {
        const count = await prisma.users.count({ where: { role: r.name } });
        return { ...r, permissions: JSON.parse(r.permissions || '[]'), userCount: count };
      }));
      res.json(result);
    } catch(e) { res.status(500).json({ error: 'Failed to fetch roles' }); }
  });

  app.post('/api/roles', async (req, res) => {
    const { id, name, description, color, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    try {
      const newId = id || `role-${Date.now()}`;
      await prisma.roles.create({
        data: { id: newId, name: name.trim(), description: description || '', color: color || '#6366f1', permissions: JSON.stringify(permissions || []), isSystem: 0 }
      });
      res.status(201).json({ id: newId });
    } catch(e: any) {
      if (String(e.code) === 'P2002' || e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  app.put('/api/roles/:id', async (req, res) => {
    const { name, description, color, permissions } = req.body;
    try {
      const existing = await prisma.roles.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (existing.isSystem) {
        await prisma.roles.update({
          where: { id: req.params.id },
          data: { description: description ?? existing.description, color: color ?? existing.color }
        });
      } else {
        await prisma.roles.update({
          where: { id: req.params.id },
          data: { 
            name: name ?? existing.name, 
            description: description ?? existing.description, 
            color: color ?? existing.color, 
            permissions: JSON.stringify(permissions ?? JSON.parse(existing.permissions || '[]'))
          }
        });
      }
      res.json({ success: true });
    } catch(e: any) {
      if (String(e.code) === 'P2002' || e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  app.delete('/api/roles/:id', async (req, res) => {
    try {
      const role = await prisma.roles.findUnique({ where: { id: req.params.id } });
      if (!role) return res.status(404).json({ error: 'Not found' });
      if (role.isSystem) return res.status(403).json({ error: 'Không thể xóa vai trò hệ thống' });
      const count = await prisma.users.count({ where: { role: role.name } });
      if (count > 0) return res.status(409).json({ error: `Đang có ${count} người dùng với vai trò này` });
      await prisma.roles.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed to delete role' }); }
  });

  // --- Departments API ---
  app.get('/api/departments', async (req, res) => {
    try {
      const depts = await prisma.departments.findMany({ orderBy: { name: 'asc' } });
      const result = await Promise.all(depts.map(async (d) => {
        const userCount = await prisma.users.count({ where: { department: d.name } });
        const taskCount = await prisma.tasks.count({ where: { department: d.name } });
        const manager = d.managerId ? await prisma.users.findUnique({ where: { id: d.managerId }, select: { id: true, name: true, avatar: true } }) : null;
        return { ...d, userCount, taskCount, manager };
      }));
      res.json(result);
    } catch(e) { res.status(500).json({ error: 'Failed to fetch departments' }); }
  });

  app.post('/api/departments', async (req, res) => {
    const { id, name, description, color, managerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên phòng ban không được trống' });
    try {
      const newId = id || `dept-${Date.now()}`;
      await prisma.departments.create({
        data: { id: newId, name: name.trim(), description: description || '', color: color || '#6366f1', managerId: managerId || null }
      });
      res.status(201).json({ id: newId });
    } catch(e: any) {
      if (String(e.code) === 'P2002' || e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  app.put('/api/departments/:id', async (req, res) => {
    const { name, description, color, managerId } = req.body;
    try {
      const existing = await prisma.departments.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const oldName = existing.name;
      const newName = name?.trim() ?? oldName;
      await prisma.departments.update({
        where: { id: req.params.id },
        data: { name: newName, description: description ?? existing.description, color: color ?? existing.color, managerId: managerId ?? existing.managerId }
      });
      // Update users and tasks if name changed
      if (newName !== oldName) {
        await prisma.users.updateMany({ where: { department: oldName }, data: { department: newName } });
        await prisma.tasks.updateMany({ where: { department: oldName }, data: { department: newName } });
      }
      res.json({ success: true });
    } catch(e: any) {
      if (String(e.code) === 'P2002' || e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  app.delete('/api/departments/:id', async (req, res) => {
    try {
      const dept = await prisma.departments.findUnique({ where: { id: req.params.id } });
      if (!dept) return res.status(404).json({ error: 'Not found' });
      const count = await prisma.users.count({ where: { department: dept.name } });
      if (count > 0) return res.status(409).json({ error: `Đang có ${count} nhân viên trong phòng ban này` });
      await prisma.departments.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed to delete department' }); }
  });

  // --- Admin Analytics API ---
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const userCount = await prisma.users.count();
      const taskCount = await prisma.tasks.count();
      const reportCount = await prisma.reports.count();
      const activeMeetings = await prisma.meetings.count({ where: { status: { not: 'ended' } } });
      
      const roleBreakdown = await prisma.users.groupBy({ by: ['role'], _count: { role: true } });
      const taskStatusBreakdown = await prisma.tasks.groupBy({ by: ['status'], _count: { status: true } });
      const taskDeptBreakdown = await prisma.tasks.groupBy({ by: ['department'], _count: { department: true } });
      
      res.json({
        totalUsers: userCount,
        totalTasks: taskCount,
        totalReports: reportCount,
        activeMeetings: activeMeetings,
        roleBreakdown: roleBreakdown.map(r => ({ role: r.role, count: r._count.role })),
        taskStatusBreakdown: taskStatusBreakdown.map(t => ({ status: t.status, count: t._count.status })),
        taskDeptBreakdown: taskDeptBreakdown.map(t => ({ department: t.department, count: t._count.department }))
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  // --- Reports API ---
  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await prisma.reports.findMany();
      res.json(reports);
    } catch(e) { res.status(500).json({error: 'Failed to fetch reports'}); }
  });

  app.post('/api/reports', async (req, res) => {
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      await prisma.reports.create({
        data: { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback }
      });
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  app.put('/api/reports/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    try {
      await prisma.reports.update({
        where: { id: req.params.id },
        data: { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback }
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update report' }); }
  });

  app.delete('/api/reports/:id', async (req, res) => {
    try {
      await prisma.reports.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete report' }); }
  });

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
