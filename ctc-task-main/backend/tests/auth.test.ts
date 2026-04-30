import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

describe('POST /api/auth/login', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
  });

  afterEach(async () => { await db.close(); });

  it('trả về token và user khi đúng thông tin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('trả về 401 khi sai mật khẩu', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('trả về 401 khi email không tồn tại', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('trả về 400 khi email sai định dạng', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('trả về 400 khi mật khẩu dưới 6 ký tự', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: '123' });

    expect(res.status).toBe(400);
  });

  it('email không phân biệt hoa thường', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('response user có permissions từ role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(Array.isArray(res.body.user.permissions)).toBe(true);
    expect(res.body.user.permissions).toContain('view_own_tasks');
  });
});

describe('POST /api/auth/change-password', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
  });

  afterEach(async () => { await db.close(); });

  it('đổi mật khẩu thành công và mật khẩu mới có thể login', async () => {
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .send({ userId: 'u-test', currentPassword: 'password123', newPassword: 'newpassword456' });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'newpassword456' });
    expect(loginRes.status).toBe(200);
  });

  it('trả về 401 khi sai mật khẩu hiện tại', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ userId: 'u-test', currentPassword: 'wrongpassword', newPassword: 'newpassword456' });

    expect(res.status).toBe(401);
  });

  it('trả về 400 nếu mật khẩu mới dưới 6 ký tự', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ userId: 'u-test', currentPassword: 'password123', newPassword: '123' });

    expect(res.status).toBe(400);
  });

  it('mật khẩu cũ không còn hợp lệ sau khi đổi', async () => {
    await request(app)
      .post('/api/auth/change-password')
      .send({ userId: 'u-test', currentPassword: 'password123', newPassword: 'newpassword456' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(loginRes.status).toBe(401);
  });
});
