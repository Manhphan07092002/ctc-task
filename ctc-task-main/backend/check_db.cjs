const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.all("PRAGMA table_info(contracts);", (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
});
