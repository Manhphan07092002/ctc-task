import React, { useState, useEffect } from 'react';
import { Users, X, RefreshCw, Search, Building2, Send, ExternalLink, UserCircle2 } from 'lucide-react';
import { Contact } from '../types';
import { apiFetch } from '../../../services/api';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { AVATAR_COLORS } from '../utils';

interface ContactsPanelProps {
  onClose: () => void;
  onComposeTo: (email: string) => void;
}

export default function ContactsPanel({ onClose, onComposeTo }: ContactsPanelProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
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

  useEffect(() => {
    fetchContacts();
  }, []);

  const q = contactSearch.toLowerCase();
  const filterFn = (c: any) => !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.department?.toLowerCase().includes(q);
  const filteredCompany = contacts.company.filter(filterFn);
  const filteredExternal = contacts.external.filter(filterFn);

  return (
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
              className={`p-1.5 rounded-lg transition-colors ${isLoadingContacts
                ? 'text-indigo-400 bg-indigo-50 cursor-not-allowed'
                : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                }`}
              title={isLoadingContacts ? 'Đang quét IMAP...' : 'Quét lại danh bạ (IMAP)'}
            >
              <RefreshCw size={13} className={isLoadingContacts ? 'animate-spin text-indigo-500' : ''} />
            </button>
            <button
              onClick={onClose}
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
        ) : (
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
                          onClick={() => onComposeTo(contact.email)}
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
                        onClick={() => onComposeTo(contact.email)}
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
        )}
      </div>
    </div>
  );
}
