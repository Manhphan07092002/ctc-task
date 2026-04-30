import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Email, FullEmail, FolderKey } from './types';
import { getSignature, normalizeSubject } from './utils';
import ConnectScreen from './components/ConnectScreen';
import MailSidebar from './components/MailSidebar';
import ReadingPane from './components/ReadingPane';
import ComposeModal from './components/ComposeModal';
import ContactsPanel from './components/ContactsPanel';
import TrackingStatsModal from './components/TrackingStatsModal';
import { RefreshCw } from 'lucide-react';

export default function MailPage() {
  const { user } = useAuth();
  const { showToast, pushLocalNotification } = useNotifications();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox');
  const [inbox, setInbox] = useState<Email[]>([]);
  const [filtered, setFiltered] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Email[] | null>(null);
  const [expandedMailIds, setExpandedMailIds] = useState<Set<number>>(new Set());
  const [loadedMails, setLoadedMails] = useState<Record<number, FullEmail>>({});
  const [isLoadingMail, setIsLoadingMail] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());
  const [selectAllInMailbox, setSelectAllInMailbox] = useState(false);
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'single'; email: Email } | { type: 'bulk' } | null>(null);

  const [showContacts, setShowContacts] = useState(false);
  const [showTrackingStats, setShowTrackingStats] = useState(false);

  // Draft confirm dialog state
  const [draftDialog, setDraftDialog] = useState<{ open: boolean; pendingAction: () => void } | null>(null);

  // Compose Modal State: null means closed, object means open
  const [composeData, setComposeData] = useState<{ to: string; cc: string; bcc: string; subject: string; body: string } | null>(null);

  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStarred, setFilterStarred] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const inboxRef = useRef<Email[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch Inbox
  const fetchInbox = useCallback(async (folder: FolderKey = activeFolder, silent = false, pageNum = 1) => {
    if (!silent && pageNum === 1) setIsLoading(true);
    if (!silent && pageNum === 1) setSelectedThread(null);
    try {
      const res = await apiFetch(`/api/mail/inbox?folder=${folder}&page=${pageNum}&limit=50`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('401');
        throw new Error('Failed');
      }
      const data: Email[] = await res.json();
      
      // Notify new mail
      if (silent && inboxRef.current.length > 0) {
        const oldIds = new Set(inboxRef.current.map(m => m.id));
        const newMails = data.filter(m => !oldIds.has(m.id));
        if (newMails.length > 0) {
          try {
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch (e) {}

          showToast({ type: 'info', title: `📩 ${newMails.length} thư mới`, message: newMails[0].subject || '(Không có tiêu đề)' });
          newMails.forEach(mail => {
            if (user) {
              pushLocalNotification({
                userId: user.id, type: 'mail_received',
                title: '📧 Thư mới nhận', message: `Từ: ${mail.fromName || mail.from}\nChủ đề: ${mail.subject || '(Không có tiêu đề)'}`
              });
            }
          });
        }
      }

      setHasMore(data.length === 50);

      if (pageNum === 1) {
        inboxRef.current = data;
        setInbox(data);
      } else {
        const newInbox = [...inboxRef.current, ...data];
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
  }, [activeFolder, showToast, user, pushLocalNotification]);

  // Initial check or folder change
  useEffect(() => {
    if (activeFolder === 'drafts') return;
    setPage(1);
    setHasMore(true);
    fetchInbox(activeFolder, false, 1);
  }, [activeFolder, fetchInbox]);

  // Auto-poll
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      fetchInbox(activeFolder, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected, activeFolder, fetchInbox]);

  // Load draft from localStorage on mount (if we want to restore previous crash)
  useEffect(() => {
    const draftStr = localStorage.getItem('mail_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.to || draft.subject || draft.body || draft.cc || draft.bcc) {
          setComposeData({
            to: draft.to || '', cc: draft.cc || '', bcc: draft.bcc || '',
            subject: draft.subject || '', body: draft.body || ''
          });
        }
      } catch { }
    }
  }, []);

  // Filter Logic
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(inbox.filter(m => {
      const matchSearch =
        (m.fromName || m.from).toLowerCase().includes(q) ||
        (m.toName || m.to || '').toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q);
      const matchUnread = !filterUnread || !m.isRead;
      const matchStarred = !filterStarred || m.isStarred;
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
    setSelectedThread(null);
    setSelectedUids(new Set());
    setSelectAllInMailbox(false);
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleToggleStar = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !email.isStarred;
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: newVal } : m));
    try {
      await apiFetch(`/api/mail/message/${email.id}/star`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: email.folder || 'INBOX', starred: newVal }),
      });
    } catch { setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: !newVal } : m)); }
  };

  const handleToggleRead = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !email.isRead;
    setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: newVal } : m));
    if (selectedThread?.some(m => m.id === email.id)) setSelectedThread(prev => prev ? prev.map(m => m.id === email.id ? { ...m, isRead: newVal } : m) : prev);
    window.dispatchEvent(new Event('mail-count-changed'));
    try {
      await apiFetch(`/api/mail/message/${email.id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: email.folder || 'INBOX', isRead: newVal }),
      });
    } catch { setInbox(prev => prev.map(m => m.id === email.id ? { ...m, isRead: !newVal } : m)); }
  };

  const executeSingleDelete = async (email: Email) => {
    setInbox(prev => prev.filter(m => m.id !== email.id));
    if (selectedThread?.some(m => m.id === email.id)) {
      setSelectedThread(prev => {
        const next = prev?.filter(m => m.id !== email.id) || null;
        return next && next.length > 0 ? next : null;
      });
    }
    try {
      await apiFetch(`/api/mail/message/${email.id}?folder=${email.folder || 'INBOX'}`, { method: 'DELETE' });
      showToast({ type: 'info', title: activeFolder === 'trash' ? 'Đã xoá vĩnh viễn' : 'Đã chuyển vào thùng rác' });
    } catch { showToast({ type: 'error', title: 'Xoá thất bại' }); }
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
        window.dispatchEvent(new Event('mail-count-changed'));
        showToast({ type: 'success', title: action === 'delete' ? 'Đã xoá thành công' : 'Đã khôi phục thành công' });
        if (selectAllInMailbox) {
          setInbox([]);
          setSelectAllInMailbox(false);
        } else {
          setInbox(prev => prev.filter(m => !selectedUids.has(m.id)));
        }
        setSelectedUids(new Set());
        if (selectedThread && (selectAllInMailbox || selectedThread.some(m => selectedUids.has(m.id)))) {
          setSelectedThread(null);
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

  const toggleExpandMail = async (email: Email, forceExpand?: boolean) => {
    const isCurrentlyExpanded = expandedMailIds.has(email.id);
    if (isCurrentlyExpanded && !forceExpand) {
      setExpandedMailIds(prev => { const n = new Set(prev); n.delete(email.id); return n; });
      return;
    }
    if (!isCurrentlyExpanded) {
      setExpandedMailIds(prev => { const n = new Set(prev); n.add(email.id); return n; });
    }
    if (!loadedMails[email.id]) {
      setIsLoadingMail(true);
      try {
        const res = await apiFetch(`/api/mail/message/${email.id}?folder=${encodeURIComponent(email.folder || 'INBOX')}`);
        if (res.ok) {
          const full = await res.json();
          setLoadedMails(prev => ({ ...prev, [full.id]: full }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingMail(false);
      }
    }
  };

  const readThread = async (thread: Email[]) => {
    setSelectedThread(thread);
    const firstMail = thread[0];

    // Auto-read
    const unreadMails = thread.filter(m => !m.isRead);
    if (unreadMails.length > 0) {
      window.dispatchEvent(new Event('mail-count-changed'));
      setInbox(prev => prev.map(m => unreadMails.find(u => u.id === m.id) ? { ...m, isRead: true } : m));
      unreadMails.forEach(u => {
        apiFetch(`/api/mail/message/${u.id}/read`, {
          method: 'PATCH', body: JSON.stringify({ folder: u.folder || 'INBOX', isRead: true }),
        }).catch(() => { });
      });
    }

    setExpandedMailIds(new Set([firstMail.id]));
    if (!loadedMails[firstMail.id]) {
      setIsLoadingMail(true);
      try {
        const res = await apiFetch(`/api/mail/message/${firstMail.id}?folder=${encodeURIComponent(firstMail.folder || 'INBOX')}`);
        if (res.ok) {
          const full = await res.json();
          setLoadedMails(prev => ({ ...prev, [full.id]: full }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingMail(false);
      }
    }
  };

  const handleReply = (mail: FullEmail) => {
    const quotedBody = `<br><br><blockquote style="border-left: 2px solid #ccc; margin-left: 0; padding-left: 10px; color: #666;">
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>Từ:</strong> ${mail.from}<br>
        <strong>Ngày:</strong> ${new Date(mail.date).toLocaleString('vi-VN')}
      </div>
      ${mail.html || ''}
    </blockquote>`;
    setComposeData({
      to: mail.from || '',
      cc: '', bcc: '',
      subject: mail.subject?.startsWith('Re:') ? mail.subject : 'Re: ' + (mail.subject || ''),
      body: getSignature(user) + quotedBody
    });
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
    setComposeData({
      to: '', cc: '', bcc: '',
      subject: mail.subject?.startsWith('Fwd:') ? mail.subject : 'Fwd: ' + (mail.subject || ''),
      body: quotedBody + getSignature(user)
    });
  };

  const handleResend = (mail: FullEmail) => {
    setComposeData({
      to: mail.to || '', cc: '', bcc: '',
      subject: mail.subject || '',
      body: mail.html || ''
    });
  };

  const openCompose = () => {
    setComposeData({
      to: '', cc: '', bcc: '', subject: '', body: getSignature(user)
    });
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
    return <ConnectScreen onSuccess={() => { setIsConnected(true); fetchInbox(); }} />;
  }

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
        <MailSidebar
          userEmail={user?.email || ''}
          inbox={inbox}
          filtered={filtered}
          activeFolder={activeFolder}
          isLoading={isLoading}
          selectedThread={selectedThread}
          selectedUids={selectedUids}
          selectAllInMailbox={selectAllInMailbox}
          search={search}
          filterUnread={filterUnread}
          filterStarred={filterStarred}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          hasMore={hasMore}

          onSearchChange={setSearch}
          onFilterUnreadChange={setFilterUnread}
          onFilterStarredChange={setFilterStarred}
          onFilterDateFromChange={setFilterDateFrom}
          onFilterDateToChange={setFilterDateTo}
          onClearFilters={() => { setFilterUnread(false); setFilterStarred(false); setFilterDateFrom(''); setFilterDateTo(''); }}

          onSwitchFolder={switchFolder}
          onRefresh={() => fetchInbox(activeFolder)}
          onShowTrackingStats={() => setShowTrackingStats(true)}
          onShowContacts={() => setShowContacts(true)}
          onOpenCompose={openCompose}

          onToggleSelectAll={() => {
            if (selectAllInMailbox) { setSelectAllInMailbox(false); setSelectedUids(new Set()); }
            else { setSelectedUids(new Set(inbox.map(m => m.id))); }
          }}
          onDeselectAll={() => { setSelectedUids(new Set()); setSelectAllInMailbox(false); }}
          onSelectAllInMailbox={setSelectAllInMailbox}
          onToggleSelectMail={(id, e) => {
            e.stopPropagation();
            setSelectedUids(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
          }}
          onBulkAction={handleBulkAction}
          isBulkActioning={isBulkActioning}

          onReadThread={readThread}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDeleteMail={(email, e) => {
            e.stopPropagation();
            if (activeFolder === 'trash') setConfirmAction({ type: 'single', email });
            else executeSingleDelete(email);
          }}
          onLoadMore={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchInbox(activeFolder, false, nextPage);
          }}

          onOpenDraft={(draft) => {
            setComposeData({
              to: draft.to || '', cc: draft.cc || '', bcc: draft.bcc || '',
              subject: draft.subject || '', body: draft.body || ''
            });
          }}
          onDeleteDraft={() => {
            localStorage.removeItem('mail_draft');
            setActiveFolder('inbox');
            showToast({ type: 'info', title: 'Đã xóa thư nháp', message: '' });
          }}
        />

        {showContacts && (
          <ContactsPanel
            onClose={() => setShowContacts(false)}
            onComposeTo={(email) => {
              setComposeData({ to: email, cc: '', bcc: '', subject: '', body: getSignature(user) });
              setShowContacts(false);
            }}
          />
        )}

        <ReadingPane
          selectedThread={selectedThread}
          expandedMailIds={expandedMailIds}
          loadedMails={loadedMails}
          isLoadingMail={isLoadingMail}
          activeFolder={activeFolder}
          onToggleExpandMail={toggleExpandMail}
          onToggleStar={handleToggleStar}
          onDeleteMail={(email, e) => {
            e.stopPropagation();
            if (activeFolder === 'trash') setConfirmAction({ type: 'single', email });
            else executeSingleDelete(email);
          }}
          onReply={handleReply}
          onForward={handleForward}
          onResend={handleResend}
          onDownloadAttachment={downloadAttachment}
        />

        {composeData !== null && (
          <ComposeModal
            initialData={composeData}
            onClose={(draft) => {
              if (draft) {
                showToast({ type: 'info', title: 'Đã lưu thư nháp', message: 'Email được lưu vào Thư nháp. Bạn có thể mở lại.', duration: 5000 });
              }
              setComposeData(null);
            }}
            onDiscard={() => {
              localStorage.removeItem('mail_draft');
              setComposeData(null);
            }}
            onSendSuccess={(msg, subject, to) => {
              // Notification sent from handleSend via showToast & local notif
              if (user) {
                pushLocalNotification({
                  userId: user.id, type: 'mail_sent',
                  title: '📧 Email đã gửi', message: `Tiêu đề: "${subject}" → ${to}`,
                });
              }
            }}
          />
        )}

        {showTrackingStats && (
          <TrackingStatsModal onClose={() => setShowTrackingStats(false)} />
        )}
      </div>

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
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
      `}</style>
    </>
  );
}
