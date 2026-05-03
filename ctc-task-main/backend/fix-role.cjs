const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all('SELECT * FROM roles', (err, rows) => {
    rows.forEach(role => {
      let perms = [];
      try {
        perms = JSON.parse(role.permissions || '[]');
      } catch(e) {}
      
      // Remove from 'Nhân viên' role
      if (role.name === 'Nhân viên') {
        const newPerms = perms.filter(p => p !== 'create_revenue_report');
        if (newPerms.length !== perms.length) {
          db.run('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(newPerms), role.id], () => {
            console.log('Removed revenue perm from Nhân viên');
          });
        }
      }
    });
  });
});
