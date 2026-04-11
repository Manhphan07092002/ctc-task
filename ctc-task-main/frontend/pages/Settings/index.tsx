
import React, { useState, useEffect } from 'react';
import { User, Bell, Moon, Sun, Lock, Shield, Save, CheckCircle, Camera, Globe, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button, Card, Avatar } from "../../components/UI";
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { saveUser } from '../../services/userService';

export const SettingsView: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUserSession } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [taskNotifs, setTaskNotifs] = useState(true);
  const [reportNotifs, setReportNotifs] = useState(true);
  const [meetingNotifs, setMeetingNotifs] = useState(true);

  // Appearance
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatar || '');
      setBio('');
    }
  }, [user]);

  if (!user) return null;

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveProfile = async () => {
    try {
      const updatedUser = { ...user, name, avatar: avatarUrl };
      await saveUser(updatedUser);
      updateUserSession(updatedUser);
      showSaveSuccess();
    } catch (e) {
      alert('Lưu thất bại, vui lòng thử lại.');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { alert('Ảnh quá lớn! Tối đa 800KB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSavePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPassword) { setPwError('Vui lòng nhập mật khẩu hiện tại.'); return; }
    if (newPassword.length < 6) { setPwError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Mật khẩu xác nhận không khớp.'); return; }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data.error || 'Đổi mật khẩu thất bại.');
        return;
      }

      setPwSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch {
      setPwError('Đổi mật khẩu thất bại.');
    }
  };

  const TABS = [
    { id: 'profile',       label: 'Hồ sơ của tôi',  icon: User },
    { id: 'notifications', label: 'Thông báo',        icon: Bell },
    { id: 'appearance',    label: 'Giao diện',        icon: Moon },
    { id: 'security',      label: 'Bảo mật',          icon: Lock },
  ];

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-blue-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Avatar */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
              <div className="relative group">
                <Avatar src={avatarUrl || user.avatar} alt={name} size={20} />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={18} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg transition-colors mb-1">
                    <Camera size={14} /> Đổi ảnh đại diện
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, GIF hoặc PNG. Tối đa 800KB</p>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng ban</label>
                <input defaultValue={user.department} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input defaultValue={user.email} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vai trò</label>
                <input defaultValue={user.role} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới thiệu bản thân</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Viết vài dòng về bản thân..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm resize-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {saveSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle size={15} /> Đã lưu thành công!
                </span>
              )}
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Save size={15} /> Lưu thay đổi
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Thông báo Email</h3>
              {[
                { label: 'Báo cáo cần duyệt', desc: 'Nhận email khi có báo cáo chờ phê duyệt', checked: reportNotifs, onChange: setReportNotifs },
                { label: 'Công việc được giao', desc: 'Nhận email khi được giao thêm công việc mới', checked: taskNotifs, onChange: setTaskNotifs },
                { label: 'Nhắc nhở cuộc họp', desc: 'Nhận email 30 phút trước khi cuộc họp bắt đầu', checked: meetingNotifs, onChange: setMeetingNotifs },
                { label: 'Tổng kết hàng ngày', desc: 'Nhận tóm tắt công việc mỗi sáng', checked: emailNotifs, onChange: setEmailNotifs },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={item.checked} onChange={item.onChange} />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={showSaveSuccess}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Save size={15} /> Lưu cài đặt
              </button>
            </div>
            {saveSuccess && <p className="text-sm text-green-600 text-right flex items-center justify-end gap-1.5"><CheckCircle size={15}/> Đã lưu!</p>}
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Ngôn ngữ hệ thống</h3>
              <div className="flex gap-3">
                {[
                  { value: 'vi', label: '🇻🇳  Tiếng Việt' },
                  { value: 'en', label: '🇺🇸  English' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value as 'vi' | 'en')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-all ${language === opt.value ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Thay đổi sẽ có hiệu lực sau khi tải lại trang.</p>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Thông tin tài khoản</h3>
              <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">ID người dùng:</span> <span className="font-mono ml-1 text-gray-700">{user.id}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="ml-1 text-gray-700">{user.email}</span></div>
                <div><span className="text-gray-500">Phòng ban:</span> <span className="ml-1 text-gray-700">{user.department}</span></div>
                <div><span className="text-gray-500">Vai trò:</span> <span className="ml-1 text-gray-700">{user.role}</span></div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Đổi mật khẩu</h3>
              <div className="space-y-4 max-w-md">
                {[
                  { label: 'Mật khẩu hiện tại', value: currentPassword, onChange: setCurrentPassword, show: showCurrentPw, toggle: setShowCurrentPw },
                  { label: 'Mật khẩu mới', value: newPassword, onChange: setNewPassword, show: showNewPw, toggle: setShowNewPw },
                  { label: 'Xác nhận mật khẩu mới', value: confirmPassword, onChange: setConfirmPassword, show: showNewPw, toggle: setShowNewPw },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                      />
                      <button type="button" onClick={() => field.toggle(!field.show)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {field.show ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                ))}

                {pwError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                    <AlertTriangle size={14}/> {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2.5">
                    <CheckCircle size={14}/> {pwSuccess}
                  </div>
                )}

                <button
                  onClick={handleSavePassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <Shield size={15}/> Cập nhật mật khẩu
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Phiên đăng nhập</h3>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Thiết bị hiện tại</p>
                  <p className="text-xs text-gray-500 mt-0.5">Trình duyệt Web · {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Đang hoạt động</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Cài đặt</h2>
        <p className="text-gray-500 text-sm mt-1">Quản lý hồ sơ và tuỳ chỉnh trải nghiệm của bạn</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <Card className="w-full lg:w-56 h-fit p-2 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all mb-1
                ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
              `}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </Card>

        {/* Main Content */}
        <Card className="flex-1 p-7 min-h-[480px]">
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">{TABS.find(t => t.id === activeTab)?.label}</h3>
          </div>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};
