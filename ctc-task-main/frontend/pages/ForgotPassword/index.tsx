import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Send, Sparkles } from 'lucide-react';
import { Button, Input } from '../../components/UI';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Vui lòng nhập email để gửi yêu cầu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setError('Bạn vừa yêu cầu gần đây, vui lòng đợi vài phút rồi thử lại.');
        } else {
          setError(data.error || 'Không thể gửi link đặt lại mật khẩu.');
        }
      } else {
        setSuccess(
          data.emailSent
            ? 'Đã gửi link đặt lại mật khẩu qua email. Anh vui lòng kiểm tra hộp thư.'
            : 'Yêu cầu đã được ghi nhận nhưng email chưa gửi thành công. Vui lòng liên hệ quản trị viên để được hỗ trợ an toàn.'
        );
      }
    } catch {
      setError('Không thể gửi yêu cầu quên mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-transparent relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-brand-300/40 to-rose-300/40 blur-[100px] -z-10 mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-brand-400/30 to-orange-400/30 blur-[100px] -z-10 mix-blend-multiply pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative animate-in fade-in duration-500">
        <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

          <div className="flex items-center gap-3 mb-6 relative">
            <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Quên mật khẩu</h2>
              <p className="text-sm text-gray-500">Hệ thống sẽ gửi link để anh tự đặt lại mật khẩu.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {error && (
              <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 text-emerald-600 text-sm rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} />
                <span className="font-medium">{success}</span>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />

            <Button
              type="submit"
              className="w-full py-4 text-base font-extrabold tracking-wide"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Đang gửi link...' : 'Gửi link đặt lại mật khẩu'} {!isLoading && <Send size={18} className="ml-2" />}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200/50">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600">
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
