import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb, createTestApp } from './setup.js';

const TASK_BASE = {
  id: 'task-1',
  title: 'Test Task',
  status: 'Todo',
  priority: 'High',
  createdBy: 'u-test',
  department: 'IT',
};

describe('GET /api/tasks', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
  });

  afterEach(async () => { await db.close(); });

  it('trả về mảng rỗng khi chưa có task', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('assignees và tags luôn là mảng (không phải null/string)', async () => {
    await request(app).post('/api/tasks').send({ ...TASK_BASE });

    const res = await request(app).get('/api/tasks');
    expect(Array.isArray(res.body[0].assignees)).toBe(true);
    expect(Array.isArray(res.body[0].tags)).toBe(true);
    expect(Array.isArray(res.body[0].subtasks)).toBe(true);
    expect(Array.isArray(res.body[0].comments)).toBe(true);
  });

  it('trả về đúng dữ liệu assignees, tags, subtasks, comments', async () => {
    await request(app).post('/api/tasks').send({
      ...TASK_BASE,
      assignees: ['u-test'],
      tags: ['bug', 'urgent'],
      subtasks: [{ id: 'st-1', title: 'Subtask 1', isCompleted: false }],
      comments: [{ id: 'c-1', userId: 'u-test', content: 'Comment 1', createdAt: '2026-01-01T00:00:00.000Z' }],
    });

    const res = await request(app).get('/api/tasks');
    const task = res.body[0];
    expect(task.assignees).toEqual(['u-test']);
    expect(task.tags).toContain('bug');
    expect(task.tags).toContain('urgent');
    expect(task.subtasks[0]).toMatchObject({ id: 'st-1', title: 'Subtask 1', isCompleted: false });
    expect(task.comments[0]).toMatchObject({ id: 'c-1', content: 'Comment 1' });
  });
});

describe('POST /api/tasks', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
  });

  afterEach(async () => { await db.close(); });

  it('tạo task và lưu vào bảng tasks', async () => {
    const res = await request(app).post('/api/tasks').send({ ...TASK_BASE });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('task-1');

    const row = await db.get('SELECT * FROM tasks WHERE id = ?', ['task-1']);
    expect(row).toBeDefined();
    expect(row.title).toBe('Test Task');
  });

  it('lưu assignees vào bảng task_assignees (không phải JSON string)', async () => {
    await request(app).post('/api/tasks').send({ ...TASK_BASE, assignees: ['u-test'] });

    const rows = await db.all('SELECT * FROM task_assignees WHERE taskId = ?', ['task-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u-test');
  });

  it('lưu tags vào bảng task_tags', async () => {
    await request(app).post('/api/tasks').send({ ...TASK_BASE, tags: ['bug', 'urgent'] });

    const rows = await db.all('SELECT * FROM task_tags WHERE taskId = ?', ['task-1']);
    expect(rows).toHaveLength(2);
    expect(rows.map((r: any) => r.tag)).toContain('bug');
    expect(rows.map((r: any) => r.tag)).toContain('urgent');
  });

  it('lưu subtasks với thứ tự sortOrder đúng', async () => {
    await request(app).post('/api/tasks').send({
      ...TASK_BASE,
      subtasks: [
        { id: 'st-1', title: 'First', isCompleted: false },
        { id: 'st-2', title: 'Second', isCompleted: true },
      ],
    });

    const rows = await db.all('SELECT * FROM task_subtasks WHERE taskId = ? ORDER BY sortOrder', ['task-1']);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('st-1');
    expect(rows[1].id).toBe('st-2');
    expect(rows[1].isCompleted).toBe(1);
  });

  it('ghi activity log khi tạo task', async () => {
    await request(app).post('/api/tasks').send({ ...TASK_BASE, createdBy: 'u-test' });

    const log = await db.get("SELECT * FROM activity_logs WHERE entityId = 'task-1'");
    expect(log).toBeDefined();
    expect(log.action).toBe('task.created');
  });
});

describe('PUT /api/tasks/:id', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/tasks').send({
      ...TASK_BASE,
      assignees: ['u-test'],
      tags: ['old-tag'],
      subtasks: [{ id: 'st-old', title: 'Old Subtask', isCompleted: false }],
    });
  });

  afterEach(async () => { await db.close(); });

  it('cập nhật title trong bảng tasks', async () => {
    await request(app).put('/api/tasks/task-1').send({
      ...TASK_BASE,
      title: 'Updated Title',
      assignees: ['u-test'],
      tags: [],
      subtasks: [],
      comments: [],
    });

    const row = await db.get('SELECT title FROM tasks WHERE id = ?', ['task-1']);
    expect(row.title).toBe('Updated Title');
  });

  it('thay thế toàn bộ tags cũ bằng tags mới', async () => {
    await request(app).put('/api/tasks/task-1').send({
      ...TASK_BASE,
      assignees: [],
      tags: ['new-tag-1', 'new-tag-2'],
      subtasks: [],
      comments: [],
    });

    const rows = await db.all('SELECT tag FROM task_tags WHERE taskId = ?', ['task-1']);
    const tags = rows.map((r: any) => r.tag);
    expect(tags).not.toContain('old-tag');
    expect(tags).toContain('new-tag-1');
    expect(tags).toContain('new-tag-2');
  });

  it('thay thế subtasks cũ bằng subtasks mới', async () => {
    await request(app).put('/api/tasks/task-1').send({
      ...TASK_BASE,
      assignees: [],
      tags: [],
      subtasks: [{ id: 'st-new', title: 'New Subtask', isCompleted: true }],
      comments: [],
    });

    const rows = await db.all('SELECT * FROM task_subtasks WHERE taskId = ?', ['task-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('st-new');
    expect(rows[0].isCompleted).toBe(1);
  });
});

describe('DELETE /api/tasks/:id', () => {
  let db: any;
  let app: any;

  beforeEach(async () => {
    db = await createTestDb();
    app = createTestApp(db);
    await request(app).post('/api/tasks').send({
      ...TASK_BASE,
      assignees: ['u-test'],
      tags: ['bug'],
      subtasks: [{ id: 'st-1', title: 'Sub', isCompleted: false }],
      comments: [{ id: 'c-1', userId: 'u-test', content: 'Comment', createdAt: '2026-01-01T00:00:00.000Z' }],
    });
  });

  afterEach(async () => { await db.close(); });

  it('xóa task khỏi bảng tasks', async () => {
    await request(app).delete('/api/tasks/task-1');
    const row = await db.get('SELECT * FROM tasks WHERE id = ?', ['task-1']);
    expect(row).toBeUndefined();
  });

  it('cascade xóa toàn bộ dữ liệu liên quan', async () => {
    await request(app).delete('/api/tasks/task-1');

    const [assignees, tags, subtasks, comments] = await Promise.all([
      db.all('SELECT * FROM task_assignees WHERE taskId = ?', ['task-1']),
      db.all('SELECT * FROM task_tags WHERE taskId = ?', ['task-1']),
      db.all('SELECT * FROM task_subtasks WHERE taskId = ?', ['task-1']),
      db.all('SELECT * FROM task_comments WHERE taskId = ?', ['task-1']),
    ]);

    expect(assignees).toHaveLength(0);
    expect(tags).toHaveLength(0);
    expect(subtasks).toHaveLength(0);
    expect(comments).toHaveLength(0);
  });
});
