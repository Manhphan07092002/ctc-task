export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('ctc_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Nếu token hết hạn hoặc không hợp lệ, xóa token và có thể reload để đẩy về trang login
    localStorage.removeItem('ctc_token');
    localStorage.removeItem('ctc_user');
    localStorage.removeItem('orange_task_user_id');
    // window.location.href = '/'; 
  }
  
  return response;
}
