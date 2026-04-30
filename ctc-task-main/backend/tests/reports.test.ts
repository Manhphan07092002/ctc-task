import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

const REPORT_BASE = {
  id: 'rep-1',
  title: 'Báo cáo tuần 1',
  content: 'Nội dung báo cáo',
  authorId: 'u-test',
  department: 'IT',
  status: 'Draft',
  createdAt: '2026-04-28T08:00:00.000Z',
};

describe('GET /api/reports', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('trả về mảng rỗng khi chưa có report', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('trả về report sau khi tạo', async () => {
    await request(app).post('/api/reports').send(REPORT_BASE);
    const res = await request(app).get('/api/reports');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Báo cáo tuần 1');
  });
});

describe('POST /api/reports', () => {
  let db: any, app: any;
  beforeEach(async () => { db = await createTestDb(); app = createTestApp(db); });
  afterEach(async () => { await db.close(); });

  it('tạo report và ghi activity log', async () => {
    const res = await request(app).post('/api/reports').send(REPORT_BASE);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('rep-1');

    const log = await db.get('SELECT * FROM activity_logs WHERE entityId = ?', ['rep-1']);
    expect(log).toBeDefined();
    expect(log.action).toBe('report.created');
  });

  it('tạo report với status Draft không gửi notification', async () => {
    await request(app).post('/api/reports').send(REPORT_BASE);
    const notifs = await db.all('SELECT * FROM notifications');
    expect(notifs).toHaveLength(0);
  });

  it('tạo report Pending Manager có managerId → gửi notification', async () => {
    await db.run(
      'INSERT INTO departments (id, name, managerId) VALUES (?, ?, ?)',
      ['dept-it', 'IT', 'u-manager'],
    );
    await db.run(
      'INSERT INTO users (id, name, email, password, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['u-manager', 'Manager', 'mgr@example.com', '', 'Manager', 'IT', ''],
    );
    await request(app).post('/api/reports').send({
      ...REPORT_BASE,
      status: 'Pending Manager',
      department: 'IT',
    });
    const notif = await db.get("SELECT * FROM notifications WHERE userId = 'u-manager'");
    expect(notif).toBeDefined();
    expect(notif.type).toBe('report_submitted');
  });
});

describe('PUT /api/reports/:id', () => {
  let db: any, app: any;
  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/reports').send(REPORT_BASE);
  });
  afterEach(async () => { await db.close(); });

  it('cập nhật status và ghi activity log', async () => {
    const res = await request(app).put('/api/reports/rep-1').send({
      title: 'Báo cáo tuần 1',
      content: 'Nội dung',
      status: 'Approved',
      approvedBy: 'u-director',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const report = await db.get('SELECT * FROM reports WHERE id = ?', ['rep-1']);
    expect(report.status).toBe('Approved');

    const log = await db.get("SELECT * FROM activity_logs WHERE action = 'report.Approved'");
    expect(log).toBeDefined();
    expect(log.userId).toBe('u-director');
  });

  it('đổi status → gửi notification cho tác giả', async () => {
    await request(app).put('/api/reports/rep-1').send({
      title: 'Báo cáo tuần 1',
      content: 'Nội dung',
      status: 'Rejected',
      approvedBy: 'u-director',
    });
    const notif = await db.get("SELECT * FROM notifications WHERE userId = 'u-test'");
    expect(notif).toBeDefined();
    expect(notif.message).toContain('từ chối');
  });
});

describe('DELETE /api/reports/:id', () => {
  let db: any, app: any;
  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/reports').send(REPORT_BASE);
  });
  afterEach(async () => { await db.close(); });

  it('xóa report thành công', async () => {
    const res = await request(app).delete('/api/reports/rep-1');
    expect(res.status).toBe(200);
    const report = await db.get('SELECT * FROM reports WHERE id = ?', ['rep-1']);
    expect(report).toBeUndefined();
  });
});
