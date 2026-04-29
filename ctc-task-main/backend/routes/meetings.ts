import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function meetingRoutes(prisma: PrismaClient, db: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const meetings = await prisma.meetings.findMany();
      res.json(meetings.map(m => ({ ...m, participants: JSON.parse(m.participants) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const m = await prisma.meetings.findUnique({ where: { id: req.params.id } });
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.json({ ...m, participants: JSON.parse(m.participants) });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, description, hostId, startTime, endTime, meetingLink, status, participants } = req.body;
    try {
      await prisma.meetings.create({ data: { id, title, description, hostId, startTime, endTime, meetingLink, status, participants: JSON.stringify(participants) } });
      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, description, status, participants, startTime, endTime } = req.body;
    try {
      await prisma.meetings.update({ where: { id: req.params.id }, data: { title, description, status, participants: JSON.stringify(participants), startTime, endTime } });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/join', async (req, res) => {
    const { userId } = req.body;
    try {
      const meeting = await prisma.meetings.findUnique({ where: { id: req.params.id } });
      if (meeting) {
        const parts = JSON.parse(meeting.participants);
        if (!parts.includes(userId)) {
          parts.push(userId);
          await prisma.meetings.update({ where: { id: req.params.id }, data: { participants: JSON.stringify(parts) } });
        }
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/leave', async (req, res) => {
    const { userId } = req.body;
    try {
      const meeting = await prisma.meetings.findUnique({ where: { id: req.params.id } });
      if (meeting) {
        const updated = JSON.parse(meeting.participants).filter((p: string) => p !== userId);
        await prisma.meetings.update({ where: { id: req.params.id }, data: { participants: JSON.stringify(updated) } });
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await prisma.meetings.delete({ where: { id: req.params.id } });
      await prisma.signals.deleteMany({ where: { meetingId: req.params.id } });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Signals
  router.get('/:meetingId/signals', async (req, res) => {
    const { since } = req.query;
    try {
      const signals = await db.all('SELECT * FROM signals WHERE meetingId = ? AND timestamp > ? ORDER BY timestamp ASC', [req.params.meetingId, since || 0]);
      res.json(signals.map((s: any) => ({ ...s, data: JSON.parse(s.data) })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:meetingId/signals', async (req, res) => {
    const { id, from, to, type, data } = req.body;
    try {
      const timestamp = Date.now();
      await db.run('INSERT INTO signals (id, meetingId, `from`, `to`, type, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, req.params.meetingId, from, to, type, JSON.stringify(data), timestamp]);
      res.status(201).json({ id, timestamp });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
