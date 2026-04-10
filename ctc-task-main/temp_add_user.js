const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

db.run("INSERT INTO users (id, name, email, role, department, avatar) VALUES ('u4', 'Thái Hưng (Giám đốc)', 'director@ctc.com', 'Admin', 'Board', 'https://i.pravatar.cc/150?u=director')", (err) => {
  if (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('User already exists. Updating instead.');
      db.run("UPDATE users SET name='Thái Hưng (Giám đốc)' WHERE id='u4'");
    } else {
      console.error(err);
    }
  } else {
    console.log('User added successfully');
  }
});
