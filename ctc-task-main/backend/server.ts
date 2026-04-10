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
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize SQLite
  const db = await open({
    filename: './database.sqlite',
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
  `);

  // Seed Data
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const INITIAL_USERS = [
      { id: 'u1', name: 'Alice Wilson', email: 'alice@ctc.com', role: 'Admin', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u1' },
      { id: 'u2', name: 'Bob Smith', email: 'bob@ctc.com', role: 'Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2' },
      { id: 'u3', name: 'Charlie Davis', email: 'charlie@ctc.com', role: 'Employee', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3' },
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
      const users = await db.all('SELECT * FROM users');
      res.json(users);
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

  // --- Reports API ---
  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await db.all('SELECT * FROM reports');
      res.json(reports);
    } catch(e) { res.status(500).json({error: 'Failed to fetch reports'}); }
  });

  app.post('/api/reports', async (req, res) => {
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy } = req.body;
    try {
      await db.run(
        'INSERT INTO reports (id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, content, authorId, department, status, createdAt, submittedAt || null, approvedAt || null, approvedBy || null]
      );
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  app.put('/api/reports/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy } = req.body;
    try {
      await db.run(
        'UPDATE reports SET title=?, content=?, status=?, submittedAt=?, approvedAt=?, approvedBy=? WHERE id=?',
        [title, content, status, submittedAt || null, approvedAt || null, approvedBy || null, req.params.id]
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
