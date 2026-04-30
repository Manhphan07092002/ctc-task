import React from 'react';
import { Mail, RefreshCw, Star, Reply, Forward, Trash2, Paperclip, Download } from 'lucide-react';
import { Email, FullEmail, FolderKey } from '../types';
import { Avatar, formatDate } from '../utils';
import DOMPurify from 'dompurify';

interface ReadingPaneProps {
  selectedThread: Email[] | null;
  expandedMailIds: Set<number>;
  loadedMails: Record<number, FullEmail>;
  isLoadingMail: boolean;
  activeFolder: FolderKey;
  onToggleExpandMail: (email: Email, forceExpand?: boolean) => void;
  onToggleStar: (email: Email, e: React.MouseEvent) => void;
  onDeleteMail: (email: Email, e: React.MouseEvent) => void;
  onReply: (mail: FullEmail) => void;
  onForward: (mail: FullEmail) => void;
  onResend: (mail: FullEmail) => void;
  onDownloadAttachment: (a: { filename: string; contentType: string; content: string | null }) => void;
}

export default function ReadingPane({
  selectedThread,
  expandedMailIds,
  loadedMails,
  isLoadingMail,
  activeFolder,
  onToggleExpandMail,
  onToggleStar,
  onDeleteMail,
  onReply,
  onForward,
  onResend,
  onDownloadAttachment,
}: ReadingPaneProps) {

  if (isLoadingMail && !selectedThread) {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center bg-white overflow-hidden">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw className="animate-spin" size={24} />
          <p className="text-sm">Đang tải email...</p>
        </div>
      </div>
    );
  }

  if (!selectedThread) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 text-gray-300 bg-white overflow-hidden">
        <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
          <Mail size={36} className="opacity-40" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-400">Chọn một email để đọc</p>
          <p className="text-sm text-gray-300 mt-1">Email sẽ hiển thị tại đây</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 hidden md:flex flex-col bg-white overflow-hidden">
      {/* Thread header bar */}
      <div className="px-8 py-5 border-b border-gray-100 bg-white flex justify-between items-center z-10 shadow-sm flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">
          {selectedThread[0].subject || '(Không có tiêu đề)'}
        </h2>
        {selectedThread.length > 1 && (
          <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{selectedThread.length} thư</span>
        )}
      </div>

      {/* Thread messages list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50 space-y-4">
        {selectedThread.map((email) => {
          const isExpanded = expandedMailIds.has(email.id);
          const fullMail = loadedMails[email.id];
          const displayName = activeFolder === 'sent'
            ? (email.toName || email.to || 'Không rõ')
            : (email.fromName || email.from);

          return (
            <div key={email.id} className={`bg-white border ${isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-200 shadow-sm hover:border-blue-300'} rounded-xl overflow-hidden transition-all duration-200`}>
              {/* Message Header */}
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer bg-white group"
                onClick={() => onToggleExpandMail(email)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={displayName} size={10} />
                  <div className="min-w-0">
                    {activeFolder === 'sent' ? (
                      <>
                        <p className="font-semibold text-gray-800 text-sm truncate">Đến: {email.to || email.from}</p>
                        <p className="text-[10px] text-gray-400 truncate">Bạn → {email.to}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-800 text-sm truncate">{displayName}</p>
                        <p className="text-[10px] text-gray-400 truncate">&lt;{email.from}&gt; → tôi</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400 font-medium">{formatDate(email.date)}</span>

                  {/* Quick Actions */}
                  <div className={`items-center gap-1 ${isExpanded ? 'flex' : 'hidden group-hover:flex'}`} onClick={e => e.stopPropagation()}>
                    <button
                      className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${email.isStarred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}
                      title={email.isStarred ? 'Bỏ sao' : 'Gắn sao'}
                      onClick={(e) => onToggleStar(email, e)}
                    >
                      <Star size={14} fill={email.isStarred ? 'currentColor' : 'none'} />
                    </button>

                    {isExpanded && fullMail && activeFolder === 'sent' && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Gửi lại"
                        onClick={() => onResend(fullMail)}
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    {isExpanded && fullMail && activeFolder !== 'sent' && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Trả lời"
                        onClick={() => onReply(fullMail)}
                      >
                        <Reply size={14} />
                      </button>
                    )}
                    {isExpanded && fullMail && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Chuyển tiếp"
                        onClick={() => onForward(fullMail)}
                      >
                        <Forward size={14} />
                      </button>
                    )}
                    <button
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                      title="Xoá"
                      onClick={(e) => onDeleteMail(email, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                  {isLoadingMail && !fullMail ? (
                    <div className="p-8 text-center text-gray-400">
                      <RefreshCw className="animate-spin mx-auto" size={20} />
                      <p className="text-xs mt-2">Đang tải...</p>
                    </div>
                  ) : fullMail ? (
                    <>
                      {fullMail.attachments?.length > 0 && (
                        <div className="px-6 py-3 border-b border-gray-50 flex flex-wrap gap-2 bg-gray-50/30">
                          {fullMail.attachments.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 shadow-sm hover:border-blue-300 transition-colors group">
                              <Paperclip size={12} className="text-blue-400 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">{a.filename}</span>
                              <span className="text-gray-400">({Math.round(a.size / 1024)}KB)</span>
                              <button
                                onClick={() => onDownloadAttachment(a)}
                                className="ml-1 opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-all"
                                title="Tải xuống"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="px-6 py-6 overflow-x-auto">
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullMail.html || '') }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-red-500 text-sm">Không thể tải nội dung email.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
