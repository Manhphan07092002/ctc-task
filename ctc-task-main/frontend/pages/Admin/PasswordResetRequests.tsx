import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';

interface PasswordResetRequest {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

const ResetPasswordModal: React.FC<{
  request: PasswordResetRequest;
  onCancel: () => void;
  onConfirm: (newPassword: string) => Promise<void>;
}> = ({ request, onCancel, onConfirm }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(newPassword);
    } catch {
      setError('Đặt lại mật khẩu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <KeyRound size={18} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Cấp lại mật khẩu</h3>
              <p className="text-xs text-gray-500">{request.email}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm"
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : 'Cấp mật khẩu mới'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPasswordResetRequests() {
  const [items, setItems] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/password-reset-requests');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setItems(await res.json());
    } catch (e: any) {
      setError(e.message || 'Không thể tải danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingCount = items.filter(i => i.status === 'pending').length;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleResetPassword = async (request: PasswordResetRequest, newPassword: string) => {
    const res = await fetch(`/api/users/${request.userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || 'Đặt lại mật khẩu thất bại', 'error');
      throw new Error('Reset failed');
    }
    showToast(`Đã cấp lại mật khẩu cho ${request.email}`);
    setSelectedRequest(null);
    await fetchData();
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl shadow-lg shadow-orange-200">
            <KeyRound size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Yêu cầu quên mật khẩu</h1>
            <p className="text-sm text-gray-400 mt-0.5">Danh sách người dùng đang chờ admin cấp lại mật khẩu</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tổng yêu cầu</p>
          <p className="text-3xl font-black text-gray-800">{items.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Đang chờ xử lý</p>
          <p className="text-3xl font-black text-orange-600">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Đã xử lý</p>
          <p className="text-3xl font-black text-emerald-600">{items.length - pendingCount}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 flex flex-col items-center gap-3">
            <AlertCircle size={28} />
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Hiện chưa có yêu cầu nào.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/70">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{request.email}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(request.createdAt).toLocaleString('vi-VN')}</span>
                    <span>ID user: {request.userId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${request.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {request.status === 'pending' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                    {request.status === 'pending' ? 'Đang chờ xử lý' : 'Đã xử lý'}
                  </span>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                    >
                      Cấp lại mật khẩu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        Admin có thể cấp lại mật khẩu trực tiếp ngay tại trang này. Sau khi xử lý, yêu cầu sẽ tự chuyển sang trạng thái <span className="font-semibold text-gray-700">Đã xử lý</span>.
      </div>

      {selectedRequest && (
        <ResetPasswordModal
          request={selectedRequest}
          onCancel={() => setSelectedRequest(null)}
          onConfirm={(newPassword) => handleResetPassword(selectedRequest, newPassword)}
        />
      )}
    </div>
  );
}
