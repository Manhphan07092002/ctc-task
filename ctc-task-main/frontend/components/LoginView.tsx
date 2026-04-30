import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User } from '../types';
import { ArrowRight, AlertCircle, Sparkles, ShieldCheck, Eye, EyeOff, BarChart3, CheckSquare, Mail, Video, Brain } from 'lucide-react';

const TECH_FEATURES = [
  { icon: Brain,       label: 'AI thông minh',      desc: 'Tự động đề xuất & tạo công việc bằng AI' },
  { icon: Video,       label: 'Họp trực tuyến',      desc: 'WebRTC tốc độ cao, không cần cài đặt' },
  { icon: ShieldCheck, label: 'Bảo mật phân quyền', desc: 'RBAC — kiểm soát quyền truy cập chi tiết' },
  { icon: BarChart3,   label: 'Báo cáo thông minh', desc: 'Theo dõi tiến độ & phân tích hiệu suất' },
  { icon: Mail,        label: 'Email nội bộ',        desc: 'Tích hợp hộp thư VNPT ngay trong app' },
  { icon: CheckSquare, label: 'Quản lý công việc',  desc: 'Kanban, subtask, deadline & nhắc nhở' },
];

export const LoginView: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const { users } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setTimeout(async () => {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleQuickAccess = async (u: User) => {
    setQuickLoading(u.id);
    setError('');
    const res = await quickLogin(u.id);
    if (!res.success) setError(res.error || 'Không thể đăng nhập nhanh cho tài khoản này.');
    setQuickLoading(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-blue-200/50 to-indigo-300/30 blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-orange-200/30 to-rose-200/20 blur-[120px]" />
      </div>

      {/* ── Wrapper căn giữa ── */}
      <div className="w-full max-w-5xl mx-auto">

        {/* Logo + tên công ty — to, căn giữa, trên đầu */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="CTC" className="h-16 w-auto object-contain drop-shadow-md mix-blend-multiply mb-3" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CTC Task</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Hệ thống quản lý nội bộ doanh nghiệp</p>
        </div>

        {/* 2 cột nội dung */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── CỘT TRÁI: features + stats ── */}
          <div className="flex flex-col gap-5 animate-in slide-in-from-left-6 fade-in duration-500">

            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4 w-fit">
                <Sparkles size={11} /> Nền tảng quản lý thế hệ mới
              </span>
              <h2 className="text-4xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-3">
                Quản lý công việc<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
                  thông minh hơn.
                </span>
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Tích hợp <strong className="text-gray-700">trí tuệ nhân tạo</strong>, họp trực tuyến và báo cáo trong một nền tảng duy nhất — thiết kế riêng cho doanh nghiệp Việt Nam.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {TECH_FEATURES.map(f => (
                <div key={f.label} className="flex items-start gap-3 p-3 bg-white/55 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm hover:shadow-md hover:bg-white/75 transition-all group cursor-default">
                  <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                    <f.icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 leading-tight">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-tight">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 px-5 py-3 bg-white/45 backdrop-blur-md rounded-2xl border border-white/70 w-fit">
              {[{ v: '99.9%', l: 'Uptime' }, { v: '<1s', l: 'Phản hồi' }, { v: 'AES-256', l: 'Mã hóa' }].map((s, i) => (
                <React.Fragment key={s.l}>
                  <div className="text-center">
                    <p className="text-base font-extrabold text-gray-900">{s.v}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{s.l}</p>
                  </div>
                  {i < 2 && <div className="w-px h-6 bg-gray-200" />}
                </React.Fragment>
              ))}
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang hoạt động
              </div>
            </div>

            <p className="text-[11px] text-gray-300 mt-auto">
              © {new Date().getFullYear()} Công ty Cổ phần Thương mại CTC. Bảo lưu mọi quyền.
            </p>
          </div>

          {/* ── CỘT PHẢI: form đăng nhập ── */}
          <div className="animate-in slide-in-from-right-6 fade-in duration-500">
            <div className="bg-white/80 backdrop-blur-3xl rounded-3xl shadow-xl shadow-gray-200/60 border border-white/90 p-7 sm:p-8">

              <div className="mb-6">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">Chào mừng trở lại</h3>
                <p className="text-sm text-gray-400">Đăng nhập để vào không gian làm việc của bạn.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2.5">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ Email</label>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ten.nhanvien@ctcdn.vn"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-300"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-500 hover:text-blue-600">Quên mật khẩu?</Link>
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Đang đăng nhập...
                    </>
                  ) : (<>Đăng nhập <ArrowRight size={16} /></>)}
                </button>
              </form>

              {/* Quick access */}
              {users && users.length > 0 && (
                <div className="mt-5">
                  <div className="relative flex items-center mb-3">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Truy cập nhanh</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {users.map((u: User) => (
                      <button
                        key={u.id} type="button"
                        onClick={() => handleQuickAccess(u)}
                        disabled={quickLoading === u.id}
                        className="flex items-center gap-2.5 p-2.5 bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm rounded-xl transition-all text-left group disabled:opacity-50"
                      >
                        {quickLoading === u.id
                          ? <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                          : <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt="" className="w-8 h-8 rounded-full border border-gray-100 flex-shrink-0 object-cover" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate leading-tight">{u.name}</p>
                          <p className="text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors truncate">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-3">
              Gặp sự cố? Liên hệ <span className="font-semibold text-gray-500">IT hỗ trợ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
