import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, Inbox, Trash2, Edit3, X, RefreshCw,
  Paperclip, Search, Star, ChevronDown, Wifi, WifiOff, Reply
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import DOMPurify from 'dompurify';

interface Email {
  id: number;
  subject: string;
  from: string;
  fromName: string;
  to?: string;
  toName?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder?: string;
}

interface FullEmail extends Email {
  to?: string;
  html: string;
  attachments: { filename: string; contentType: string; size: number; content: string | null }[];
}

type FolderKey = 'inbox' | 'sent' | 'starred' | 'trash';

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString('vi-VN', { weekday: 'short' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function MailPage() {
  const { user } = useAuth();
  const { showToast, pushLocalNotification } = useNotifications();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginEmail, setLoginEmail] = useState(user?.email || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox');
  const [inbox, setInbox] = useState<Email[]>([]);
  const [filtered, setFiltered] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMail, setSelectedMail] = useState<FullEmail | null>(null);
  const [isLoadingMail, setIsLoadingMail] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Autocomplete recipients
  const [allRecipients, setAllRecipients] = useState<{email: string; name: string; count: number}[]>([]);
  const [suggestions, setSuggestions] = useState<{email: string; name: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const toInputRef = useRef<HTMLInputElement>(null);

  const fetchInbox = useCallback(async (folder: FolderKey = activeFolder) => {
    setIsLoading(true);
    setSelectedMail(null);
    try {
      const res = await apiFetch(`/api/mail/inbox?folder=${folder}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('401');
        throw new Error('Failed');
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
  }, [activeFolder]);

  useEffect(() => { fetchInbox(activeFolder); }, [activeFolder]);

  // Fetch recipient suggestions when compose opens
  useEffect(() => {
    if (!isComposing || allRecipients.length > 0) return;
    apiFetch('/api/mail/recipients').then(r => r.ok ? r.json() : []).then(data => {
      setAllRecipients(data || []);
    }).catch(() => {});
  }, [isComposing]);

  // Update suggestions when composeTo changes
  useEffect(() => {
    if (!composeTo) { setSuggestions([]); setShowSuggestions(false); return; }
    // Get the last token (after last comma+space)
    const parts = composeTo.split(',');
    const query = parts[parts.length - 1].trim().toLowerCase();
    if (query.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    const filtered = allRecipients
      .filter(r => r.email.toLowerCase().includes(query) || r.name.toLowerCase().includes(query))
      .slice(0, 6);
    setSuggestions(filtered);
    setSuggestionIdx(-1);
    setShowSuggestions(filtered.length > 0);
  }, [composeTo, allRecipients]);

  const pickSuggestion = (email: string) => {
    const parts = composeTo.split(',');
    parts[parts.length - 1] = ' ' + email;
    const newVal = parts.join(',').replace(/^,\s*/, '') + ', ';
    setComposeTo(newVal.trimStart());
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionIdx(-1);
    setTimeout(() => toInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(inbox.filter(m =>
      (m.fromName || m.from).toLowerCase().includes(q) ||
      (m.toName || m.to || '').toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q)
    ));
  }, [search, inbox]);

  const switchFolder = (f: FolderKey) => {
    setActiveFolder(f);
    setSearch('');
    setSelectedMail(null);
  };

  const toggleStar = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !email.isStarred;
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: newVal } : m));
    try {
      await apiFetch(`/api/mail/message/${email.id}/star`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: email.folder || 'INBOX', starred: newVal }),
      });
    } catch { /* revert */ setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: !newVal } : m)); }
  };

  const deleteMail = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    setInbox(prev => prev.filter(m => m.id !== email.id));
    if (selectedMail?.id === email.id) setSelectedMail(null);
    try {
      await apiFetch(`/api/mail/message/${email.id}?folder=${email.folder || 'INBOX'}`, { method: 'DELETE' });
      showToast({ type: 'info', title: 'Đã xoá email' });
    } catch { showToast({ type: 'error', title: 'Xoá thất bại' }); }
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
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: true } : m));
    try {
      const folder = email.folder || 'INBOX';
      const res = await apiFetch(`/api/mail/message/${email.id}?folder=${encodeURIComponent(folder)}`);
      if (res.ok) setSelectedMail(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMail(false);
    }
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      showToast({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập người nhận và tiêu đề.' });
      return;
    }
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', composeTo);
      formData.append('subject', composeSubject);
      formData.append('body', composeBody);
      
      console.log('Sending attachments:', composeAttachments.length);
      composeAttachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await apiFetch('/api/mail/send', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      const resData = await res.json();
      setIsComposing(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeAttachments([]);
      showToast({ type: 'success', title: 'Gửi thành công!', message: resData.message || `Email đến "${composeTo}" đã được gửi.` });
      if (user) {
        pushLocalNotification({
          userId: user.id, type: 'mail_sent',
          title: '📧 Email đã gửi',
          message: `Tiêu đề: "${composeSubject}" → ${composeTo}`,
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Gửi thất bại', message: err.message || 'Lỗi không xác định.' });
    } finally {
      setIsSending(false);
    }
  };

  // ──────────────────────────────────────────────
  // CONNECT SCREEN
  // ──────────────────────────────────────────────
  if (isConnected === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw className="animate-spin" size={32} />
          <p className="text-sm">Đang kiểm tra kết nối mail...</p>
        </div>
      </div>
    );
  }

  if (isConnected === false) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf0ff 100%)' }}>
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Mail size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-1">Kết nối Hộp Thư</h2>
          <p className="text-center text-gray-400 mb-8 text-sm leading-relaxed">
            Nhập mật khẩu hòm thư <span className="font-semibold text-blue-600">{loginEmail}</span><br />để đồng bộ email VNPT của bạn.
          </p>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email" required value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mật khẩu Email</label>
              <input
                type="password" required value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50 focus:bg-white"
                placeholder="••••••••••••"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <WifiOff size={16} className="flex-shrink-0" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isConnecting ? <RefreshCw className="animate-spin" size={18} /> : <Wifi size={18} />}
              {isConnecting ? 'Đang kết nối...' : 'Kết Nối Máy Chủ VNPT'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // MAIN MAIL UI
  // ──────────────────────────────────────────────
  const unread = inbox.filter(m => !m.isRead).length;

  return (
    <div className="h-full flex overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white relative">

      {/* ── INBOX LIST ── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">

        {/* Compact header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Mail size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-tight">Hộp Thư</p>
              <p className="text-[10px] text-gray-400 truncate max-w-[130px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => fetchInbox(activeFolder)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsComposing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Edit3 size={12} /> Soạn thư
            </button>
          </div>
        </div>

        {/* Folder tabs */}
        <div className="flex border-b border-gray-100 bg-white">
          {([
            { key: 'inbox',   label: 'Hộp đến', icon: Inbox },
            { key: 'sent',    label: 'Đã gửi', icon: Send },
            { key: 'starred', label: 'Sao',      icon: Star },
            { key: 'trash',   label: 'Rác',      icon: Trash2 },
          ] as { key: FolderKey; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchFolder(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors border-b-2
                ${activeFolder === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tất cả ({filtered.length})</span>
            {unread > 0 && <span className="text-[11px] text-blue-600 font-medium">{unread} chưa đọc</span>}
          </div>
        </div>

        {/* Mail list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && inbox.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
              Đang tải hộp thư...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Mail size={32} className="opacity-30 mx-auto mb-2" />
              Không có email nào.
            </div>
          ) : (
            filtered.map(email => {
              const isSelected = selectedMail?.id === email.id;
              const displayName = activeFolder === 'sent'
                ? (email.toName || email.to || 'Không rõ')
                : (email.fromName || email.from);
              return (
                <div
                  key={email.id}
                  onClick={() => readMail(email)}
                  className={`relative flex gap-3 p-3.5 cursor-pointer transition-all border-b border-gray-100/80 group
                    ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : email.isRead ? 'hover:bg-gray-50' : 'bg-white border-l-2 border-l-blue-400 hover:bg-blue-50/30'}
                  `}
                >
                  <Avatar name={displayName} size={9} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs truncate max-w-[120px] ${!email.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        {displayName}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-1">{formatDate(email.date)}</span>
                    </div>
                    <p className={`text-xs truncate ${!email.isRead ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                      {email.subject || '(Không có tiêu đề)'}
                    </p>
                  </div>
                  {/* Actions (hover reveal) */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm px-1">
                    <button
                      onClick={e => toggleStar(email, e)}
                      className={`p-1 rounded transition-colors ${email.isStarred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
                      title={email.isStarred ? 'Bỏ sao' : 'Gắn sao'}
                    >
                      <Star size={13} fill={email.isStarred ? 'currentColor' : 'none'} />
                    </button>
                    {activeFolder !== 'trash' && (
                      <button
                        onClick={e => deleteMail(email, e)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                        title="Xoá"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {!email.isRead && !email.isStarred && (
                    <span className="absolute right-3 top-3 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 group-hover:hidden" />
                  )}
                  {email.isStarred && (
                    <Star size={11} className="absolute right-3 top-3 text-amber-400 fill-amber-400 group-hover:hidden" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── READING PANE ── */}
      <div className="flex-1 hidden md:flex flex-col bg-white overflow-hidden">
        {isLoadingMail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="animate-spin" size={24} />
              <p className="text-sm">Đang tải email...</p>
            </div>
          </div>
        ) : selectedMail ? (
          <>
            {/* Mail header bar */}
            <div className="px-8 py-5 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{selectedMail.subject}</h2>
              <div className="flex items-center gap-4">
                <Avatar name={
                  activeFolder === 'sent'
                    ? (selectedMail.toName || selectedMail.to || 'Unknown')
                    : (selectedMail.fromName || selectedMail.from)
                } size={11} />
                <div className="flex-1 min-w-0">
                  {activeFolder === 'sent' ? (
                    <>
                      <p className="font-semibold text-gray-800 text-sm">Đến: {selectedMail.to || selectedMail.from}</p>
                      <p className="text-xs text-gray-400">Bạn → {selectedMail.to}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-800 text-sm">{selectedMail.fromName || selectedMail.from}</p>
                      <p className="text-xs text-gray-400">&lt;{selectedMail.from}&gt; → tôi</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <span>{new Date(selectedMail.date).toLocaleString('vi-VN')}</span>
                  <button
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${selectedMail.isStarred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
                    title={selectedMail.isStarred ? 'Bỏ sao' : 'Gắn sao'}
                    onClick={() => toggleStar(selectedMail, { stopPropagation: () => {} } as any)}
                  >
                    <Star size={16} fill={selectedMail.isStarred ? 'currentColor' : 'none'} />
                  </button>
                  {activeFolder !== 'sent' && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Trả lời"
                      onClick={() => {
                        setComposeTo(selectedMail.from);
                        setComposeSubject('Re: ' + selectedMail.subject);
                        setIsComposing(true);
                      }}
                    >
                      <Reply size={16} />
                    </button>
                  )}
                  {activeFolder !== 'trash' && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Xoá"
                      onClick={e => deleteMail(selectedMail, e as any)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments */}
            {selectedMail.attachments?.length > 0 && (
              <div className="px-8 py-3 border-b border-gray-100 flex flex-wrap gap-2 bg-gray-50/50">
                {selectedMail.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 shadow-sm">
                    <Paperclip size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate max-w-[160px]">{a.filename}</span>
                    <span className="text-gray-400">({Math.round(a.size / 1024)}KB)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMail.html || '') }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-300">
            <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Mail size={36} className="opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-400">Chọn một email để đọc</p>
              <p className="text-sm text-gray-300 mt-1">Email sẽ hiển thị tại đây</p>
            </div>
          </div>
        )}
      </div>

      {/* ── COMPOSE MODAL ── */}
      {isComposing && (
        <div className="absolute bottom-0 right-6 w-[520px] h-[580px] bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
          style={{ animation: 'slideUpCompose 0.25s ease-out' }}>
          {/* Header */}
          <div className="h-13 px-5 py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-blue-400" />
              <span className="font-semibold text-white text-sm">Thư mới</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsComposing(false)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <ChevronDown size={16} />
              </button>
              <button onClick={() => setIsComposing(false)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="flex flex-col border-b border-gray-100">
            <div className="relative flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Đến</span>
              <input
                ref={toInputRef}
                type="text" placeholder="email1@..., email2@..."
                title="Nhập các email cách nhau bởi dấu phẩy"
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (!showSuggestions) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' || e.key === 'Tab') { if (suggestionIdx >= 0) { e.preventDefault(); pickSuggestion(suggestions[suggestionIdx].email); } }
                  else if (e.key === 'Escape') { setShowSuggestions(false); }
                }}
                className="flex-1 text-sm focus:outline-none text-gray-800 placeholder-gray-300"
              />
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden mt-1" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.13)'}}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s.email}
                      onMouseDown={() => pickSuggestion(s.email)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        i === suggestionIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(s.name || s.email)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {(s.name || s.email)[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {s.name && <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>}
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                      {s.name && <span className="ml-auto text-[10px] text-gray-300">↵</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Tiêu đề</span>
              <input
                type="text" placeholder="Nhập tiêu đề..."
                value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                className="flex-1 text-sm font-medium focus:outline-none text-gray-800 placeholder-gray-300"
              />
            </div>
            
            {/* Attachments List */}
            {composeAttachments.length > 0 && (
              <div className="px-5 py-2 bg-gray-50 max-h-20 overflow-y-auto flex flex-wrap gap-2">
                {composeAttachments.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded text-xs px-2 py-1 shadow-sm">
                    <span className="text-gray-600 max-w-[120px] truncate" title={f.name}>{f.name}</span>
                    <button 
                      onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <textarea
            placeholder="Viết nội dung email..."
            value={composeBody} onChange={e => setComposeBody(e.target.value)}
            className="flex-1 px-5 py-4 resize-none focus:outline-none text-sm text-gray-700 leading-relaxed placeholder-gray-300"
          />

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-200 disabled:opacity-60"
              >
                {isSending ? <RefreshCw className="animate-spin" size={15} /> : <Send size={15} />}
                {isSending ? 'Đang gửi...' : 'Gửi'}
              </button>
              
              <div className="flex items-center">
                <input 
                  id="mail-attachment-input"
                  type="file" multiple className="hidden" 
                  onChange={e => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const newFiles = Array.from(files);
                      setComposeAttachments(prev => {
                        const allFiles = [...prev, ...newFiles];
                        const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);
                        if (totalSize > 25 * 1024 * 1024) {
                          showToast({ type: 'error', title: 'Quá dung lượng', message: 'Tổng dung lượng đính kèm không được vượt quá 25MB.' });
                          return prev;
                        }
                        return allFiles;
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <label 
                  htmlFor="mail-attachment-input"
                  className="p-2.5 flex text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer" 
                  title="Đính kèm tệp (Tối đa 25MB)"
                >
                  <Paperclip size={18} />
                </label>
              </div>
            </div>
            
            <button onClick={() => { setIsComposing(false); setComposeAttachments([]); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpCompose {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
