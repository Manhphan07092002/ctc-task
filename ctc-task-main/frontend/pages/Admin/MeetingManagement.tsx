import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, RefreshCw, AlertCircle, Search, CheckCircle, PlusCircle,
  Calendar, Users, Trash2, Clock, PlayCircle, CheckSquare2, XCircle,
  Edit2, X, Save, ChevronDown
} from 'lucide-react';
import { Meeting, User } from '../../types';

const STATUS_META: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  scheduled:  { cls: 'bg-blue-100 text-blue-700 border-blue-200',     label: 'Đã lên lịch',   icon: <Calendar size={11} /> },
  ongoing:    { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Đang diễn ra', icon: <PlayCircle size={11} /> },
  completed:  { cls: 'bg-gray-100 text-gray-600 border-gray-200',     label: 'Đã kết thúc',   icon: <CheckSquare2 size={11} /> },
  cancelled:  { cls: 'bg-red-100 text-red-600 border-red-200',        label: 'Đã hủy',         icon: <XCircle size={11} /> },
};

type MeetingForm = {
  title: string; description: string; startTime: string; endTime: string;
  status: string; hostId: string; meetingLink: string;
};

const toInputDatetime = (iso: string) => {
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
};

const MeetingFormModal: React.FC<{
  meeting: Meeting | null; users: User[]; onClose: () => void; onSave: (m: Meeting) => Promise<void>;
}> = ({ meeting, users, onClose, onSave }) => {
  const isEdit = !!meeting;
  const now = new Date();
  const [form, setForm] = useState<MeetingForm>(meeting ? {
    title: meeting.title, description: meeting.description || '',
    startTime: toInputDatetime(meeting.startTime), endTime: toInputDatetime(meeting.endTime),
    status: meeting.status, hostId: meeting.hostId,
    meetingLink: meeting.meetingLink || '',
  } : {
    title: '', description: '',
    startTime: toInputDatetime(now.toISOString()),
    endTime: toInputDatetime(new Date(now.getTime() + 60 * 60 * 1000).toISOString()),
    status: 'scheduled', hostId: users[0]?.id || '', meetingLink: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof MeetingForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Tiêu đề không được trống.'); return; }
    setSaving(true); setErr('');
    try {
      const saved: Meeting = {
        id: meeting?.id || Math.random().toString(36).substring(2, 10),
        title: form.title.trim(), description: form.description,
        hostId: form.hostId, startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        status: form.status as Meeting['status'],
        meetingLink: form.meetingLink || `meet-${Date.now()}`,
        participants: meeting?.participants || [],
      };
      await onSave(saved);
      onClose();
    } catch { setErr('Lưu thất bại.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-500">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-white" />
            <h3 className="text-white font-bold">{isEdit ? 'Chỉnh sửa cuộc họp' : 'Tạo cuộc họp mới'}</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"><AlertCircle size={15} />{err}</div>}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
            <input required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Tên cuộc họp..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mô tả</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              placeholder="Nội dung cuộc họp..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 outline-none text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Bắt đầu</label>
              <input type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kết thúc</label>
              <input type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-300 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
              <div className="relative">
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-teal-300 outline-none appearance-none">
                  {Object.entries(STATUS_META).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={13} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Người chủ trì</label>
              <div className="relative">
                <select value={form.hostId} onChange={e => set('hostId', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-teal-300 outline-none appearance-none">
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={13} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Link họp</label>
            <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)}
              placeholder="https://meet.google.com/... (tùy chọn)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-300 outline-none text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-teal-300 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <><RefreshCw size={14} className="animate-spin" />Đang lưu...</> : <><Save size={14} />{isEdit ? 'Lưu thay đổi' : 'Tạo cuộc họp'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminMeetingManagement() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null | undefined>(undefined);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [mr, ur] = await Promise.all([fetch('/api/meetings'), fetch('/api/users')]);
      const list: Meeting[] = await mr.json();
      setMeetings(list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
      setUsers(await ur.json());
    } catch { setError('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (m: Meeting) => {
    const isNew = !meetings.find(x => x.id === m.id);
    const res = await fetch(isNew ? '/api/meetings' : `/api/meetings/${m.id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    });
    if (!res.ok) throw new Error('Lỗi');
    showToast(isNew ? `Đã tạo: ${m.title}` : `Đã cập nhật: ${m.title}`);
    await fetchAll();
  };

  const handleDelete = async (m: Meeting) => {
    if (!confirm(`Xóa cuộc họp "${m.title}"?`)) return;
    setDeletingId(m.id);
    try {
      await fetch(`/api/meetings/${m.id}`, { method: 'DELETE' });
      showToast(`Đã xóa: ${m.title}`);
      await fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleChangeStatus = async (m: Meeting, status: Meeting['status']) => {
    const res = await fetch(`/api/meetings/${m.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...m, status }),
    });
    if (!res.ok) { showToast('Lỗi cập nhật trạng thái', 'error'); return; }
    showToast(`Đã chuyển sang: ${STATUS_META[status]?.label}`);
    await fetchAll();
  };

  const getUser = (id: string) => users.find(u => u.id === id);
  const filtered = meetings.filter(m => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });
  const statusCounts = Object.keys(STATUS_META).reduce((acc, k) => ({ ...acc, [k]: meetings.filter(m => m.status === k).length }), {} as Record<string, number>);
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

  return (
    <div className="space-y-6 pb-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-teal-200">
            <Video size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Quản lý Cuộc họp</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tổng cộng <strong className="text-gray-700">{meetings.length}</strong> cuộc họp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm"><RefreshCw size={16} /></button>
          <button onClick={() => setEditingMeeting(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all">
            <PlusCircle size={16} /> Tạo cuộc họp
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([status, s]) => (
          <button key={status} onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`rounded-xl p-4 flex items-center gap-3 border transition-all
              ${filterStatus === status ? s.cls + ' ring-2 ring-offset-1 ring-current shadow-md' : s.cls + ' hover:opacity-80'}`}>
            <span>{s.icon}</span>
            <div className="text-left">
              <p className="text-xl font-black leading-none">{statusCounts[status] || 0}</p>
              <p className="text-xs opacity-70 mt-0.5 whitespace-nowrap">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={15} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề cuộc họp..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-teal-200 outline-none text-sm shadow-sm" />
        </div>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); }}
            className="px-3 py-2.5 text-xs text-teal-600 border border-teal-200 rounded-xl hover:bg-teal-50">Xóa bộ lọc</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Đang tải...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-24 gap-3 text-red-500">
          <AlertCircle size={40} strokeWidth={1.5} /><p>{error}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-gray-400">
              <Video size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p>Không tìm thấy cuộc họp nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Cuộc họp</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Người chủ trì</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Thời gian</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Tham gia</th>
                    <th className="text-right py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(m => {
                    const host = getUser(m.hostId);
                    const s = STATUS_META[m.status] || STATUS_META.scheduled;
                    const isPast = new Date(m.endTime) < new Date();
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/70 transition-colors group">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                              ${m.status === 'ongoing' ? 'bg-emerald-100' : m.status === 'cancelled' ? 'bg-red-100' : 'bg-teal-100'}`}>
                              <Video size={16} className={m.status === 'ongoing' ? 'text-emerald-600' : m.status === 'cancelled' ? 'text-red-500' : 'text-teal-600'} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 truncate max-w-[200px]">{m.title}</p>
                              {m.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{m.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          {host && (
                            <div className="flex items-center gap-2">
                              <img src={host.avatar} alt={host.name} className="w-6 h-6 rounded-full object-cover" />
                              <span className="text-xs text-gray-600 truncate max-w-[90px]">{host.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {/* Inline status changer */}
                          <div className="relative group/status">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${s.cls}`}>
                              {s.icon} {s.label}
                            </span>
                            <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover/status:block bg-white border border-gray-100 rounded-xl shadow-xl p-1 min-w-[140px]">
                              {Object.entries(STATUS_META).map(([sv, ss]) => sv !== m.status && (
                                <button key={sv} onClick={() => handleChangeStatus(m, sv as Meeting['status'])}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 text-left ${ss.cls}`}>
                                  {ss.icon} {ss.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <span className={`text-xs flex items-center gap-1 ${isPast ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                            <Clock size={11} />{fmt(m.startTime)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden xl:table-cell">
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-2">
                              {(m.participants || []).slice(0, 4).map(pid => {
                                const p = getUser(pid);
                                return p ? <img key={pid} src={p.avatar} alt={p.name} title={p.name} className="w-6 h-6 rounded-full border-2 border-white object-cover" /> : null;
                              })}
                            </div>
                            {(m.participants || []).length > 4 && <span className="text-xs text-gray-400 ml-1">+{m.participants.length - 4}</span>}
                            {(m.participants || []).length === 0 && <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={11} />0</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMeeting(m)} title="Chỉnh sửa"
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                            <button disabled={deletingId === m.id} onClick={() => handleDelete(m)} title="Xóa"
                              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-50">
                              {deletingId === m.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {editingMeeting !== undefined && (
        <MeetingFormModal meeting={editingMeeting} users={users} onClose={() => setEditingMeeting(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
