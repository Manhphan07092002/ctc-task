const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

db.serialize(() => {
  db.all("SELECT id, title, department, authorId, status FROM revenue_reports", (err, reports) => {
    console.log("REPORTS:");
    console.table(reports);
  });
  db.all("SELECT id, name, department, role FROM users", (err, users) => {
    console.log("\nUSERS:");
    console.table(users);
  });
});
