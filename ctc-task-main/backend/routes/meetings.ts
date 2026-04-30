import { Router } from 'express';
import { randomUUID } from 'crypto';

export function meetingRoutes(_prisma: any, db: any) {
  const router = Router();

  async function buildMeeting(m: any) {
    const parts = await db.all('SELECT userId FROM meeting_participants WHERE meetingId = ?', [m.id]);
    return { ...m, participants: parts.map((p: any) => p.userId) };
  }

  async function saveParticipants(meetingId: string, participants: string[]) {
    await db.run('DELETE FROM meeting_participants WHERE meetingId = ?', [meetingId]);
    for (const userId of participants) {
      await db.run('INSERT INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [meetingId, userId]);
    }
  }

  router.get('/', async (_req, res) => {
    try {
      const meetings = await db.all('SELECT * FROM meetings');
      res.json(await Promise.all(meetings.map(buildMeeting)));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const m = await db.get('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.json(await buildMeeting(m));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, description, hostId, startTime, endTime, meetingLink, status, participants } = req.body;
    const meetingId = id || randomUUID();
    try {
      await db.run(
        'INSERT INTO meetings (id, title, description, hostId, startTime, endTime, meetingLink, status, participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [meetingId, title, description ?? null, hostId, startTime, endTime, meetingLink, status, '[]'],
      );
      await saveParticipants(meetingId, participants ?? []);
      res.status(201).json({ id: meetingId });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      await db.run(
        'UPDATE meetings SET title=?, description=?, status=?, startTime=?, endTime=? WHERE id=?',
        [title, description ?? null, status, startTime, endTime, req.params.id],
      );
      if (Array.isArray(participants)) {
        await saveParticipants(req.params.id, participants);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic join — no more read-modify-write on JSON
  router.put('/:id/join', async (req, res) => {
    const { userId } = req.body;
    try {
      await db.run('INSERT OR IGNORE INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [req.params.id, userId]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Atomic leave
  router.put('/:id/leave', async (req, res) => {
    const { userId } = req.body;
    try {
      await db.run('DELETE FROM meeting_participants WHERE meetingId = ? AND userId = ?', [req.params.id, userId]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM meeting_participants WHERE meetingId = ?', [req.params.id]);
      await db.run('DELETE FROM signals WHERE meetingId = ?', [req.params.id]);
      await db.run('DELETE FROM meetings WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Signals
  router.get('/:meetingId/signals', async (req, res) => {
    const { since } = req.query;
    try {
      const signals = await db.all(
        'SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC',
        [req.params.meetingId, since || 0],
      );
      res.json(signals.map((s: any) => ({ ...s, data: JSON.parse(s.data) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:meetingId/signals', async (req, res) => {
    const { id, from, to, type, data } = req.body;
    try {
      const timestamp = Date.now();
      await db.run(
        'INSERT INTO signals (id, meetingId, `from`, `to`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id || randomUUID(), req.params.meetingId, from, to, type, JSON.stringify(data), timestamp],
      );
      res.status(201).json({ id, timestamp });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
