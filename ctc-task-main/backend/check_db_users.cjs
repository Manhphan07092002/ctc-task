const { initDb } = require('./db.js');
const { initDbPostgres } = require('./db_pg.js');
require('dotenv').config();

async function run() {
  const isPg = /^postgre(s|sql):\/\//i.test(process.env.DATABASE_URL || '');
  const db = isPg ? await initDbPostgres() : await initDb();
  
  try {
    const users = await db.all(`SELECT u.id, u.name, u.email, u.role, u.department, u.avatar, u.bio, u.phone, u.dob, u.hometown, u.cccd, u.gender, u.preferences, u.isLocked, r.permissions FROM users u LEFT JOIN roles r ON u.role = r.name`);
    console.log("Users:", users.length);
  } catch (e) {
    console.error("DB Error:", e);
  }
}
run();
