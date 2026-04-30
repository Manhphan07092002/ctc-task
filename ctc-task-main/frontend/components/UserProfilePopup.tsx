import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Phone, MapPin, Calendar, Info, CreditCard, Users } from 'lucide-react';
import { Avatar } from './UI';
import { User, Role } from '../types';
import { getSignature } from '../pages/Mail/utils';

interface UserProfilePopupProps {
  user: User; // The currently logged-in user (for mail signature)
  selectedUser: User;
  roles: Role[];
  onClose: () => void;
}

export const UserProfilePopup: React.FC<UserProfilePopupProps> = ({ user, selectedUser, roles, onClose }) => {
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ zIndex: 999999 }}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
        >
          <X size={18} />
        </button>
        
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
          <div className="absolute -bottom-12 inset-x-0 flex justify-center">
            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg">
              <Avatar src={selectedUser.avatar} alt={selectedUser.name} size={24} />
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 pb-8 px-6 text-center max-h-[80vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedUser.name}</h3>
          
          {(() => {
            const roleObj = roles.find(r => r.name === selectedUser.role);
            const roleColor = roleObj?.color || '#3b82f6';
            return (
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{ backgroundColor: roleColor + '18', color: roleColor, borderColor: roleColor + '44' }}>
                  {selectedUser.role}
                </span>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  {selectedUser.department}
                </span>
              </div>
            )
          })()}

          <div className="grid grid-cols-1 gap-1 text-left bg-gray-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-600">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600 p-2 rounded-xl transition-colors"
              onClick={() => {
                localStorage.setItem('mail_draft', JSON.stringify({ to: selectedUser.email, cc: '', bcc: '', subject: '', body: getSignature(user) }));
                navigate('/mail');
              }}
              title="Gửi email"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Email</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold truncate hover:underline">{selectedUser.email}</p>
              </div>
            </div>
            
            <div 
              className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${selectedUser.phone ? 'cursor-pointer hover:bg-green-50 dark:hover:bg-slate-600' : ''}`}
              onClick={() => {
                if (selectedUser.phone) window.location.href = `tel:${selectedUser.phone}`;
              }}
              title={selectedUser.phone ? "Gọi điện" : ""}
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Điện thoại</p>
                {selectedUser.phone ? (
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold truncate hover:underline">{selectedUser.phone}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Chưa cập nhật</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Ngày sinh</p>
                {selectedUser.dob ? (
                  <p className="text-sm text-gray-800 dark:text-slate-200 font-semibold truncate">
                    {selectedUser.dob.split('-').length === 3 
                      ? selectedUser.dob.split('-').reverse().join('/') 
                      : selectedUser.dob}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Chưa cập nhật</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Quê quán</p>
                {selectedUser.hometown ? (
                  <p className="text-sm text-gray-800 dark:text-slate-200 font-semibold truncate">{selectedUser.hometown}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Chưa cập nhật</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                <CreditCard size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">CCCD / ID</p>
                {selectedUser.cccd ? (
                  <p className="text-sm text-gray-800 dark:text-slate-200 font-semibold truncate">{selectedUser.cccd}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Chưa cập nhật</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                <Users size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Giới tính</p>
                {selectedUser.gender ? (
                  <p className="text-sm text-gray-800 dark:text-slate-200 font-semibold truncate">{selectedUser.gender}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Chưa cập nhật</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-left p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <div className="flex items-center gap-2 mb-1.5 text-indigo-700 dark:text-indigo-400">
              <Info size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Giới thiệu</span>
            </div>
            {selectedUser.bio ? (
              <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 italic line-clamp-3">
                "{selectedUser.bio}"
              </p>
            ) : (
              <p className="text-sm text-indigo-900/50 dark:text-indigo-200/50 italic">
                Chưa có thông tin giới thiệu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
