import React, { useState, useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import { Note } from '../types';
import { NOTE_COLORS } from '../constants';
import { X, Trash2, Save, StickyNote, Hash, Bell, BellOff, Clock } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  onDelete?: (id: string) => void;
  initialNote?: Note | null;
}

const SWATCHES = [
  { id: 'yellow',  bg: 'bg-yellow-100', solid: '#FCD34D', label: 'Vàng',       ring: 'ring-yellow-400' },
  { id: 'sky',     bg: 'bg-blue-100',   solid: '#60A5FA', label: 'Xanh dương', ring: 'ring-blue-400' },
  { id: 'green',   bg: 'bg-green-100',  solid: '#34D399', label: 'Xanh lá',   ring: 'ring-green-400' },
  { id: 'pink',    bg: 'bg-pink-100',   solid: '#F472B6', label: 'Hồng',       ring: 'ring-pink-400' },
  { id: 'purple',  bg: 'bg-purple-100', solid: '#A78BFA', label: 'Tím',        ring: 'ring-purple-400' },
  { id: 'orange',  bg: 'bg-orange-100', solid: '#FB923C', label: 'Cam',        ring: 'ring-orange-400' },
  { id: 'white',   bg: 'bg-white',      solid: '#E5E7EB', label: 'Trắng',      ring: 'ring-gray-300' },
];

// Format ISO to datetime-local input value
const toInputValue = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Min value for datetime-local = now
const nowInputValue = () => toInputValue(new Date().toISOString());

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, onSave, onDelete, initialNote }) => {
  const [title, setTitle]               = useState('');
  const [content, setContent]           = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].bg);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderAt, setReminderAt]     = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSwatch = SWATCHES.find(s => s.bg === selectedColor) ?? SWATCHES[0];

  useEffect(() => {
    if (isOpen) {
      setTitle(initialNote?.title ?? '');
      setContent(initialNote?.content ?? '');
      setSelectedColor(initialNote?.color ?? NOTE_COLORS[0].bg);
      setShowDeleteConfirm(false);
      const rem = initialNote?.reminderAt;
      setReminderEnabled(!!rem);
      setReminderAt(rem ? toInputValue(rem) : '');
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [isOpen, initialNote]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 240) + 'px'; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const note: Note = {
      id: initialNote?.id ?? Math.random().toString(36).substr(2, 9),
      title,
      content,
      color: selectedColor,
      createdAt: initialNote?.createdAt ?? new Date().toISOString(),
      reminderAt: reminderEnabled && reminderAt ? new Date(reminderAt).toISOString() : undefined,
    };
    onSave(note);
    onClose();
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  // Is reminder in the past? (explicit boolean cast to satisfy disabled prop)
  const reminderIsPast: boolean = !!(reminderEnabled && reminderAt && new Date(reminderAt) < new Date());

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-black/25 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">

        {/* Colored accent strip */}
        <div className="h-1.5 w-full transition-colors duration-300" style={{ backgroundColor: activeSwatch.solid }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: activeSwatch.solid + '33' }}>
              <StickyNote size={15} style={{ color: activeSwatch.solid }} />
            </div>
            <h3 className="font-extrabold text-gray-800 text-base">
              {initialNote ? 'Chỉnh sửa ghi chú' : 'Ghi chú mới'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0 px-6 pb-6">
          {/* Title */}
          <input
            type="text"
            placeholder="Tiêu đề ghi chú..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none pb-2"
          />

          <div className="h-px bg-gray-100 mb-3" />

          {/* Content */}
          <textarea
            ref={textareaRef}
            placeholder="Viết nội dung tại đây..."
            value={content}
            onChange={e => { setContent(e.target.value); autoResize(); }}
            rows={4}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 leading-relaxed placeholder-gray-300 min-h-[100px]"
            style={{ maxHeight: 240 }}
          />

          {/* Word count */}
          <div className="flex items-center gap-1 text-[10px] text-gray-300 font-medium mt-1 mb-4">
            <Hash size={9} /> {wordCount} từ · {content.length} ký tự
          </div>

          {/* ── REMINDER SECTION ── */}
          <div className={`rounded-2xl border transition-all mb-4 overflow-hidden ${reminderEnabled ? 'border-violet-200 bg-violet-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
            {/* Toggle row */}
            <button
              type="button"
              onClick={() => { setReminderEnabled(v => !v); if (!reminderAt) setReminderAt(''); }}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${reminderEnabled ? 'bg-violet-500' : 'bg-gray-200'} transition-colors`}>
                  {reminderEnabled ? <Bell size={13} className="text-white"/> : <BellOff size={13} className="text-gray-400"/>}
                </div>
                <div>
                  <p className={`text-sm font-bold ${reminderEnabled ? 'text-violet-700' : 'text-gray-500'}`}>
                    Nhắc nhở
                  </p>
                  <p className="text-[10px] text-gray-400">Thông báo khi đến giờ</p>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`w-10 h-5 rounded-full transition-colors relative ${reminderEnabled ? 'bg-violet-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${reminderEnabled ? 'left-5' : 'left-0.5'}`}/>
              </div>
            </button>

            {/* DateTime picker (shown when enabled) */}
            {reminderEnabled && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={12} className="text-violet-400"/>
                  <span className="text-xs font-semibold text-violet-600">Thời gian nhắc nhở</span>
                </div>
                <Flatpickr
                  value={reminderAt ? new Date(reminderAt) : ''}
                  onChange={([date]) => setReminderAt(date ? date.toISOString() : '')}
                  options={{
                    enableTime: true,
                    time_24hr: true,
                    dateFormat: 'd/m/Y H:i',
                    minDate: 'today',
                    defaultHour: new Date().getHours(),
                    defaultMinute: new Date().getMinutes()
                  }}
                  className={`w-full text-sm font-semibold px-3 py-2 rounded-xl border outline-none transition-all bg-white
                    ${reminderIsPast
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : 'border-violet-200 bg-white text-violet-700 focus:ring-2 focus:ring-violet-400'}
                  `}
                />
                {reminderIsPast && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-medium">⚠ Thời gian này đã qua, hãy chọn lại</p>
                )}
                {reminderAt && !reminderIsPast && (
                  <p className="text-[10px] text-violet-500 mt-1.5 font-medium">
                    🔔 Sẽ thông báo vào {new Date(reminderAt).toLocaleString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">Màu</span>
            <div className="flex items-center gap-2 flex-wrap">
              {SWATCHES.map(sw => (
                <button
                  key={sw.id}
                  type="button"
                  title={sw.label}
                  onClick={() => setSelectedColor(sw.bg)}
                  className={`w-8 h-8 rounded-full border-2 border-white shadow-md transition-all duration-150
                    ${selectedColor === sw.bg ? `ring-2 ring-offset-2 ${sw.ring} scale-110` : 'hover:scale-105 opacity-75 hover:opacity-100'}
                  `}
                  style={{ backgroundColor: sw.solid }}
                />
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            {initialNote && onDelete ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-xs text-red-500 font-semibold">Xóa ghi chú?</span>
                  <button type="button" onClick={() => { onDelete(initialNote.id); onClose(); }}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors">Xóa</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors">Hủy</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-400 px-2 py-1.5 rounded-xl hover:bg-red-50 transition-all">
                  <Trash2 size={13} /> Xóa
                </button>
              )
            ) : <div />}

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all">
                Hủy
              </button>
              <button
                type="submit"
                disabled={reminderEnabled && reminderIsPast}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: activeSwatch.solid, boxShadow: `0 4px 14px ${activeSwatch.solid}55` }}
              >
                <Save size={14} /> Lưu ghi chú
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
