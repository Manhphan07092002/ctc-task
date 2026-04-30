import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

export async function initDb() {
  const db = await open({
    filename: process.env.DB_PATH || './database.sqlite',
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(`
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
      \`from\` TEXT NOT NULL, \`to\` TEXT NOT NULL,
      type TEXT NOT NULL, data TEXT NOT NULL, timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      password TEXT, role TEXT NOT NULL, department TEXT NOT NULL, avatar TEXT NOT NULL,
      mailPassword TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      startDate TEXT, dueDate TEXT, estimatedEndAt TEXT, priority TEXT, status TEXT,
      assignees TEXT, tags TEXT, createdBy TEXT, department TEXT,
      recurrence TEXT, subtasks TEXT, comments TEXT
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
      color TEXT, createdAt TEXT, reminderAt TEXT
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT,
      authorId TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL,
      createdAt TEXT NOT NULL, submittedAt TEXT, approvedAt TEXT, approvedBy TEXT
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
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      endDate TEXT,
      type TEXT NOT NULL DEFAULT 'holiday',
      color TEXT NOT NULL DEFAULT '#ef4444',
      description TEXT,
      isRecurringYearly INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      action TEXT NOT NULL,
      entityId TEXT,
      entityType TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS db_history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      filename TEXT,
      performedBy TEXT,
      note TEXT,
      createdAt TEXT NOT NULL
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
  `);

  // Migrations (safe to run multiple times)
  const migrations = [
    'ALTER TABLE users ADD COLUMN password TEXT;',
    'ALTER TABLE users ADD COLUMN mailPassword TEXT;',
    'ALTER TABLE users ADD COLUMN failedLogins INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN lockedUntil TEXT;',
    'ALTER TABLE users ADD COLUMN isLocked INTEGER NOT NULL DEFAULT 0;',
    "ALTER TABLE password_reset_requests ADD COLUMN emailStatus TEXT NOT NULL DEFAULT 'unknown';",
    'ALTER TABLE password_reset_requests ADD COLUMN emailSentAt TEXT;',
    'ALTER TABLE reports ADD COLUMN directorFeedback TEXT;',
    'ALTER TABLE reports ADD COLUMN managerFeedback TEXT;',
    'ALTER TABLE reports ADD COLUMN deletedAt TEXT;',
    'ALTER TABLE notes ADD COLUMN userId TEXT;',
    'ALTER TABLE notes ADD COLUMN reminderAt TEXT;',
    'ALTER TABLE users ADD COLUMN phone TEXT;',
    'ALTER TABLE users ADD COLUMN dob TEXT;',
    'ALTER TABLE users ADD COLUMN hometown TEXT;',
    'ALTER TABLE users ADD COLUMN bio TEXT;',
    'ALTER TABLE users ADD COLUMN cccd TEXT;',
    'ALTER TABLE users ADD COLUMN gender TEXT;',
    "UPDATE users SET phone = '0987654321', dob = '1985-06-15', hometown = 'Hà Nội', bio = 'Chuyên gia quản trị với hơn 10 năm kinh nghiệm trong lĩnh vực phát triển kinh doanh.', cccd = '001085123456', gender = 'Nam' WHERE email = 'vandat@ctcdn.vn' AND phone IS NULL;",
    "UPDATE users SET phone = '0123456789', dob = '2002-09-07', hometown = 'Đà Nẵng', bio = 'Nhân viên năng nổ, luôn nỗ lực học hỏi và hoàn thành xuất sắc các dự án được giao.', cccd = '048202012345', gender = 'Nam' WHERE email = 'xuanmanh@ctcdn.vn' AND phone IS NULL;",
    "UPDATE users SET phone = '0912345678', dob = '1990-01-01', hometown = 'Hồ Chí Minh', bio = 'Quản trị viên hệ thống cấp cao.', cccd = '079190001111', gender = 'Khác' WHERE email = 'admin@ctcdn.vn' AND phone IS NULL;"
  ];
  for (const sql of migrations) {
    try { await db.exec(sql); } catch (_) { /* column already exists */ }
  }

  // Migrate existing JSON task columns to normalized tables (idempotent via INSERT OR IGNORE)
  const existingTasks = await db.all('SELECT id, assignees, tags, subtasks, comments FROM tasks');
  for (const task of existingTasks) {
    try {
      const assignees: string[] = task.assignees ? JSON.parse(task.assignees) : [];
      for (const userId of assignees) {
        await db.run('INSERT OR IGNORE INTO task_assignees (taskId, userId) VALUES (?, ?)', [task.id, userId]);
      }
    } catch { /* malformed JSON */ }
    try {
      const tags: string[] = task.tags ? JSON.parse(task.tags) : [];
      for (const tag of tags) {
        await db.run('INSERT OR IGNORE INTO task_tags (taskId, tag) VALUES (?, ?)', [task.id, tag]);
      }
    } catch { /* malformed JSON */ }
    try {
      const subtasks: any[] = task.subtasks ? JSON.parse(task.subtasks) : [];
      for (let i = 0; i < subtasks.length; i++) {
        const s = subtasks[i];
        if (s.id) await db.run(
          'INSERT OR IGNORE INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)',
          [s.id, task.id, s.title, s.isCompleted ? 1 : 0, i],
        );
      }
    } catch { /* malformed JSON */ }
    try {
      const comments: any[] = task.comments ? JSON.parse(task.comments) : [];
      for (const c of comments) {
        if (c.id) await db.run(
          'INSERT OR IGNORE INTO task_comments (id, taskId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)',
          [c.id, task.id, c.userId, c.content, c.createdAt],
        );
      }
    } catch { /* malformed JSON */ }
  }

  // Migrate meetings.participants JSON → meeting_participants table
  const existingMeetings = await db.all('SELECT id, participants FROM meetings');
  for (const meeting of existingMeetings) {
    try {
      const parts: string[] = meeting.participants ? JSON.parse(meeting.participants) : [];
      for (const userId of parts) {
        await db.run('INSERT OR IGNORE INTO meeting_participants (meetingId, userId) VALUES (?, ?)', [meeting.id, userId]);
      }
    } catch { /* malformed JSON */ }
  }

  // Patch existing system roles to ensure meetings permissions are included
  const rolePatches: { name: string; permissions: string[] }[] = [
    { name: 'Admin', permissions: ['manage_users', 'view_all_tasks', 'view_all_reports', 'manage_meetings', 'join_meetings', 'admin_panel'] },
    { name: 'Director', permissions: ['view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings', 'join_meetings'] },
    { name: 'Manager', permissions: ['manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings', 'join_meetings', 'create_report'] },
    { name: 'Employee', permissions: ['view_own_tasks', 'create_report', 'join_meetings'] },
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

  // Seed Roles
  const roleCount = await db.get('SELECT COUNT(*) as count FROM roles');
  if (roleCount.count === 0) {
    const INITIAL_ROLES = [
      { id: 'role-admin', name: 'Admin', description: 'Toàn quyền hệ thống.', color: '#ef4444', permissions: JSON.stringify(['manage_users', 'view_all_tasks', 'view_all_reports', 'manage_meetings', 'join_meetings', 'admin_panel']), isSystem: 1 },
      { id: 'role-director', name: 'Director', description: 'Xem toàn bộ báo cáo, cung cấp phản hồi Giám đốc.', color: '#8b5cf6', permissions: JSON.stringify(['view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings', 'join_meetings']), isSystem: 1 },
      { id: 'role-manager', name: 'Manager', description: 'Quản lý nhân viên trong phòng ban, giao việc, duyệt báo cáo phòng ban.', color: '#3b82f6', permissions: JSON.stringify(['manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings', 'join_meetings', 'create_report']), isSystem: 1 },
      { id: 'role-employee', name: 'Employee', description: 'Xem và thực hiện công việc được giao, tạo báo cáo tuần.', color: '#10b981', permissions: JSON.stringify(['view_own_tasks', 'create_report', 'join_meetings']), isSystem: 1 },
    ];
    for (const r of INITIAL_ROLES) {
      await db.run('INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)', [r.id, r.name, r.description, r.color, r.permissions, r.isSystem]);
    }
  }

  // Seed Departments
  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count === 0) {
    const INITIAL_DEPTS = [
      { id: 'dept-board', name: 'Board', description: 'Hội đồng quản trị và ban lãnh đạo công ty.', color: '#ef4444' },
      { id: 'dept-product', name: 'Product', description: 'Phát triển và quản lý sản phẩm.', color: '#3b82f6' },
      { id: 'dept-marketing', name: 'Marketing', description: 'Tiếp thị và truyền thông thương hiệu.', color: '#f59e0b' },
      { id: 'dept-sales', name: 'Sales', description: 'Kiến tạo doanh thu và phát triển thị trường.', color: '#10b981' },
      { id: 'dept-it', name: 'IT', description: 'Hạ tầng công nghệ và hệ thống nội bộ.', color: '#8b5cf6' },
      { id: 'dept-hr', name: 'HR', description: 'Nhân sự, tuyển dụng và phát triển văn hoá doanh nghiệp.', color: '#ec4899' },
      { id: 'dept-finance', name: 'Finance', description: 'Kế toán, tài chính và kiểm soát ngân sách.', color: '#14b8a6' },
    ];
    for (const d of INITIAL_DEPTS) {
      await db.run('INSERT INTO departments (id, name, description, color) VALUES (?, ?, ?, ?)', [d.id, d.name, d.description, d.color]);
    }
  }

  // Seed Users
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const INITIAL_USERS = [
      { id: 'u1', name: 'Admin', email: 'admin@ctcdn.vn', password: await bcrypt.hash('123456', 10), role: 'Admin', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u1', phone: '0912345678', dob: '1990-01-01', hometown: 'Hồ Chí Minh', bio: 'Quản trị viên hệ thống.' },
      { id: 'u2', name: 'Nguyễn Văn Đạt', email: 'vandat@ctcdn.vn', password: await bcrypt.hash('123456', 10), role: 'Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2', phone: '0987654321', dob: '1985-06-15', hometown: 'Hà Nội', bio: 'Chuyên gia quản trị.' },
      { id: 'u3', name: 'Phan Xuân Mạnh', email: 'xuanmanh@ctcdn.vn', password: await bcrypt.hash('123456', 10), role: 'Employee', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3', phone: '0123456789', dob: '2002-09-07', hometown: 'Đà Nẵng', bio: 'Nhân viên ưu tú.' },
      { id: 'u4', name: 'Nguyễn Văn Duy', email: 'vanduy@ctcdn.vn', password: await bcrypt.hash('123456', 10), role: 'Director', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u4', phone: '0933333333', dob: '1980-02-20', hometown: 'Hải Phòng', bio: 'Giám đốc điều hành.' },
    ];
    for (const u of INITIAL_USERS) {
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar, phone, dob, hometown, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [u.id, u.name, u.email, u.password, u.role, u.department, u.avatar, u.phone, u.dob, u.hometown, u.bio]);
    }
  }

  // Seed Tasks
  const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks');
  if (taskCount.count === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.run(
      'INSERT INTO tasks (id, title, description, startDate, estimatedEndAt, priority, status, assignees, tags, createdBy, department, recurrence, subtasks, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['t1', 'Design System Review', 'Review the new color palette and component library compatibility.', todayStr, null, 'High', 'In Progress', '["u1","u2"]', '["Design","UI/UX"]', 'u1', 'Board', 'None', '[{"id":"st1","title":"Check color contrast ratios","isCompleted":true}]', '[]']
    );
  }

  // Seed Notes
  const noteCount = await db.get('SELECT COUNT(*) as count FROM notes');
  if (noteCount.count === 0) {
    await db.run('INSERT INTO notes (id, title, content, color, createdAt) VALUES (?, ?, ?, ?, ?)', ['n1', 'Brainstorming Ideas', '- New UI looks great\n- Need to check contrast ratio', 'bg-yellow-100', new Date().toISOString()]);
  }

  // Seed Events (Vietnamese National Holidays)
  const eventCount = await db.get('SELECT COUNT(*) as count FROM events');
  if (eventCount.count === 0) {
    const year = new Date().getFullYear();
    const holidays = [
      { id: 'evt-01', title: 'Tết Dương Lịch', date: `${year}-01-01`, type: 'holiday', color: '#ef4444', description: 'Ngày đầu năm mới dương lịch', isRecurringYearly: 1 },
      { id: 'evt-02', title: 'Tết Nguyên Đán', date: `${year}-01-28`, endDate: `${year}-02-02`, type: 'holiday', color: '#f97316', description: 'Tết Nguyên Đán – nghỉ 7 ngày', isRecurringYearly: 0 },
      { id: 'evt-03', title: 'Giỗ Tổ Hùng Vương', date: `${year}-04-07`, type: 'holiday', color: '#8b5cf6', description: 'Ngày Giỗ Tổ Hùng Vương (10/3 âm lịch)', isRecurringYearly: 0 },
      { id: 'evt-04', title: 'Ngày Giải phóng Miền Nam', date: `${year}-04-30`, type: 'holiday', color: '#ef4444', description: 'Ngày Giải phóng Miền Nam – thống nhất đất nước', isRecurringYearly: 1 },
      { id: 'evt-05', title: 'Ngày Quốc tế Lao động', date: `${year}-05-01`, type: 'holiday', color: '#ef4444', description: 'Ngày Quốc tế Lao động 1/5', isRecurringYearly: 1 },
      { id: 'evt-06', title: 'Ngày Quốc khánh', date: `${year}-09-02`, endDate: `${year}-09-03`, type: 'holiday', color: '#ef4444', description: 'Quốc khánh nước CHXHCN Việt Nam', isRecurringYearly: 1 },
    ];
    for (const h of holidays) {
      await db.run(
        'INSERT INTO events (id, title, date, endDate, type, color, description, isRecurringYearly) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [h.id, h.title, h.date, h.endDate || null, h.type, h.color, h.description, h.isRecurringYearly]
      );
    }
  }

  return db;
}
