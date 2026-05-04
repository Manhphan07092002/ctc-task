export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('ctc_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: any = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Only clear token for actual auth failures (not mail IMAP auth failures)
    // Mail endpoints return 401 when IMAP credentials are wrong - that's different from JWT expiry
    const isMailEndpoint = url.includes('/api/mail/');
    if (!isMailEndpoint) {
      localStorage.removeItem('ctc_token');
      localStorage.removeItem('ctc_user');
      localStorage.removeItem('orange_task_user_id');
      window.location.href = '/';
    } else {
      // If it's a mail endpoint, check if it's actually a JWT expiry by cloning the response
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data && data.error && (data.error.includes('token') || data.error.includes('Unauthorized'))) {
          localStorage.removeItem('ctc_token');
          localStorage.removeItem('ctc_user');
          window.location.href = '/';
        }
      } catch (e) {}
    }
  }
  
  return response;
}
