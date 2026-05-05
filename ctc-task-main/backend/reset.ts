import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb } from './db.js';
import { initDbPostgres } from './db_pg.js';

async function reset() {
  const email = process.argv[2] || 'admin@ctcdn.vn';
  const password = process.argv[3] || '123456';

  const isPg = /^postgre(s|sql):\/\//i.test(process.env.DATABASE_URL || '');
  console.log(`Kết nối tới cơ sở dữ liệu: ${isPg ? 'PostgreSQL' : 'SQLite'}`);
  
  const db = isPg ? await initDbPostgres() : await initDb();
  
  const hash = await bcrypt.hash(password, 10);
  
  try {
    const user = await db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
    if (!user) {
      console.log(`Không tìm thấy user với email: ${email}`);
      process.exit(1);
    }
    
    await db.run(
      'UPDATE users SET password = ?, failedLogins = 0, isLocked = 0, lockedUntil = NULL WHERE lower(email) = lower(?)',
      [hash, email]
    );
    console.log(`Đã reset mật khẩu cho ${email} thành: ${password}`);
    process.exit(0);
  } catch (e) {
    console.error('Lỗi khi reset:', e);
    process.exit(1);
  }
}

reset();
