const sqlite3 = require('sqlite3').verbose();
const tls = require('tls');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!';
const IV_LENGTH = 16;

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

const db = new sqlite3.Database('./ctc_database.sqlite');

db.get('SELECT mailPassword, email FROM users WHERE mailPassword IS NOT NULL LIMIT 1', (err, user) => {
  if (err || !user) {
    console.log('No user with mail credentials found.');
    return;
  }

  const decryptedStr = decrypt(user.mailPassword);
  if (!decryptedStr) {
    console.log('Failed to decrypt');
    return;
  }

  let email = user.email;
  let password = decryptedStr;
  try {
    const parsed = JSON.parse(decryptedStr);
    if (parsed.email && parsed.password) {
      email = parsed.email;
      password = parsed.password;
    }
  } catch (e) {}

  console.log('Testing IMAP for:', email);
  
  const client = tls.connect(993, 'imap.vnptemail.vn', { rejectUnauthorized: false }, () => {
    console.log('TLS Connected. Sending LOGIN command...');
    // Use raw LOGIN command
    client.write(`a1 LOGIN "${email}" "${password}"\r\n`);
  });

  client.on('data', (data) => {
    const response = data.toString();
    console.log('SERVER:', response);
    if (response.includes('a1 OK')) {
      console.log('LOGIN SUCCESSFUL!');
      client.write('a2 LOGOUT\r\n');
    } else if (response.includes('a1 NO')) {
      console.log('LOGIN FAILED!');
      client.destroy();
    }
  });

  client.on('error', (err) => {
    console.error('Socket error:', err);
  });
});
