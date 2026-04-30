import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, Inbox, Trash2, Edit3, X, RefreshCw,
  Paperclip, Search, Star, ChevronDown, Wifi, WifiOff, Reply,
  MailOpen, Forward, Download, MailX, Bold, Italic, Underline, Link, Filter,
  Users, Building2, UserCircle2, PhoneCall, ExternalLink
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());
  const [selectAllInMailbox, setSelectAllInMailbox] = useState(false);
  const [totalMailboxCount, setTotalMailboxCount] = useState(0);
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'single'; email: Email } | { type: 'bulk' } | null>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStarred, setFilterStarred] = useState(false);
  const [filterHasAttachment, setFilterHasAttachment] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement>(null);

  // Contacts / Address Book
  interface Contact { id: string | null; name: string; email: string; department: string; avatar: string; source: 'company' | 'external'; }
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<{ company: Contact[]; external: Contact[] }>({ company: [], external: [] });
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLastUpdated, setContactsLastUpdated] = useState<Date | null>(null);
  const [contactsError, setContactsError] = useState('');

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    setContactsError('');
    try {
      const res = await apiFetch('/api/mail/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        setContactsLastUpdated(new Date());
        showToast({
          type: 'success',
          title: 'Danh bạ đã cập nhật',
          message: `${data.company?.length || 0} nhân viên • ${data.external?.length || 0} liên lạc ngoài`,
        });
      } else {
        throw new Error('Không thể tải danh bạ');
      }
    } catch (err: any) {
      const msg = err.message || 'Lỗi không xác định';
      setContactsError(msg);
      showToast({ type: 'error', title: 'Quét danh bạ thất bại', message: msg });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Autocomplete recipients
  const [allRecipients, setAllRecipients] = useState<{email: string; name: string; count: number}[]>([]);
  const [suggestions, setSuggestions] = useState<{email: string; name: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const toInputRef = useRef<HTMLInputElement>(null);

  const inboxRef = useRef<Email[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load drafts on mount
  useEffect(() => {
    const draftStr = localStorage.getItem('mail_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.to || draft.subject || draft.body || draft.cc || draft.bcc) {
          setComposeTo(draft.to || '');
          setComposeCc(draft.cc || '');
          setComposeBcc(draft.bcc || '');
          if (draft.cc) setShowCc(true);
          if (draft.bcc) setShowBcc(true);
          setComposeSubject(draft.subject || '');
          setComposeBody(draft.body || '');
          setIsComposing(true);
        }
      } catch {}
    }
  }, []);

  // Save drafts when changed
  useEffect(() => {
    if (isComposing) {
      localStorage.setItem('mail_draft', JSON.stringify({ 
        to: composeTo, cc: composeCc, bcc: composeBcc, 
        subject: composeSubject, body: composeBody 
      }));
    } else {
      localStorage.removeItem('mail_draft');
    }
  }, [composeTo, composeCc, composeBcc, composeSubject, composeBody, isComposing]);

  // Sync programmatic changes to composeBody (e.g. Forward, Reply) into the contentEditable div
  useEffect(() => {
    if (isComposing && bodyRef.current && bodyRef.current.innerHTML !== composeBody) {
      bodyRef.current.innerHTML = composeBody;
    }
  }, [isComposing, composeBody]);

  const fetchInbox = useCallback(async (folder: FolderKey = activeFolder, silent = false, pageNum = 1) => {
    if (!silent && pageNum === 1) setIsLoading(true);
    if (!silent && pageNum === 1) setSelectedMail(null);
    try {
      const res = await apiFetch(`/api/mail/inbox?folder=${folder}&page=${pageNum}&limit=50`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('401');
        throw new Error('Failed');
      }
      const data: Email[] = await res.json();
      // Detect new mail during silent poll
      if (silent && inboxRef.current.length > 0) {
        const oldIds = new Set(inboxRef.current.map(m => m.id));
        const newMails = data.filter(m => !oldIds.has(m.id));
        if (newMails.length > 0) {
          showToast({
            type: 'info',
            title: `📩 ${newMails.length} thư mới`,
            message: newMails[0].subject || '(Không có tiêu đề)',
          });
        }
      }
      
      setHasMore(data.length === 50);
      
      if (pageNum === 1) {
        inboxRef.current = data;
        setInbox(data);
      } else {
        const newInbox = [...inboxRef.current, ...data];
        // Deduplicate
        const uniqueInbox = Array.from(new Map(newInbox.map(item => [item.id, item])).values());
        inboxRef.current = uniqueInbox;
        setInbox(uniqueInbox);
      }
      
      setIsConnected(true);
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('No mail credentials')) {
        setIsConnected(false);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeFolder]);

  useEffect(() => { 
    setPage(1); 
    setHasMore(true);
    fetchInbox(activeFolder, false, 1); 
  }, [activeFolder]);

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

  // Close date filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setShowDateFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(inbox.filter(m => {
      const matchSearch =
        (m.fromName || m.from).toLowerCase().includes(q) ||
        (m.toName || m.to || '').toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q);
      const matchUnread = !filterUnread || !m.isRead;
      const matchStarred = !filterStarred || m.isStarred;
      // Date range filter
      let matchDate = true;
      if (filterDateFrom || filterDateTo) {
        const mailDate = new Date(m.date);
        mailDate.setHours(0, 0, 0, 0);
        if (filterDateFrom) {
          const from = new Date(filterDateFrom);
          from.setHours(0, 0, 0, 0);
          if (mailDate < from) matchDate = false;
        }
        if (filterDateTo && matchDate) {
          const to = new Date(filterDateTo);
          to.setHours(23, 59, 59, 999);
          if (mailDate > to) matchDate = false;
        }
      }
      return matchSearch && matchUnread && matchStarred && matchDate;
    }));
  }, [search, inbox, filterUnread, filterStarred, filterDateFrom, filterDateTo]);

  const switchFolder = (f: FolderKey) => {
    setActiveFolder(f);
    setSearch('');
    setSelectedMail(null);
    setSelectedUids(new Set());
    setSelectAllInMailbox(false);
    setTotalMailboxCount(0);
    setFilterDateFrom('');
    setFilterDateTo('');
    setShowDateFilter(false);
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

  const toggleRead = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !email.isRead;
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: newVal } : m));
    if (selectedMail?.id === email.id) setSelectedMail(prev => prev ? { ...prev, isRead: newVal } : prev);
    try {
      await apiFetch(`/api/mail/message/${email.id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: email.folder || 'INBOX', isRead: newVal }),
      });
    } catch { setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: !newVal } : m)); }
  };

  const handleReply = (mail: FullEmail) => {
    const quotedBody = `<br><br><blockquote style="border-left: 2px solid #ccc; margin-left: 0; padding-left: 10px; color: #666;">
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>Từ:</strong> ${mail.from}<br>
        <strong>Ngày:</strong> ${new Date(mail.date).toLocaleString('vi-VN')}
      </div>
      ${mail.html || ''}
    </blockquote>`;
    setComposeTo(mail.from || '');
    setComposeSubject(mail.subject?.startsWith('Re:') ? mail.subject : 'Re: ' + (mail.subject || ''));
    setComposeBody(quotedBody);
    setComposeAttachments([]);
    setIsComposing(true);
  };

  const handleForward = (mail: FullEmail) => {
    const quotedBody = `<br><br><blockquote style="border-left: 2px solid #ccc; margin-left: 0; padding-left: 10px; color: #666;">
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>------- Chuyển tiếp từ -------</strong><br>
        <strong>Từ:</strong> ${mail.from}<br>
        <strong>Ngày:</strong> ${new Date(mail.date).toLocaleString('vi-VN')}<br>
        <strong>Chủ đề:</strong> ${mail.subject}
      </div>
      ${mail.html || ''}
    </blockquote>`;
    setComposeTo('');
    setComposeSubject(mail.subject?.startsWith('Fwd:') ? mail.subject : 'Fwd: ' + (mail.subject || ''));
    setComposeBody(quotedBody);
    setComposeAttachments([]);
    setIsComposing(true);
  };

  const downloadAttachment = (a: { filename: string; content: string | null; contentType: string }) => {
    if (!a.content) { showToast({ type: 'error', title: 'File quá lớn để tải inline' }); return; }
    const byteStr = atob(a.content);
    const bytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: a.contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = a.filename; link.click();
    URL.revokeObjectURL(url);
  };


  const executeSingleDelete = async (email: Email) => {
    setInbox(prev => prev.filter(m => m.id !== email.id));
    if (selectedMail?.id === email.id) setSelectedMail(null);
    try {
      await apiFetch(`/api/mail/message/${email.id}?folder=${email.folder || 'INBOX'}`, { method: 'DELETE' });
      showToast({ 
        type: 'info', 
        title: activeFolder === 'trash' ? 'Đã xoá vĩnh viễn' : 'Đã chuyển vào thùng rác' 
      });
    } catch { showToast({ type: 'error', title: 'Xoá thất bại' }); }
  };

  const deleteMail = (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeFolder === 'trash') {
      setConfirmAction({ type: 'single', email });
    } else {
      executeSingleDelete(email);
    }
  };

  const toggleSelectMail = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUids(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAllInMailbox) {
      // Deselect all
      setSelectAllInMailbox(false);
      setSelectedUids(new Set());
    } else {
      // Select all currently loaded
      setSelectedUids(new Set(inbox.map(m => m.id)));
    }
  };

  const executeBulkAction = async (action: 'delete' | 'restore') => {
    setIsBulkActioning(true);
    const uidsArray = Array.from(selectedUids);
    try {
      const sampleEmail = inbox.find(m => m.id === uidsArray[0]) || inbox[0];
      const apiFolder = sampleEmail?.folder || 'INBOX';

      const res = await apiFetch(`/api/mail/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uids: selectAllInMailbox ? [] : uidsArray,
          action,
          folder: apiFolder,
          allInFolder: selectAllInMailbox
        })
      });
      
      if (res.ok) {
        showToast({ type: 'success', title: action === 'delete' ? 'Đã xoá thành công' : 'Đã khôi phục thành công' });
        if (selectAllInMailbox) {
          setInbox([]);
          setSelectAllInMailbox(false);
          setTotalMailboxCount(0);
        } else {
          setInbox(prev => prev.filter(m => !selectedUids.has(m.id)));
        }
        setSelectedUids(new Set());
        if (selectedMail && (selectAllInMailbox || selectedUids.has(selectedMail.id))) {
          setSelectedMail(null);
        }
      } else {
        showToast({ type: 'error', title: 'Thao tác thất bại' });
      }
    } catch {
      showToast({ type: 'error', title: 'Đã có lỗi xảy ra' });
    } finally {
      setIsBulkActioning(false);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'restore') => {
    if (selectedUids.size === 0 && !selectAllInMailbox) return;
    
    if (action === 'delete' && activeFolder === 'trash') {
      setConfirmAction({ type: 'bulk' });
      return;
    }
    
    executeBulkAction(action);
  };

  // Auto-poll every 60s silently
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      fetchInbox(activeFolder, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [isConnected, activeFolder]);

  const handleResend = (mail: FullEmail) => {
    setComposeTo(mail.to || '');
    setComposeCc('');
    setComposeBcc('');
    setShowCc(false);
    setShowBcc(false);
    setComposeSubject(mail.subject || '');
    setComposeBody(mail.html || '');
    setComposeAttachments([]);
    setIsComposing(true);
  };

  const openCompose = () => {
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setShowCc(false);
    setShowBcc(false);
    setComposeSubject('');
    setComposeBody('<br><br><span style="color: #9ca3af;">--<br>Được gửi từ hệ thống CTC Task</span>');
    setComposeAttachments([]);
    setIsComposing(true);
  };

  // Rich-text helpers for compose
  const execFormat = (cmd: string, value?: string) => {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  // Group emails by date for the list
  const groupEmailsByDate = (emails: Email[]) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate()-7);
    const groups: { label: string; items: Email[] }[] = [
      { label: 'Hôm nay', items: [] },
      { label: 'Hôm qua', items: [] },
      { label: 'Tuần trước', items: [] },
      { label: 'Cũ hơn', items: [] },
    ];
    emails.forEach(m => {
      const d = new Date(m.date); d.setHours(0,0,0,0);
      if (d >= today) groups[0].items.push(m);
      else if (d >= yesterday) groups[1].items.push(m);
      else if (d >= weekAgo) groups[2].items.push(m);
      else groups[3].items.push(m);
    });
    return groups.filter(g => g.items.length > 0);
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

  // Handle opening mail from notification (URL ?mailId=...)
  useEffect(() => {
    if (!isConnected) return;
    const params = new URLSearchParams(window.location.search);
    const mailId = params.get('mailId');
    if (mailId) {
      readMail({ id: mailId, folder: 'INBOX' } as any);
      window.history.replaceState({}, '', '/mail');
    }
  }, [isConnected]);

  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      showToast({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập người nhận và tiêu đề.' });
      return;
    }
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', composeTo);
      if (composeCc) formData.append('cc', composeCc);
      if (composeBcc) formData.append('bcc', composeBcc);
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
      setComposeTo(''); setComposeCc(''); setComposeBcc(''); setComposeSubject(''); setComposeBody(''); setComposeAttachments([]);
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
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${loginError ? 'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-200' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200'}`}>
            {loginError ? <WifiOff size={36} className="text-white" /> : <Mail size={36} className="text-white" />}
          </div>
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-1">
            {loginError ? 'Lỗi Kết Nối Email' : 'Kết nối Hộp Thư'}
          </h2>
          <p className="text-center text-gray-400 mb-8 text-sm leading-relaxed">
            {loginError
              ? <span className="text-red-500 font-medium">{loginError}</span>
              : <>Nhập mật khẩu hòm thư <span className="font-semibold text-blue-600">{loginEmail}</span><br />để đồng bộ email VNPT của bạn.</>
            }
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
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-sm transition-colors bg-gray-50 focus:bg-white ${loginError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                placeholder="••••••••••••"
              />
            </div>

            {loginError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <WifiOff size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Xác thực thất bại</p>
                  <p className="text-xs text-red-400 mt-0.5">{loginError}</p>
                </div>
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

          {/* Divider + Settings link */}
          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-2">
            <span className="text-xs text-gray-400">Hoặc cấu hình trong</span>
            <a
              href="/settings"
              onClick={e => { e.preventDefault(); window.location.hash = ''; window.history.pushState({}, '', '/settings'); window.dispatchEvent(new PopStateEvent('popstate')); }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 flex items-center gap-1"
            >
              ⚙️ Cài đặt → Cấu hình Email
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // MAIN MAIL UI
  // ──────────────────────────────────────────────
  const unread = inbox.filter(m => !m.isRead).length;

  return (
    <>
      <ConfirmDialog 
        isOpen={!!confirmAction}
        title="Xoá vĩnh viễn email"
        message={confirmAction?.type === 'bulk' ? 'Bạn có chắc chắn muốn xoá vĩnh viễn các email đã chọn không? Không thể khôi phục sau khi xoá.' : 'Bạn có chắc chắn muốn xoá vĩnh viễn email này không? Không thể khôi phục sau khi xoá.'}
        confirmText="Xoá vĩnh viễn"
        cancelText="Huỷ"
        onConfirm={() => {
          if (confirmAction?.type === 'single') executeSingleDelete(confirmAction.email);
          else if (confirmAction?.type === 'bulk') executeBulkAction('delete');
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
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
            {/* Contacts button */}
            <button
              onClick={() => {
                const opening = !showContacts;
                setShowContacts(opening);
                if (opening && contacts.company.length === 0) {
                  fetchContacts();
                }
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                showContacts ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
              }`}
              title="Danh bạ công ty"
            >
              <Users size={14} />
            </button>
            <button
              onClick={() => openCompose()}
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

        {/* Search + Filters or Bulk Actions */}
        <div className="p-3 border-b border-gray-100 space-y-2 min-h-[85px] flex flex-col justify-center">
          {(selectedUids.size > 0 || selectAllInMailbox) ? (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between bg-blue-50/80 p-2 rounded-lg border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-blue-700 px-1">
                  {selectAllInMailbox ? `Đã chọn tất cả trong hộp thư` : `Đã chọn ${selectedUids.size}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setSelectedUids(new Set()); setSelectAllInMailbox(false); }}
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 rounded transition-colors"
                  >
                    Bỏ chọn
                  </button>
                  {activeFolder === 'trash' && (
                    <button
                      onClick={() => handleBulkAction('restore')}
                      disabled={isBulkActioning}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw size={12} className={isBulkActioning ? 'animate-spin' : ''} /> Khôi phục
                    </button>
                  )}
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={isBulkActioning}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 size={12} /> {activeFolder === 'trash' ? 'Xóa vĩnh viễn' : 'Xóa'}
                  </button>
                </div>
              </div>
              {/* Banner to select ALL in mailbox when only current page is selected */}
              {!selectAllInMailbox && selectedUids.size === inbox.length && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
                  <span className="flex-1">Đã chọn {inbox.length} thư đang hiển thị. Muốn chọn toàn bộ hộp thư?</span>
                  <button
                    onClick={() => setSelectAllInMailbox(true)}
                    className="font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap underline"
                  >
                    Chọn tất cả
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative animate-fade-in">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          )}
          {/* Quick filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={toggleSelectAll}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors border ${
                selectAllInMailbox || (selectedUids.size > 0 && selectedUids.size === inbox.length)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
              }`}
              title={`Chọn tất cả ${inbox.length} thư đang tải`}
            >
              <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center transition-colors ${
                selectAllInMailbox || (selectedUids.size > 0 && selectedUids.size === inbox.length) ? 'border-white' : 'border-gray-400'
              }`}>
                {(selectAllInMailbox || (selectedUids.size > 0 && selectedUids.size === inbox.length)) &&
                  <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 text-current"><path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              Chọn trang này ({inbox.length})
            </button>
            <div className="w-px h-3 bg-gray-200 mx-1" />
            <button
              onClick={() => setFilterUnread(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${
                filterUnread ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
              }`}
            >
              <MailOpen size={10} /> Chưa đọc
            </button>
            <button
              onClick={() => setFilterStarred(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${
                filterStarred ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
              }`}
            >
              <Star size={10} /> Có sao
            </button>
            {/* Date range filter button */}
            <div className="relative" ref={dateFilterRef}>
              <button
                onClick={() => setShowDateFilter(v => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border ${
                  filterDateFrom || filterDateTo
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                }`}
                title="Lọc theo ngày"
              >
                <Filter size={10} />
                {filterDateFrom || filterDateTo ? (
                  <span>
                    {filterDateFrom ? new Date(filterDateFrom).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '...'}
                    {' – '}
                    {filterDateTo ? new Date(filterDateTo).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '...'}
                  </span>
                ) : 'Ngày'}
              </button>

              {showDateFilter && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64 animate-fade-in">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lọc theo khoảng ngày</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">Từ ngày</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={e => setFilterDateFrom(e.target.value)}
                        max={filterDateTo || undefined}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 transition-colors bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-medium">Đến ngày</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={e => setFilterDateTo(e.target.value)}
                        min={filterDateFrom || undefined}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 transition-colors bg-gray-50"
                      />
                    </div>
                  </div>
                  {/* Quick shortcuts */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Chọn nhanh</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: 'Hôm nay', fn: () => { const t = new Date().toISOString().slice(0,10); setFilterDateFrom(t); setFilterDateTo(t); } },
                        { label: 'Hôm qua', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().slice(0,10); setFilterDateFrom(s); setFilterDateTo(s); } },
                        { label: '7 ngày qua', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); setFilterDateFrom(d.toISOString().slice(0,10)); setFilterDateTo(new Date().toISOString().slice(0,10)); } },
                        { label: 'Tháng này', fn: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10); setFilterDateFrom(from); setFilterDateTo(now.toISOString().slice(0,10)); } },
                        { label: 'Tháng trước', fn: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10); const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10); setFilterDateFrom(from); setFilterDateTo(to); } },
                        { label: 'Năm nay', fn: () => { const now = new Date(); setFilterDateFrom(`${now.getFullYear()}-01-01`); setFilterDateTo(now.toISOString().slice(0,10)); } },
                      ].map(({ label, fn }) => (
                        <button
                          key={label}
                          onClick={() => { fn(); setShowDateFilter(false); }}
                          className="px-2 py-1.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-left"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(filterDateFrom || filterDateTo) && (
                    <button
                      onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setShowDateFilter(false); }}
                      className="mt-2 w-full py-1.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      Xóa bộ lọc ngày
                    </button>
                  )}
                </div>
              )}
            </div>

            {(filterUnread || filterStarred || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterUnread(false); setFilterStarred(false); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-red-500 border border-gray-200 transition-colors"
              >
                Xóa lọc
              </button>
            )}
            <span className="ml-auto text-[10px] text-gray-400">{filtered.length} thư{unread > 0 ? ` • ${unread} chưa đọc` : ''}</span>
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
            groupEmailsByDate(filtered).map(group => (
              <div key={group.label}>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                  {group.label}
                </div>
                {group.items.map(email => {
                  const isSelected = selectedMail?.id === email.id;
                  const displayName = activeFolder === 'sent'
                    ? (email.toName || email.to || 'Không rõ')
                    : (email.fromName || email.from);
                  return (
                    <div
                      key={email.id}
                      onClick={() => readMail(email)}
                      className={`relative flex gap-2.5 p-3.5 cursor-pointer transition-all border-b border-gray-100/80 group
                        ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : email.isRead ? 'hover:bg-gray-50' : 'bg-white border-l-2 border-l-blue-400 hover:bg-blue-50/30'}
                      `}
                    >
                      <div className="flex flex-col items-center pt-1" onClick={e => toggleSelectMail(email.id, e)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${selectedUids.has(email.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                          {selectedUids.has(email.id) && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white"><path d="M3 7.5L5.5 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
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
                        <button onClick={e => toggleStar(email, e)} className={`p-1 rounded transition-colors ${email.isStarred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} title={email.isStarred ? 'Bỏ sao' : 'Gắn sao'}>
                          <Star size={13} fill={email.isStarred ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={e => toggleRead(email, e)} className={`p-1 rounded transition-colors ${email.isRead ? 'text-gray-300 hover:text-blue-500' : 'text-blue-400 hover:text-gray-400'}`} title={email.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}>
                          {email.isRead ? <MailX size={13} /> : <MailOpen size={13} />}
                        </button>
                        {activeFolder !== 'trash' && (
                          <button onClick={e => deleteMail(email, e)} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors" title="Xoá">
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
                })}
              </div>
            ))
          )}
          
          {/* Load more button */}
          {!isLoading && inbox.length > 0 && hasMore && search === '' && (
            <div className="p-4 flex justify-center border-t border-gray-100">
              <button
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchInbox(activeFolder, false, nextPage);
                }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                Tải thêm email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTACTS PANEL ── */}
      {showContacts && (
        <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col bg-white overflow-hidden" style={{ animation: 'slideInRight 0.2s ease-out' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Users size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Danh Bạ</p>
                  <p className="text-[10px] text-gray-400">
                    {contacts.company.length} nhân viên
                    {contactsLastUpdated && (
                      <span className="text-gray-300 ml-1">
                        • {contactsLastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchContacts}
                  disabled={isLoadingContacts}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLoadingContacts
                      ? 'text-indigo-400 bg-indigo-50 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                  }`}
                  title={isLoadingContacts ? 'Đang quét IMAP...' : 'Quét lại danh bạ (IMAP)'}
                >
                  <RefreshCw size={13} className={isLoadingContacts ? 'animate-spin text-indigo-500' : ''} />
                </button>
                <button
                  onClick={() => setShowContacts(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            {/* Scanning progress indicator */}
            {isLoadingContacts && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[10px] text-indigo-500 font-medium">Đang quét IMAP...</span>
                </div>
                <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ animation: 'scanProgress 2s ease-in-out infinite' }} />
                </div>
              </div>
            )}
            {/* Error state */}
            {contactsError && !isLoadingContacts && (
              <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-red-50 rounded-lg border border-red-100">
                <span className="text-[10px] text-red-500 flex-1">{contactsError}</span>
                <button
                  onClick={fetchContacts}
                  className="text-[10px] font-semibold text-red-500 hover:text-red-700 underline whitespace-nowrap"
                >
                  Thử lại
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, email..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingContacts ? (
              <div className="p-8 text-center text-gray-400">
                <RefreshCw className="animate-spin mx-auto mb-2" size={18} />
                <p className="text-xs">Đang quét danh bạ...</p>
              </div>
            ) : (() => {
              const q = contactSearch.toLowerCase();
              const filterFn = (c: any) =>
                !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.department?.toLowerCase().includes(q);
              const filteredCompany = contacts.company.filter(filterFn);
              const filteredExternal = contacts.external.filter(filterFn);

              return (
                <>
                  {/* Company contacts */}
                  {filteredCompany.length > 0 && (
                    <div>
                      <div className="px-3 py-2 flex items-center gap-1.5 sticky top-0 bg-indigo-50/80 border-b border-indigo-100 z-10">
                        <Building2 size={11} className="text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Nhân viên công ty</span>
                        <span className="ml-auto text-[10px] text-indigo-400">{filteredCompany.length}</span>
                      </div>
                      {filteredCompany.map(contact => {
                        const initials = contact.name?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || '?';
                        const colorClass = AVATAR_COLORS[initials.charCodeAt(0) % AVATAR_COLORS.length];
                        const isMe = contact.email === user?.email;
                        return (
                          <div
                            key={contact.id || contact.email}
                            className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 transition-colors group ${isMe ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold text-gray-800 truncate">{contact.name}</p>
                                {isMe && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-medium">Bạn</span>}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate">{contact.email}</p>
                              {contact.department && (
                                <p className="text-[9px] text-indigo-400 truncate">{contact.department}</p>
                              )}
                            </div>
                            {!isMe && (
                              <button
                                onClick={() => {
                                  setComposeTo(contact.email);
                                  setComposeSubject('');
                                  setComposeBody('<br><br><span style="color: #9ca3af;">--<br>Được gửi từ hệ thống CTC Task</span>');
                                  setComposeAttachments([]);
                                  setIsComposing(true);
                                  setShowContacts(false);
                                }}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex-shrink-0 shadow-sm"
                                title={`Gửi thư cho ${contact.name}`}
                              >
                                <Send size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* External contacts */}
                  {filteredExternal.length > 0 && (
                    <div>
                      <div className="px-3 py-2 flex items-center gap-1.5 sticky top-0 bg-amber-50/80 border-b border-amber-100 z-10">
                        <ExternalLink size={11} className="text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Liên lạc ngoài</span>
                        <span className="ml-auto text-[10px] text-amber-400">{filteredExternal.length}</span>
                      </div>
                      {filteredExternal.map((contact, i) => {
                        const initials = contact.name?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || contact.email[0]?.toUpperCase() || '?';
                        const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                        return (
                          <div
                            key={contact.email}
                            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                          >
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 opacity-70`}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{contact.name || contact.email}</p>
                              <p className="text-[10px] text-gray-400 truncate">{contact.email}</p>
                            </div>
                            <button
                              onClick={() => {
                                setComposeTo(contact.email);
                                setComposeSubject('');
                                setComposeBody('<br><br><span style="color: #9ca3af;">--<br>Được gửi từ hệ thống CTC Task</span>');
                                setComposeAttachments([]);
                                setIsComposing(true);
                                setShowContacts(false);
                              }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-amber-500 text-white hover:bg-amber-600 transition-all flex-shrink-0 shadow-sm"
                              title={`Gửi thư cho ${contact.email}`}
                            >
                              <Send size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredCompany.length === 0 && filteredExternal.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      <UserCircle2 size={28} className="opacity-30 mx-auto mb-2" />
                      <p className="text-xs">Không tìm thấy liên lạc nào.</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

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
                  {/* Toggle read */}
                  <button
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${selectedMail.isRead ? 'text-gray-400 hover:text-blue-600' : 'text-blue-500'}`}
                    title={selectedMail.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                    onClick={e => toggleRead(selectedMail, e as any)}
                  >
                    {selectedMail.isRead ? <MailX size={16} /> : <MailOpen size={16} />}
                  </button>
                  {/* Star */}
                  <button
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${selectedMail.isStarred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
                    title={selectedMail.isStarred ? 'Bỏ sao' : 'Gắn sao'}
                    onClick={() => toggleStar(selectedMail, { stopPropagation: () => {} } as any)}
                  >
                    <Star size={16} fill={selectedMail.isStarred ? 'currentColor' : 'none'} />
                  </button>
                  {/* Resend / Forward / Reply */}
                  {activeFolder === 'sent' && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Gửi lại"
                      onClick={() => handleResend(selectedMail)}
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                  {activeFolder !== 'sent' && (
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Trả lời"
                      onClick={() => handleReply(selectedMail)}
                    >
                      <Reply size={16} />
                    </button>
                  )}
                  {/* Forward */}
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Chuyển tiếp"
                    onClick={() => handleForward(selectedMail)}
                  >
                    <Forward size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title={activeFolder === 'trash' ? 'Xoá vĩnh viễn' : 'Chuyển vào thùng rác'}
                    onClick={e => deleteMail(selectedMail, e as any)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {selectedMail.attachments?.length > 0 && (
              <div className="px-8 py-3 border-b border-gray-100 flex flex-wrap gap-2 bg-gray-50/50">
                {selectedMail.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 shadow-sm hover:border-blue-300 transition-colors group">
                    <Paperclip size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate max-w-[160px]">{a.filename}</span>
                    <span className="text-gray-400">({Math.round(a.size / 1024)}KB)</span>
                    <button
                      onClick={() => downloadAttachment(a)}
                      className="ml-1 opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-all"
                      title="Tải xuống"
                    >
                      <Download size={12} />
                    </button>
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
        <div 
          className="absolute bottom-0 right-6 w-[520px] h-[580px] bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          style={{ animation: 'slideUpCompose 0.25s ease-out' }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const newFiles = Array.from(e.dataTransfer.files);
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
          }}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-400 m-2 rounded-xl">
              <Paperclip size={48} className="text-blue-500 mb-4 animate-bounce" />
              <p className="text-xl font-bold text-blue-600">Thả file vào đây</p>
              <p className="text-sm text-blue-400 mt-2">Đính kèm tối đa 25MB</p>
            </div>
          )}

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
              <div className="flex gap-2">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-gray-400 hover:text-blue-600 font-semibold">Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-gray-400 hover:text-blue-600 font-semibold">Bcc</button>}
              </div>
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
            
            {showCc && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/30">
                <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Cc</span>
                <input
                  type="text" placeholder="Người nhận bản sao..."
                  value={composeCc} onChange={e => setComposeCc(e.target.value)}
                  className="flex-1 text-sm focus:outline-none text-gray-800 bg-transparent placeholder-gray-300"
                />
                <button onClick={() => { setShowCc(false); setComposeCc(''); }} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            )}

            {showBcc && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/30">
                <span className="text-xs font-semibold text-gray-400 w-14 flex-shrink-0">Bcc</span>
                <input
                  type="text" placeholder="Người nhận bản sao ẩn..."
                  value={composeBcc} onChange={e => setComposeBcc(e.target.value)}
                  className="flex-1 text-sm focus:outline-none text-gray-800 bg-transparent placeholder-gray-300"
                />
                <button onClick={() => { setShowBcc(false); setComposeBcc(''); }} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            )}

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

          {/* Body - Rich Text */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Rich Text Toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-gray-100 bg-gray-50/50">
              {[
                { cmd: 'bold', icon: Bold, title: 'Bật đậm (Ctrl+B)' },
                { cmd: 'italic', icon: Italic, title: 'Nghiëng (Ctrl+I)' },
                { cmd: 'underline', icon: Underline, title: 'Gạch chân (Ctrl+U)' },
              ].map(({ cmd, icon: Icon, title }) => (
                <button
                  key={cmd}
                  onMouseDown={e => { e.preventDefault(); execFormat(cmd); }}
                  title={title}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <Icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                onMouseDown={e => {
                  e.preventDefault();
                  const url = prompt('Nhập URL liên kết:');
                  if (url) execFormat('createLink', url);
                }}
                title="Chèn liên kết"
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <Link size={13} />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              {['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6'].map(color => (
                <button
                  key={color}
                  onMouseDown={e => { e.preventDefault(); execFormat('foreColor', color); }}
                  style={{ background: color }}
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  title={`Màu ${color}`}
                />
              ))}
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => setComposeBody((e.target as HTMLDivElement).innerHTML)}
              data-placeholder="Viết nội dung email..."
              className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
            />
          </div>

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
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes scanProgress {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 70%;  margin-left: 15%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
    </>
  );
}
