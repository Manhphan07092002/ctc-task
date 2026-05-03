const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all('SELECT * FROM roles', (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    rows.forEach(role => {
      let perms = [];
      try {
        perms = JSON.parse(role.permissions || '[]');
      } catch(e) {}
      
      let updated = false;
      if (role.name.includes('Admin') || role.name.includes('Trưởng phòng') || role.name.toLowerCase().includes('kinh doanh')) {
        if (!perms.includes('create_revenue_report')) {
          perms.push('create_revenue_report');
          updated = true;
        }
        if (!perms.includes('approve_revenue_reports')) {
          perms.push('approve_revenue_reports');
          updated = true;
        }
      }
      
      if (role.name.includes('Nhân viên')) {
        if (!perms.includes('create_revenue_report')) {
          perms.push('create_revenue_report');
          updated = true;
        }
      }

      if (updated) {
        db.run('UPDATE roles SET permissions = ? WHERE id = ?', [JSON.stringify(perms), role.id], (err) => {
          if (err) console.error('Error updating', role.name, err);
          else console.log('Updated role:', role.name);
        });
      }
    });
  });
});
