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
      const allUsers = await db.all('SELECT email, name, role FROM users');
      console.log('--- DANH SÁCH CÁC TÀI KHOẢN HIỆN CÓ ---');
      allUsers.forEach((u: any) => console.log(`- Email: ${u.email} | Tên: ${u.name} | Quyền: ${u.role}`));
      console.log('-----------------------------------------');
      console.log('Vui lòng chạy lại lệnh với một trong các email trên.');
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
