const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

db.serialize(() => {
  db.all("SELECT id, name, permissions FROM roles WHERE name = 'Nhân viên sale'", (err, roles) => {
    console.log("ROLES:");
    console.table(roles);
  });
});
