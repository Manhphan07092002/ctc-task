const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ctc-task.db');
db.serialize(() => {
  db.each("SELECT * FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    console.log(row.sql);
  });
});
