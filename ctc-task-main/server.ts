import express from 'express';
import { createServer as createViteServer } from 'vite';
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
    DROP TABLE IF EXISTS meetings;
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
  `);

  // API Routes
  app.get('/api/meetings', async (req, res) => {
    try {
      const meetings = await db.all('SELECT * FROM meetings');
      res.json(meetings.map(m => ({
        ...m,
        participants: JSON.parse(m.participants)
      })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  });

  app.post('/api/meetings', async (req, res) => {
    const { id, title, description, hostId, startTime, endTime, meetingLink, status, participants } = req.body;
    try {
      await db.run(
        'INSERT INTO meetings (id, title, description, hostId, startTime, endTime, meetingLink, status, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, description, hostId, startTime, endTime, meetingLink, status, JSON.stringify(participants)]
      );
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  });

  app.put('/api/meetings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      await db.run(
        'UPDATE meetings SET title = ?, description = ?, status = ?, participants = ?, startTime = ?, endTime = ? WHERE id = ?',
        [title, description, status, JSON.stringify(participants), startTime, endTime, id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  });

  app.delete('/api/meetings/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.run('DELETE FROM meetings WHERE id = ?', [id]);
      await db.run('DELETE FROM signals WHERE meetingId = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete meeting' });
    }
  });

  // Signals API (Polling fallback for WebRTC)
  app.get('/api/meetings/:meetingId/signals', async (req, res) => {
    const { meetingId } = req.params;
    const { since } = req.query;
    try {
      const signals = await db.all(
        'SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC',
        [meetingId, since || 0]
      );
      res.json(signals.map(s => ({
        ...s,
        data: JSON.parse(s.data)
      })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch signals' });
    }
  });

  app.post('/api/meetings/:meetingId/signals', async (req, res) => {
    const { meetingId } = req.params;
    const { id, from, to, type, data } = req.body;
    try {
      const timestamp = Date.now();
      await db.run(
        'INSERT INTO signals (id, meetingId, \`from\`, \`to\`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, meetingId, from, to, type, JSON.stringify(data), timestamp]
      );
      res.status(201).json({ id, timestamp });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send signal' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
