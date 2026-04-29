import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, FileText, Trash2, Edit3, X, RefreshCw, User, Paperclip } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Button } from '../../components/UI';
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';

interface Email {
  id: number;
  subject: string;
  from: string;
  fromName: string;
  date: string;
  isRead: boolean;
}

interface FullEmail extends Email {
  html: string;
  attachments: { filename: string; contentType: string; size: number; content: string | null }[];
}

export default function MailPage() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginEmail, setLoginEmail] = useState(user?.email || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [inbox, setInbox] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMail, setSelectedMail] = useState<FullEmail | null>(null);
  const [isLoadingMail, setIsLoadingMail] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/mail/inbox');
      if (!res.ok) {
        if (res.status === 401) throw new Error('401');
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      const data = await res.json();
      setInbox(data);
      setIsConnected(true);
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('No mail credentials')) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setLoginError('');
    try {
      const res = await apiFetch('/api/mail/connect', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setIsConnected(true);
      fetchInbox();
    } catch (err: any) {
      setLoginError(err.message || 'Kết nối thất bại. Vui lòng kiểm tra lại mật khẩu.');
    } finally {
      setIsConnecting(false);
    }
  };

  const readMail = async (email: Email) => {
    setIsLoadingMail(true);
    setSelectedMail(null);
    // Optimistic read
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: true } : m));
    try {
      const res = await apiFetch(`/api/mail/message/${email.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMail(false);
    }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject) return alert('Vui lòng nhập người nhận và tiêu đề');
    setIsSending(true);
    try {
      const res = await apiFetch('/api/mail/send', {
        method: 'POST',
        body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setIsComposing(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      alert('Đã gửi email thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (isConnected === null) {
    return <div className="h-full flex items-center justify-center"><RefreshCw className="animate-spin text-brand-500" /></div>;
  }

  if (isConnected === false) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Kết nối Email Công Ty</h2>
          <p className="text-center text-gray-500 mb-6 text-sm">Vui lòng nhập mật khẩu hòm thư <b>{loginEmail}</b> (Domain: ctcdn.vn) để đồng bộ email.</p>
          
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu Email</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nhập mật khẩu email..." />
            </div>
            {loginError && <p className="text-sm text-red-500 font-medium">{loginError}</p>}
            <Button type="submit" disabled={isConnecting} className="w-full !rounded-xl py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              {isConnecting ? <RefreshCw className="animate-spin mx-auto" size={20} /> : 'Kết Nối Máy Chủ VNPT'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Hộp Thư Nội Bộ</h2>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchInbox} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-64 border-r border-gray-200 p-4 bg-gray-50/30 flex flex-col gap-2 hidden md:flex">
          <Button onClick={() => setIsComposing(true)} className="w-full mb-4 !rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Edit3 size={18} className="mr-2" /> Soạn thư
          </Button>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium">
            <Inbox size={18} /> Hộp thư đến {inbox.filter(m => !m.isRead).length > 0 && <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{inbox.filter(m => !m.isRead).length}</span>}
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            <Send size={18} /> Đã gửi
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            <FileText size={18} /> Thư nháp
          </button>
        </div>

        {/* INBOX LIST */}
        <div className="w-full md:w-2/5 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
            {isLoading && inbox.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><RefreshCw className="animate-spin mx-auto mb-2" /> Đang tải hộp thư...</div>
            ) : inbox.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Không có email nào.</div>
            ) : (
              inbox.map(email => (
                <div 
                  key={email.id} 
                  onClick={() => readMail(email)}
                  className={`p-4 cursor-pointer transition-colors border-l-4 ${selectedMail?.id === email.id ? 'bg-blue-50 border-l-blue-500' : email.isRead ? 'hover:bg-gray-50 border-l-transparent' : 'bg-gray-50/80 border-l-brand-400'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm truncate ${!email.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{email.fromName || email.from}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{new Date(email.date).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <h4 className={`text-sm mb-1 truncate ${!email.isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{email.subject || '(Không có tiêu đề)'}</h4>
                </div>
              ))
            )}
          </div>
        </div>

        {/* READING PANE */}
        <div className="flex-1 hidden md:flex flex-col bg-white overflow-hidden relative">
          {isLoadingMail ? (
            <div className="flex-1 flex items-center justify-center text-gray-400"><RefreshCw className="animate-spin" /></div>
          ) : selectedMail ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedMail.subject}</h2>
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg font-bold">
                  {selectedMail.fromName?.charAt(0)?.toUpperCase() || <User size={20} />}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selectedMail.fromName || selectedMail.from}</p>
                  <p className="text-xs text-gray-500">&lt;{selectedMail.from}&gt; tới tôi</p>
                </div>
                <div className="ml-auto text-sm text-gray-400">
                  {new Date(selectedMail.date).toLocaleString('vi-VN')}
                </div>
              </div>

              {/* Attachments */}
              {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {selectedMail.attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      <Paperclip size={14} className="text-gray-400" />
                      <span className="truncate max-w-[200px]">{a.filename}</span>
                      <span className="text-xs text-gray-400">({Math.round(a.size/1024)}KB)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Mail Body */}
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMail.html || '') }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <Mail size={64} className="opacity-20 mb-4" />
              <p>Chọn một email để đọc</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE MODAL */}
      {isComposing && (
        <div className="absolute bottom-0 right-8 w-[500px] h-[600px] bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-8 duration-300">
          <div className="h-12 bg-gray-900 text-white rounded-t-2xl px-4 flex items-center justify-between">
            <span className="font-medium text-sm">Thư mới</span>
            <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
          </div>
          <div className="flex-1 flex flex-col p-4">
            <input 
              type="email" 
              placeholder="Người nhận" 
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 text-sm"
            />
            <input 
              type="text" 
              placeholder="Tiêu đề" 
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
              className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 font-medium text-sm"
            />
            <textarea 
              placeholder="Nội dung email..." 
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              className="flex-1 w-full resize-none py-4 focus:outline-none text-sm"
            />
          </div>
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <Button onClick={handleSend} disabled={isSending} className="!rounded-full px-6 bg-blue-600 hover:bg-blue-700 shadow-md">
              {isSending ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />} Gửi
            </Button>
            <button onClick={() => setIsComposing(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
