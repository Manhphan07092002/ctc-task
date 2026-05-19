/**
 * Kịch bản Kiểm thử API Tự động (Automated API Test Script)
 * Dùng để test chức năng (Functional) và bảo mật (Security)
 * Yêu cầu: Node.js v18+ (hỗ trợ fetch)
 * Chạy lệnh: node test_api.js
 */

const API_URL = 'http://localhost:3000/api';

// Đổi email & mật khẩu này thành tài khoản thực tế của bạn nếu muốn test thành công chức năng
const TEST_USER = {
  email: 'admin@example.com', 
  password: 'admin'
};

async function runTests() {
  console.log('🚀 Bắt đầu kịch bản kiểm thử API CTC Tasks...\n');

  let token = '';

  // ---------------------------------------------------------
  // 1. KIỂM THỬ BẢO MẬT: SQL INJECTION (Đăng nhập)
  // ---------------------------------------------------------
  console.log('▶ TEST 1: SQL Injection Protection (Security)');
  try {
    const resSql = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "admin@example.com' OR '1'='1", password: "password" })
    });
    
    if (resSql.status === 401 || resSql.status === 400 || resSql.status === 404) {
      console.log('✅ PASS: Hệ thống chặn SQL Injection an toàn (Mã trả về: ' + resSql.status + ')');
    } else {
      console.error('❌ FAIL: Hệ thống có thể bị tấn công SQL Injection! (Mã trả về: ' + resSql.status + ')');
    }
  } catch (err) {
    console.error('Lỗi kết nối:', err.message);
  }

  // ---------------------------------------------------------
  // 2. KIỂM THỬ CHỨC NĂNG: ĐĂNG NHẬP (Functional)
  // ---------------------------------------------------------
  console.log('\n▶ TEST 2: Đăng nhập hệ thống (Functional)');
  try {
    const resLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await resLogin.json();
    if (resLogin.ok && loginData.token) {
      console.log('✅ PASS: Đăng nhập thành công!');
      token = loginData.token;
    } else {
      console.log(`⚠️ INFO: Đăng nhập thất bại (Có thể do sai thông tin tài khoản test). Message: ${loginData.message || loginData.error}`);
    }
  } catch (err) {
    console.error('Lỗi kết nối:', err.message);
  }

  // ---------------------------------------------------------
  // 3. KIỂM THỬ BẢO MẬT: JWT AUTHENTICATION (Security)
  // ---------------------------------------------------------
  console.log('\n▶ TEST 3: Xác thực JWT - Không có Token (Security)');
  try {
    const resAuth = await fetch(`${API_URL}/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
      // Cố tình không gửi token
    });
    
    if (resAuth.status === 401 || resAuth.status === 403) {
      console.log('✅ PASS: Hệ thống chặn thành công request không có JWT hợp lệ (Mã: ' + resAuth.status + ')');
    } else {
      console.error('❌ FAIL: API có thể truy cập trái phép! (Mã: ' + resAuth.status + ')');
    }
  } catch (err) {
    console.error('Lỗi kết nối:', err.message);
  }

  // ---------------------------------------------------------
  // 4. KIỂM THỬ CHỨC NĂNG: LẤY DANH SÁCH CÔNG VIỆC
  // ---------------------------------------------------------
  if (token) {
    console.log('\n▶ TEST 4: Lấy danh sách công việc (Functional)');
    try {
      const resTasks = await fetch(`${API_URL}/tasks`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const tasksData = await resTasks.json();
      if (resTasks.ok && Array.isArray(tasksData)) {
        console.log(`✅ PASS: Lấy thành công ${tasksData.length} công việc.`);
      } else {
        console.error('❌ FAIL: Không lấy được danh sách công việc.');
      }
    } catch (err) {
      console.error('Lỗi kết nối:', err.message);
    }
  } else {
    console.log('\n⏭️ BỎ QUA TEST 4: Vì không có Token (chưa đăng nhập thành công).');
  }

  console.log('\n🎉 Hoàn thành Test Script!');
}

runTests();
