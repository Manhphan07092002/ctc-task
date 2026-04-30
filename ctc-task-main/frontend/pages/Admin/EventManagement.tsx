import { apiFetch } from '../../services/api';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CalendarDays, X, Save, PartyPopper, Building2 } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import { toLocalDateString } from '../../utils/dateUtils';
import 'flatpickr/dist/flatpickr.min.css';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: 'holiday' | 'company' | 'other';
  color: string;
  description?: string;
  isRecurringYearly: number;
}

const TYPE_LABELS: Record<string, string> = {
  holiday: '🎉 Ngày lễ Quốc gia',
  company:  '🏢 Sự kiện Công ty',
  other:    '📌 Khác',
};

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

const defaultForm = (): Omit<CalendarEvent, 'id'> => ({
  title: '', date: '', endDate: '', type: 'holiday',
  color: '#ef4444', description: '', isRecurringYearly: 1,
});

export default function AdminEventManagement() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/events');
      setEvents(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const openCreate = () => { setEditingId(null); setForm(defaultForm()); setShowModal(true); };
  const openEdit = (evt: CalendarEvent) => {
    setEditingId(evt.id);
    setForm({ title: evt.title, date: evt.date, endDate: evt.endDate || '', type: evt.type, color: evt.color, description: evt.description || '', isRecurringYearly: evt.isRecurringYearly });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const payload = { ...form, id: editingId || `evt-${Date.now()}` };
      if (editingId) {
        await apiFetch(`/api/events/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchEvents();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  const filtered = filterType === 'all' ? events : events.filter(e => e.type === filterType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-orange-500" size={26} />
            Quản lý Sự kiện & Ngày lễ
          </h1>
          <p className="text-gray-500 text-sm mt-1">Thêm ngày lễ, sự kiện công ty để hiển thị trên lịch của nhân viên</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
        >
          <Plus size={17} /> Thêm sự kiện
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all', '🗂️ Tất cả'], ['holiday', '🎉 Ngày lễ'], ['company', '🏢 Công ty'], ['other', '📌 Khác']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterType(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filterType === v ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <PartyPopper size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Chưa có sự kiện nào</p>
            <button onClick={openCreate} className="mt-3 text-orange-500 text-sm font-semibold hover:underline">+ Thêm ngay</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(evt => (
              <div key={evt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: evt.color }} />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm">{evt.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{TYPE_LABELS[evt.type] || evt.type}</span>
                    {evt.isRecurringYearly ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 font-medium">🔁 Hàng năm</span> : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>📅 {evt.date}{evt.endDate ? ` → ${evt.endDate}` : ''}</span>
                    {evt.description && <span className="truncate max-w-xs">{evt.description}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(evt)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Chỉnh sửa">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(evt.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Xóa">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng sự kiện', value: events.length, color: 'orange', icon: CalendarDays },
          { label: 'Ngày lễ Quốc gia', value: events.filter(e => e.type === 'holiday').length, color: 'red', icon: PartyPopper },
          { label: 'Sự kiện Công ty', value: events.filter(e => e.type === 'company').length, color: 'blue', icon: Building2 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 flex items-center justify-center`}>
              <s.icon size={18} className={`text-${s.color}-500`} />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-800 text-lg">{editingId ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={18} /></button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tên sự kiện *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="VD: Tết Nguyên Đán, Họp Tổng kết năm..."
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ngày bắt đầu *</label>
                  <Flatpickr
                    value={form.date ? new Date(form.date) : ''}
                    onChange={([date]) => setForm(f => ({ ...f, date: date ? toLocalDateString(date) : '' }))}
                    options={{ dateFormat: 'd/m/Y' }}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Ngày kết thúc</label>
                  <Flatpickr
                    value={form.endDate ? new Date(form.endDate) : ''}
                    onChange={([date]) => setForm(f => ({ ...f, endDate: date ? toLocalDateString(date) : '' }))}
                    options={{ dateFormat: 'd/m/Y' }}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Type & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Loại sự kiện</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="holiday">🎉 Ngày lễ Quốc gia</option>
                    <option value="company">🏢 Sự kiện Công ty</option>
                    <option value="other">📌 Khác</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Màu hiển thị</label>
                  <div className="mt-1 flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Mô tả</label>
                <textarea
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Mô tả ngắn về sự kiện..."
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {/* Recurring */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isRecurringYearly === 1}
                  onChange={e => setForm(f => ({ ...f, isRecurringYearly: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-700 font-medium">🔁 Lặp lại hàng năm (cùng ngày)</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                {editingId ? 'Lưu thay đổi' : 'Thêm sự kiện'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
