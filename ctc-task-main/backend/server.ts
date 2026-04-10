import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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
  `);

  try {
    await db.exec('ALTER TABLE reports ADD COLUMN directorFeedback TEXT;');
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
      { id: 'u1', name: 'Alice Wilson', email: 'alice@ctc.com', role: 'Admin', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u1' },
      { id: 'u2', name: 'Bob Smith', email: 'bob@ctc.com', role: 'Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2' },
      { id: 'u3', name: 'Charlie Davis', email: 'charlie@ctc.com', role: 'Employee', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3' },
      { id: 'u4', name: 'Thái Hưng (Giám đốc)', email: 'director@ctc.com', role: 'Director', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=director' },
    ];
    for (const u of INITIAL_USERS) {
      await db.run('INSERT INTO users (id, name, email, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?)', [u.id, u.name, u.email, u.role, u.department, u.avatar]);
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
      const users = await db.all(`
        SELECT u.*, r.permissions 
        FROM users u 
        LEFT JOIN roles r ON u.role = r.name
      `);
      res.json(users.map(u => ({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : [] })));
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.post('/api/users', async (req, res) => {
    const { id, name, email, role, department, avatar } = req.body;
    try {
      await db.run('INSERT INTO users (id, name, email, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?)', [id, name, email, role, department, avatar]);
      res.json({ id });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.put('/api/users/:id', async (req, res) => {
    const { name, email, role, department, avatar } = req.body;
    try {
      await db.run('UPDATE users SET name=?, email=?, role=?, department=?, avatar=? WHERE id=?', [name, email, role, department, avatar, req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.delete('/api/users/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  // --- Notes API ---
  app.get('/api/notes', async (req, res) => {
    try {
      const notes = await db.all('SELECT * FROM notes');
      res.json(notes);
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.post('/api/notes', async (req, res) => {
    const { id, title, content, color, createdAt } = req.body;
    try {
      await db.run('INSERT INTO notes (id, title, content, color, createdAt) VALUES (?, ?, ?, ?, ?)', [id, title, content, color, createdAt]);
      res.json({ id });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.put('/api/notes/:id', async (req, res) => {
    const { title, content, color } = req.body;
    try {
      await db.run('UPDATE notes SET title=?, content=?, color=? WHERE id=?', [title, content, color, req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });
  app.delete('/api/notes/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM notes WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  // --- Tasks API ---
  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await db.all('SELECT * FROM tasks');
      res.json(tasks.map(t => ({
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
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, dueDate, estimatedEndAt, priority, status, assignees, tags, createdBy, department, recurrence, subtasks, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.title, t.description, t.startDate, t.dueDate, t.estimatedEndAt, t.priority, t.status, JSON.stringify(t.assignees||[]), JSON.stringify(t.tags||[]), t.createdBy, t.department, t.recurrence, JSON.stringify(t.subtasks||[]), JSON.stringify(t.comments||[])]
      );
      res.json({ id: t.id });
    } catch(e) { res.status(500).json({error: 'Failed task create'}); }
  });
  app.put('/api/tasks/:id', async (req, res) => {
    const t = req.body;
    try {
      await db.run(
        'UPDATE tasks SET title=?, description=?, startDate=?, dueDate=?, estimatedEndAt=?, priority=?, status=?, assignees=?, tags=?, department=?, recurrence=?, subtasks=?, comments=? WHERE id=?',
        [t.title, t.description, t.startDate, t.dueDate, t.estimatedEndAt, t.priority, t.status, JSON.stringify(t.assignees||[]), JSON.stringify(t.tags||[]), t.department, t.recurrence, JSON.stringify(t.subtasks||[]), JSON.stringify(t.comments||[]), req.params.id]
      );
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed task update'}); }
  });
  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM tasks WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({error: 'Failed'}); }
  });

  // --- Meetings & Signals (Existing) ---
  app.get('/api/meetings', async (req, res) => {
    try {
      const meetings = await db.all('SELECT * FROM meetings');
      res.json(meetings.map(m => ({ ...m, participants: JSON.parse(m.participants) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.get('/api/meetings/:id', async (req, res) => {
    try {
      const m = await db.get('SELECT * FROM meetings WHERE id=?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.json({ ...m, participants: JSON.parse(m.participants) });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/meetings', async (req, res) => {
    const { id, title, description, hostId, startTime, endTime, meetingLink, status, participants } = req.body;
    try {
      await db.run('INSERT INTO meetings (id, title, description, hostId, startTime, endTime, meetingLink, status, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, title, description, hostId, startTime, endTime, meetingLink, status, JSON.stringify(participants)]);
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      await db.run('UPDATE meetings SET title=?, description=?, status=?, participants=?, startTime=?, endTime=? WHERE id=?', [title, description, status, JSON.stringify(participants), startTime, endTime, id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id/join', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
      const meeting = await db.get('SELECT participants FROM meetings WHERE id=?', [id]);
      if (meeting) {
        const participants = JSON.parse(meeting.participants);
        if (!participants.includes(userId)) {
          participants.push(userId);
          await db.run('UPDATE meetings SET participants=? WHERE id=?', [JSON.stringify(participants), id]);
        }
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/meetings/:id/leave', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
      const meeting = await db.get('SELECT participants FROM meetings WHERE id=?', [id]);
      if (meeting) {
        const participants = JSON.parse(meeting.participants);
        const updated = participants.filter((p: string) => p !== userId);
        await db.run('UPDATE meetings SET participants=? WHERE id=?', [JSON.stringify(updated), id]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.delete('/api/meetings/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM meetings WHERE id=?', [req.params.id]);
      await db.run('DELETE FROM signals WHERE meetingId=?', [req.params.id]);
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
      const roles = await db.all('SELECT * FROM roles ORDER BY isSystem DESC, name ASC');
      // Attach user count to each role
      const result = await Promise.all(roles.map(async (r) => {
        const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', [r.name]);
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
      await db.run(
        'INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, 0)',
        [newId, name.trim(), description || '', color || '#6366f1', JSON.stringify(permissions || [])]
      );
      res.status(201).json({ id: newId });
    } catch(e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  app.put('/api/roles/:id', async (req, res) => {
    const { name, description, color, permissions } = req.body;
    try {
      const existing = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      // System roles: only allow description and color update, not name or permissions
      if (existing.isSystem) {
        await db.run(
          'UPDATE roles SET description = ?, color = ? WHERE id = ?',
          [description ?? existing.description, color ?? existing.color, req.params.id]
        );
      } else {
        await db.run(
          'UPDATE roles SET name = ?, description = ?, color = ?, permissions = ? WHERE id = ?',
          [name ?? existing.name, description ?? existing.description, color ?? existing.color,
           JSON.stringify(permissions ?? JSON.parse(existing.permissions || '[]')), req.params.id]
        );
      }
      res.json({ success: true });
    } catch(e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên vai trò đã tồn tại' });
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  app.delete('/api/roles/:id', async (req, res) => {
    try {
      const role = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
      if (!role) return res.status(404).json({ error: 'Not found' });
      if (role.isSystem) return res.status(403).json({ error: 'Không thể xóa vai trò hệ thống' });
      const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', [role.name]);
      if (count > 0) return res.status(409).json({ error: `Đang có ${count} người dùng với vai trò này` });
      await db.run('DELETE FROM roles WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed to delete role' }); }
  });

  // --- Departments API ---
  app.get('/api/departments', async (req, res) => {
    try {
      const depts = await db.all('SELECT * FROM departments ORDER BY name ASC');
      const result = await Promise.all(depts.map(async (d) => {
        const { count: userCount } = await db.get('SELECT COUNT(*) as count FROM users WHERE department = ?', [d.name]);
        const { count: taskCount } = await db.get('SELECT COUNT(*) as count FROM tasks WHERE department = ?', [d.name]);
        const manager = d.managerId ? await db.get('SELECT id, name, avatar FROM users WHERE id = ?', [d.managerId]) : null;
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
      await db.run('INSERT INTO departments (id, name, description, color, managerId) VALUES (?, ?, ?, ?, ?)',
        [newId, name.trim(), description || '', color || '#6366f1', managerId || null]);
      res.status(201).json({ id: newId });
    } catch(e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  app.put('/api/departments/:id', async (req, res) => {
    const { name, description, color, managerId } = req.body;
    try {
      const existing = await db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const oldName = existing.name;
      const newName = name?.trim() ?? oldName;
      await db.run('UPDATE departments SET name = ?, description = ?, color = ?, managerId = ? WHERE id = ?',
        [newName, description ?? existing.description, color ?? existing.color, managerId ?? existing.managerId, req.params.id]);
      // Update users and tasks if name changed
      if (newName !== oldName) {
        await db.run('UPDATE users SET department = ? WHERE department = ?', [newName, oldName]);
        await db.run('UPDATE tasks SET department = ? WHERE department = ?', [newName, oldName]);
      }
      res.json({ success: true });
    } catch(e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  app.delete('/api/departments/:id', async (req, res) => {
    try {
      const dept = await db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
      if (!dept) return res.status(404).json({ error: 'Not found' });
      const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE department = ?', [dept.name]);
      if (count > 0) return res.status(409).json({ error: `Đang có ${count} nhân viên trong phòng ban này` });
      await db.run('DELETE FROM departments WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed to delete department' }); }
  });

  // --- Admin Analytics API ---
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const userCountDesc = await db.get('SELECT COUNT(*) as count FROM users');
      const taskCountDesc = await db.get('SELECT COUNT(*) as count FROM tasks');
      const reportCountDesc = await db.get('SELECT COUNT(*) as count FROM reports');
      const meetingCountDesc = await db.get('SELECT COUNT(*) as count FROM meetings WHERE status != "ended"');
      
      const roleBreakdown = await db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');
      const taskStatusBreakdown = await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
      const taskDeptBreakdown = await db.all('SELECT department, COUNT(*) as count FROM tasks GROUP BY department');
      
      res.json({
        totalUsers: userCountDesc.count,
        totalTasks: taskCountDesc.count,
        totalReports: reportCountDesc.count,
        activeMeetings: meetingCountDesc.count,
        roleBreakdown,
        taskStatusBreakdown,
        taskDeptBreakdown
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  // --- Reports API ---
  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await db.all('SELECT * FROM reports');
      res.json(reports);
    } catch(e) { res.status(500).json({error: 'Failed to fetch reports'}); }
  });

  app.post('/api/reports', async (req, res) => {
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback } = req.body;
    try {
      await db.run(
        'INSERT INTO reports (id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, content, authorId, department, status, createdAt, submittedAt || null, approvedAt || null, approvedBy || null, directorFeedback || null]
      );
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  app.put('/api/reports/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback } = req.body;
    try {
      await db.run(
        'UPDATE reports SET title=?, content=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, directorFeedback=? WHERE id=?',
        [title, content, status, submittedAt || null, approvedAt || null, approvedBy || null, directorFeedback || null, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update report' }); }
  });

  app.delete('/api/reports/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM reports WHERE id=?', [req.params.id]);
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
