import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// ─── SQL normalizer ──────────────────────────────────────────────────────────
// Converts SQLite-flavoured SQL to PostgreSQL without touching route files.

function normalizeSql(sql: string): string {
  // 1. Backtick identifiers → double-quoted
  let s = sql.replace(/`([^`]+)`/g, '"$1"');

  // 2. INSERT OR IGNORE INTO → INSERT INTO … ON CONFLICT DO NOTHING
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) {
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
    s = s.trimEnd() + ' ON CONFLICT DO NOTHING';
  }

  // 3. ? placeholders → $1, $2, …
  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);

  return s;
}

// ─── Row wrapper ─────────────────────────────────────────────────────────────
// PostgreSQL folds unquoted identifiers to lowercase (userId → userid).
// This Proxy makes property access case-insensitive so routes need no changes.

function wrapRow(row: Record<string, any>): any {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    // BigInt (returned by COUNT(*)) → Number
    normalized[k] = typeof v === 'bigint' ? Number(v) : v;
  }

  return new Proxy(normalized, {
    get(target, prop: string | symbol) {
      if (typeof prop !== 'string') return (target as any)[prop];
      if (prop in target) return (target as any)[prop];
      const lower = prop.toLowerCase();
      for (const k of Object.keys(target)) {
        if (k.toLowerCase() === lower) return (target as any)[k];
      }
      return undefined;
    },
    has(target, prop) {
      if (prop in target) return true;
      if (typeof prop === 'string') {
        const lower = prop.toLowerCase();
        for (const k of Object.keys(target)) {
          if (k.toLowerCase() === lower) return true;
        }
      }
      return false;
    },
  });
}

// ─── PgDb class ──────────────────────────────────────────────────────────────
// Drop-in replacement for the sqlite `db` object used throughout the codebase.

class PgDb {
  constructor(private pool: pg.Pool) {}

  async get(sql: string, params?: any[]): Promise<any> {
    const res = await this.pool.query(normalizeSql(sql), params ?? []);
    return res.rows.length > 0 ? wrapRow(res.rows[0]) : undefined;
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    const res = await this.pool.query(normalizeSql(sql), params ?? []);
    return res.rows.map(wrapRow);
  }

  async run(sql: string, params?: any[]): Promise<void> {
    await this.pool.query(normalizeSql(sql), params ?? []);
  }

  /** Executes multi-statement DDL (e.g. CREATE TABLE blocks). */
  async exec(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.pool.query(normalizeSql(stmt));
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const DDL = `
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    hostId TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL,
    meetingLink TEXT NOT NULL, status TEXT NOT NULL, participants TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meeting_participants (
    meetingId TEXT NOT NULL, userId TEXT NOT NULL,
    PRIMARY KEY (meetingId, userId)
  );
  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY, meetingId TEXT NOT NULL,
    "from" TEXT NOT NULL, "to" TEXT NOT NULL,
    type TEXT NOT NULL, data TEXT NOT NULL, timestamp BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    password TEXT, role TEXT NOT NULL, department TEXT NOT NULL, avatar TEXT NOT NULL,
    mailPassword TEXT, bio TEXT, phone TEXT, dob TEXT, hometown TEXT,
    preferences TEXT
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    startDate TEXT, dueDate TEXT, estimatedEndAt TEXT, priority TEXT, status TEXT,
    assignees TEXT, tags TEXT, createdBy TEXT, department TEXT,
    recurrence TEXT, subtasks TEXT, comments TEXT, contractId TEXT
  );
  CREATE TABLE IF NOT EXISTS task_assignees (
    taskId TEXT NOT NULL, userId TEXT NOT NULL,
    PRIMARY KEY (taskId, userId)
  );
  CREATE TABLE IF NOT EXISTS task_tags (
    taskId TEXT NOT NULL, tag TEXT NOT NULL,
    PRIMARY KEY (taskId, tag)
  );
  CREATE TABLE IF NOT EXISTS task_subtasks (
    id TEXT PRIMARY KEY, taskId TEXT NOT NULL, title TEXT NOT NULL,
    isCompleted INTEGER NOT NULL DEFAULT 0, sortOrder INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY, taskId TEXT NOT NULL, userId TEXT NOT NULL,
    content TEXT NOT NULL, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
    color TEXT, createdAt TEXT, reminderAt TEXT, userId TEXT
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
    authorId TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL,
    createdAt TEXT NOT NULL, submittedAt TEXT, approvedAt TEXT, approvedBy TEXT,
    directorFeedback TEXT, managerFeedback TEXT, deletedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1', permissions TEXT NOT NULL DEFAULT '[]',
    isSystem INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1', managerId TEXT
  );
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', emailStatus TEXT NOT NULL DEFAULT 'unknown',
    emailSentAt TEXT, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE, expiresAt TEXT NOT NULL, usedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL,
    title TEXT NOT NULL, message TEXT NOT NULL, relatedId TEXT,
    isRead INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, endDate TEXT,
    type TEXT NOT NULL DEFAULT 'holiday', color TEXT NOT NULL DEFAULT '#ef4444',
    description TEXT, isRecurringYearly INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, action TEXT NOT NULL,
    entityId TEXT, entityType TEXT, metadata TEXT, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS db_history (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, filename TEXT,
    performedBy TEXT, note TEXT, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scheduled_emails (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, "to" TEXT NOT NULL, cc TEXT, bcc TEXT,
    subject TEXT NOT NULL, body TEXT NOT NULL, attachments TEXT,
    scheduledAt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mail_tracking (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, messageId TEXT NOT NULL,
    subject TEXT NOT NULL, "to" TEXT NOT NULL, opens INTEGER NOT NULL DEFAULT 0,
    lastOpen TEXT, createdAt TEXT NOT NULL
  );
`;

// ─── Seed helpers (same data as db.ts) ───────────────────────────────────────

async function seedIfEmpty(db: PgDb): Promise<void> {
  const rolePatches = [
    { name: 'Admin',    permissions: ['manage_users','view_all_tasks','view_all_reports','manage_meetings','join_meetings','admin_panel'] },
    { name: 'Director', permissions: ['view_all_reports','director_feedback','view_all_tasks','manage_meetings','join_meetings'] },
    { name: 'Manager',  permissions: ['manage_dept_tasks','approve_dept_reports','view_dept_users','manage_meetings','join_meetings','create_report'] },
    { name: 'Employee', permissions: ['view_own_tasks','create_report','join_meetings'] },
  ];
  for (const patch of rolePatches) {
    const existing = await db.get('SELECT permissions FROM roles WHERE name = ? AND isSystem = 1', [patch.name]);
    if (existing) {
      let perms: string[] = [];
      try { perms = JSON.parse(existing.permissions); } catch { perms = []; }
      let changed = false;
      for (const p of patch.permissions) {
        if (!perms.includes(p)) { perms.push(p); changed = true; }
      }
      if (changed) {
        await db.run('UPDATE roles SET permissions = ? WHERE name = ? AND isSystem = 1', [JSON.stringify(perms), patch.name]);
      }
    }
  }

  const roleCount = await db.get('SELECT COUNT(*) as count FROM roles');
  if (Number(roleCount?.count) === 0) {
    const ROLES = [
      { id: 'role-admin',    name: 'Admin',    desc: 'Toàn quyền hệ thống.',                                           color: '#ef4444', perms: ['manage_users','view_all_tasks','view_all_reports','manage_meetings','join_meetings','admin_panel'], sys: 1 },
      { id: 'role-director', name: 'Director', desc: 'Xem toàn bộ báo cáo, cung cấp phản hồi Giám đốc.',              color: '#8b5cf6', perms: ['view_all_reports','director_feedback','view_all_tasks','manage_meetings','join_meetings'],       sys: 1 },
      { id: 'role-manager',  name: 'Manager',  desc: 'Quản lý nhân viên trong phòng ban, giao việc, duyệt báo cáo.', color: '#3b82f6', perms: ['manage_dept_tasks','approve_dept_reports','view_dept_users','manage_meetings','join_meetings','create_report'], sys: 1 },
      { id: 'role-employee', name: 'Employee', desc: 'Xem và thực hiện công việc được giao, tạo báo cáo tuần.',      color: '#10b981', perms: ['view_own_tasks','create_report','join_meetings'], sys: 1 },
    ];
    for (const r of ROLES) {
      await db.run('INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.desc, r.color, JSON.stringify(r.perms), r.sys]);
    }
  }

  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (Number(deptCount?.count) === 0) {
    const DEPTS = [
      { id: 'dept-board',     name: 'Board',     desc: 'Hội đồng quản trị và ban lãnh đạo công ty.', color: '#ef4444' },
      { id: 'dept-product',   name: 'Product',   desc: 'Phát triển và quản lý sản phẩm.',            color: '#3b82f6' },
      { id: 'dept-marketing', name: 'Marketing', desc: 'Tiếp thị và truyền thông thương hiệu.',      color: '#f59e0b' },
      { id: 'dept-sales',     name: 'Sales',     desc: 'Kiến tạo doanh thu và phát triển thị trường.', color: '#10b981' },
      { id: 'dept-it',        name: 'IT',        desc: 'Hạ tầng công nghệ và hệ thống nội bộ.',      color: '#8b5cf6' },
      { id: 'dept-hr',        name: 'HR',        desc: 'Nhân sự, tuyển dụng và phát triển văn hoá.', color: '#ec4899' },
      { id: 'dept-finance',   name: 'Finance',   desc: 'Kế toán, tài chính và kiểm soát ngân sách.', color: '#14b8a6' },
    ];
    for (const d of DEPTS) {
      await db.run('INSERT INTO departments (id, name, description, color) VALUES (?, ?, ?, ?)', [d.id, d.name, d.desc, d.color]);
    }
  }

  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (Number(userCount?.count) === 0) {
    const USERS = [
      { id: 'u1', name: 'Admin',           email: 'admin@ctcdn.vn',    role: 'Admin',    dept: 'Board',   avatar: 'https://i.pravatar.cc/150?u=u1' },
      { id: 'u2', name: 'Nguyễn Văn Đạt', email: 'vandat@ctcdn.vn',   role: 'Manager',  dept: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2' },
      { id: 'u3', name: 'Phan Xuân Mạnh', email: 'xuanmanh@ctcdn.vn', role: 'Employee', dept: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3' },
      { id: 'u4', name: 'Nguyễn Văn Duy', email: 'vanduy@ctcdn.vn',   role: 'Director', dept: 'Board',   avatar: 'https://i.pravatar.cc/150?u=u4' },
    ];
    for (const u of USERS) {
      const hashed = await bcrypt.hash('123456', 10);
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, hashed, u.role, u.dept, u.avatar]);
    }
  }

  const noteCount = await db.get('SELECT COUNT(*) as count FROM notes');
  if (Number(noteCount?.count) === 0) {
    await db.run('INSERT INTO notes (id, title, content, color, createdAt) VALUES (?, ?, ?, ?, ?)',
      ['n1', 'Brainstorming Ideas', '- New UI looks great\n- Need to check contrast ratio', 'bg-yellow-100', new Date().toISOString()]);
  }

  const eventCount = await db.get('SELECT COUNT(*) as count FROM events');
  if (Number(eventCount?.count) === 0) {
    const year = new Date().getFullYear();
    const HOLIDAYS = [
      { id: 'evt-01', title: 'Tết Dương Lịch',            date: `${year}-01-01`, end: null,           color: '#ef4444', desc: 'Ngày đầu năm mới dương lịch',                   yearly: 1 },
      { id: 'evt-02', title: 'Tết Nguyên Đán',            date: `${year}-01-28`, end: `${year}-02-02`, color: '#f97316', desc: 'Tết Nguyên Đán – nghỉ 7 ngày',                   yearly: 0 },
      { id: 'evt-03', title: 'Giỗ Tổ Hùng Vương',        date: `${year}-04-07`, end: null,           color: '#8b5cf6', desc: 'Ngày Giỗ Tổ Hùng Vương (10/3 âm lịch)',         yearly: 0 },
      { id: 'evt-04', title: 'Ngày Giải phóng Miền Nam', date: `${year}-04-30`, end: null,           color: '#ef4444', desc: 'Ngày Giải phóng Miền Nam – thống nhất đất nước', yearly: 1 },
      { id: 'evt-05', title: 'Ngày Quốc tế Lao động',    date: `${year}-05-01`, end: null,           color: '#ef4444', desc: 'Ngày Quốc tế Lao động 1/5',                      yearly: 1 },
      { id: 'evt-06', title: 'Ngày Quốc khánh',          date: `${year}-09-02`, end: `${year}-09-03`, color: '#ef4444', desc: 'Quốc khánh nước CHXHCN Việt Nam',                yearly: 1 },
    ];
    for (const h of HOLIDAYS) {
      await db.run('INSERT INTO events (id, title, date, endDate, type, color, description, isRecurringYearly) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [h.id, h.title, h.date, h.end, 'holiday', h.color, h.desc, h.yearly]);
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function initDbPostgres(): Promise<PgDb> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Verify connection
  const client = await pool.connect();
  client.release();

  const db = new PgDb(pool);
  await db.exec(DDL);
  
  // Safe migrations
  const migrations = [
    'ALTER TABLE tasks ADD COLUMN "contractId" TEXT;'
  ];
  for (const sql of migrations) {
    try { await db.run(sql); } catch (_) { /* ignore if exists */ }
  }

  await seedIfEmpty(db);

  console.log('[DB] Connected to PostgreSQL');
  return db;
}
