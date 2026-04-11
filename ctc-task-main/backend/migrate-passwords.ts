import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

async function main() {
  const db = await open({
    filename: process.env.DB_PATH || './database.sqlite',
    driver: sqlite3.Database,
  });

  const users = await db.all('SELECT id, email, password FROM users');
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.password) {
      skipped++;
      continue;
    }

    const password = String(user.password);
    const looksHashed = password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');

    if (looksHashed) {
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
    migrated++;
  }

  console.log(JSON.stringify({ migrated, skipped, total: users.length }, null, 2));
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
