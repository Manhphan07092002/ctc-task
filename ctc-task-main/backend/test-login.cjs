const tls = require('tls');

// ====== NHẬP VÀO ĐÂY ======
const EMAIL = 'phanxuanmanh@ctcdn.vn';   // <-- đổi thành email đúng của bạn
const PASSWORD = 'YOUR_PASSWORD_HERE';   // <-- đổi thành mật khẩu đúng
// ==========================

const IMAP_HOST = 'imap.vnptemail.vn';
const IMAP_PORT = 993;

console.log(`Testing IMAP login for: ${EMAIL}`);

const socket = tls.connect(IMAP_PORT, IMAP_HOST, { rejectUnauthorized: false });

let buffer = '';
let loginSent = false;
let done = false;

const timer = setTimeout(() => {
  if (!done) {
    console.log('TIMEOUT - no response after 15s');
    socket.destroy();
  }
}, 15000);

socket.on('data', (data) => {
  const text = data.toString();
  buffer += text;
  console.log('[SERVER]', text.trim());

  if (!loginSent && buffer.includes('* OK')) {
    loginSent = true;
    console.log(`[CLIENT] Sending: A1 LOGIN "${EMAIL}" "***"`);
    socket.write(`A1 LOGIN "${EMAIL}" "${PASSWORD}"\r\n`);
  }

  if (loginSent && buffer.includes('A1 OK')) {
    done = true;
    clearTimeout(timer);
    console.log('\n✅ LOGIN THÀNH CÔNG! Credentials đúng.');
    socket.write('A2 LOGOUT\r\n');
    setTimeout(() => process.exit(0), 1000);
  } else if (loginSent && (buffer.includes('A1 NO') || buffer.includes('A1 BAD'))) {
    done = true;
    clearTimeout(timer);
    console.log('\n❌ LOGIN THẤT BẠI! Máy chủ từ chối credentials.');
    console.log('Phản hồi từ server:', buffer);
    socket.destroy();
    process.exit(1);
  }
});

socket.on('error', (err) => {
  console.error('Socket error:', err.message);
  process.exit(1);
});
