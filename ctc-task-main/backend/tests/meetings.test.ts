import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

const MEETING_BASE = {
  id: 'meet-1',
  title: 'Sprint Planning',
  hostId: 'u-test',
  startTime: '2026-05-01T09:00:00.000Z',
  endTime: '2026-05-01T10:00:00.000Z',
  meetingLink: 'https://meet.example.com/abc',
  status: 'scheduled',
};

describe('GET /api/meetings', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('trả về mảng rỗng khi chưa có meeting', async () => {
    const res = await request(app).get('/api/meetings');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('participants luôn là mảng (không phải JSON string)', async () => {
    await request(app).post('/api/meetings').send({ ...MEETING_BASE, participants: ['u-test'] });
    const res = await request(app).get('/api/meetings');
    expect(Array.isArray(res.body[0].participants)).toBe(true);
    expect(res.body[0].participants).toEqual(['u-test']);
  });
});

describe('POST /api/meetings', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('tạo meeting và lưu participants vào bảng riêng', async () => {
    const res = await request(app).post('/api/meetings').send({ ...MEETING_BASE, participants: ['u-test'] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('meet-1');

    const rows = await db.all('SELECT * FROM meeting_participants WHERE meetingId = ?', ['meet-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u-test');
  });

  it('tạo meeting không có participants → participants = []', async () => {
    await request(app).post('/api/meetings').send({ ...MEETING_BASE });
    const res = await request(app).get('/api/meetings');
    expect(res.body[0].participants).toEqual([]);
  });
});

describe('PUT /api/meetings/:id/join và /leave', () => {
  let db: any, app: any;
  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/meetings').send({ ...MEETING_BASE, participants: [] });
  });
  afterEach(async () => { await db.close(); });

  it('join thêm userId vào meeting_participants', async () => {
    await request(app).put('/api/meetings/meet-1/join').send({ userId: 'u-test' });
    const rows = await db.all('SELECT * FROM meeting_participants WHERE meetingId = ?', ['meet-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u-test');
  });

  it('join hai lần không tạo duplicate (idempotent)', async () => {
    await request(app).put('/api/meetings/meet-1/join').send({ userId: 'u-test' });
    await request(app).put('/api/meetings/meet-1/join').send({ userId: 'u-test' });
    const rows = await db.all('SELECT * FROM meeting_participants WHERE meetingId = ?', ['meet-1']);
    expect(rows).toHaveLength(1);
  });

  it('leave xóa userId khỏi meeting_participants', async () => {
    await request(app).put('/api/meetings/meet-1/join').send({ userId: 'u-test' });
    await request(app).put('/api/meetings/meet-1/leave').send({ userId: 'u-test' });
    const rows = await db.all('SELECT * FROM meeting_participants WHERE meetingId = ?', ['meet-1']);
    expect(rows).toHaveLength(0);
  });
});

describe('DELETE /api/meetings/:id', () => {
  let db: any, app: any;
  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/meetings').send({ ...MEETING_BASE, participants: ['u-test'] });
  });
  afterEach(async () => { await db.close(); });

  it('xóa meeting và cascade participants', async () => {
    await request(app).delete('/api/meetings/meet-1');
    const meeting = await db.get('SELECT * FROM meetings WHERE id = ?', ['meet-1']);
    const parts = await db.all('SELECT * FROM meeting_participants WHERE meetingId = ?', ['meet-1']);
    expect(meeting).toBeUndefined();
    expect(parts).toHaveLength(0);
  });
});
