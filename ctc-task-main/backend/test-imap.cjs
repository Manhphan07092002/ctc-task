const { ImapFlow } = require('imapflow');

async function testConnection() {
  console.log('Testing connection to imap.vnptemail.vn:993...');
  const client = new ImapFlow({
    host: 'imap.vnptemail.vn',
    port: 993,
    secure: true,
    auth: { user: 'test@ctcdn.vn', pass: 'wrongpass' },
    logger: false,
    tls: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');
    await client.logout();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.response) console.error('Response:', err.response);
  }
}

testConnection();
