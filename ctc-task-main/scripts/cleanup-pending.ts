import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
  const db = await open({
    filename: '/root/.openclaw/workspace/ctc-task/ctc-task-main/backend/database.sqlite',
    driver: sqlite3.Database,
  });

  await db.run("DELETE FROM password_reset_tokens WHERE userId IN (SELECT userId FROM password_reset_requests WHERE status='pending')");
  const del = await db.run("DELETE FROM password_reset_requests WHERE status='pending'");
  const row = await db.get("SELECT COUNT(*) as count FROM password_reset_requests WHERE status='pending'");
  console.log(JSON.stringify({ deleted: del.changes, remaining_pending: row.count }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
