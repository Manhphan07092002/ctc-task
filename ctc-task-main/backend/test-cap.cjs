const tls = require('tls');

const client = tls.connect(993, 'imap.vnptemail.vn', { rejectUnauthorized: false }, () => {
  console.log('Connected');
  client.write('a1 CAPABILITY\r\n');
  setTimeout(() => {
    client.write('a2 LOGOUT\r\n');
  }, 1000);
});

client.on('data', (data) => {
  console.log(data.toString());
});

client.on('end', () => {
  console.log('Connection ended');
});

client.on('error', (err) => {
  console.error(err);
});
