const sqlite3 = require('../backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

db.run("DELETE FROM notifications WHERE type='note_reminder'", function(err) {
  if (err) console.log('Error:', err.message);
  else console.log('Deleted', this.changes, 'stale note_reminder notifications');
  db.close();
});
