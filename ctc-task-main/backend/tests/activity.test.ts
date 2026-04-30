import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

async function seedLog(db: any, overrides: Record<string, any> = {}) {
  await db.run(
    'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [
      overrides.id ?? 'log-1',
      overrides.userId ?? 'u-test',
      overrides.action ?? 'task.created',
      overrides.entityId ?? 'task-1',
      overrides.entityType ?? 'task',
      overrides.createdAt ?? '2026-04-28T08:00:00.000Z',
    ],
  );
}

describe('GET /api/activity', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('trả về mảng rỗng khi chưa có log', async () => {
    const res = await request(app).get('/api/activity');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('trả về log có enrich user info', async () => {
    await seedLog(db);
    const res = await request(app).get('/api/activity');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user).toBeDefined();
    expect(res.body[0].user.name).toBe('Test User');
    expect(res.body[0].user.email).toBe('test@example.com');
  });

  it('userId = system → user.name = Hệ thống', async () => {
    await seedLog(db, { id: 'log-sys', userId: 'system', action: 'system.startup' });
    const res = await request(app).get('/api/activity');
    const sysLog = res.body.find((l: any) => l.id === 'log-sys');
    expect(sysLog.user.name).toBe('Hệ thống');
  });

  it('giới hạn theo query ?limit=1', async () => {
    await seedLog(db, { id: 'log-1', createdAt: '2026-04-28T08:00:00.000Z' });
    await seedLog(db, { id: 'log-2', createdAt: '2026-04-29T08:00:00.000Z' });
    const res = await request(app).get('/api/activity?limit=1');
    expect(res.body).toHaveLength(1);
  });

  it('trả về mới nhất trước (DESC)', async () => {
    await seedLog(db, { id: 'log-old', createdAt: '2026-04-01T00:00:00.000Z' });
    await seedLog(db, { id: 'log-new', createdAt: '2026-04-30T00:00:00.000Z' });
    const res = await request(app).get('/api/activity');
    expect(res.body[0].id).toBe('log-new');
  });
});

describe('GET /api/activity/user/:userId', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('chỉ trả về log của userId được yêu cầu', async () => {
    await seedLog(db, { id: 'log-a', userId: 'u-test' });
    await seedLog(db, { id: 'log-b', userId: 'other-user' });
    const res = await request(app).get('/api/activity/user/u-test');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('log-a');
  });

  it('trả về mảng rỗng nếu userId không có log', async () => {
    const res = await request(app).get('/api/activity/user/no-one');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
