import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, PlusCircle, Edit2, Trash2, Shield, Briefcase,
  Search, RefreshCw, AlertCircle, X, Mail, User as UserIcon,
  CheckCircle, ChevronDown
} from 'lucide-react';
import { User, UserRole } from '../../types';

interface RoleInfo {
  id: string; name: string; color: string; isSystem: number;
}

// Dynamic role badge - uses color from /api/roles
const RoleBadge: React.FC<{ roleName: string; roles: RoleInfo[] }> = ({ roleName, roles }) => {
  const role = roles.find(r => r.name === roleName);
  const color = role?.color || '#6b7280';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{ backgroundColor: color + '18', color, borderColor: color + '44' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {roleName}
    </span>
  );
};

const DEPARTMENTS_FALLBACK = ['Board', 'Product', 'Marketing', 'Sales', 'IT', 'HR', 'Finance'];

// ----- User Form Modal -----
const UserFormModal: React.FC<{
  user: User | null;
  roles: RoleInfo[];
  departments: string[];
  onClose: () => void;
  onSave: (u: User) => Promise<void>;
}> = ({ user, roles, departments, onClose, onSave }) => {
  const isEdit = !!user;
  // Default role: first available or 'Employee'
  const defaultRole = roles[0]?.name || 'Employee';
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role || defaultRole) as string,
    department: user?.department || 'Product',
    avatar: user?.avatar || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Tên và email không được để trống.');
      return;
    }
    setSaving(true);
    try {
      const saved: User = {
        id: user?.id || Math.random().toString(36).substring(2, 10),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role as UserRole,
        department: form.department,
        avatar: form.avatar || `https://i.pravatar.cc/150?u=${form.email}`,
      };
      await onSave(saved);
      onClose();
    } catch {
      setError('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <UserIcon size={16} className="text-white" />
            </div>
            <h3 className="text-white font-bold">{isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={16} />{error}
            </div>
          )}

          {/* Avatar preview */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <img
              src={form.avatar || `https://i.pravatar.cc/80?u=${form.email || 'default'}`}
              alt="Avatar"
              className="w-16 h-16 rounded-full ring-2 ring-orange-200 object-cover"
            />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">URL Avatar</label>
              <input
                type="url"
                value={form.avatar}
                onChange={e => handle('avatar', e.target.value)}
                placeholder="https://... (để trống để dùng avatar tự động)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-300 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text" required value={form.name}
                  onChange={e => handle('name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="email" required value={form.email}
                  onChange={e => handle('email', e.target.value)}
                  placeholder="email@company.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vai trò</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <select value={form.role} onChange={e => handle('role', e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none bg-white text-sm appearance-none">
                    {roles.length > 0
                      ? roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                      : <option value={form.role}>{form.role}</option>
                    }
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phòng ban</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <select value={form.department} onChange={e => handle('department', e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none bg-white text-sm appearance-none">
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md shadow-orange-200 hover:shadow-orange-300 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <><RefreshCw size={14} className="animate-spin" /> Đang lưu...</> : <><CheckCircle size={14} />{isEdit ? 'Lưu thay đổi' : 'Thêm người dùng'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----- Confirm Delete Dialog -----
const ConfirmDeleteModal: React.FC<{
  user: User;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}> = ({ user, onCancel, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Xóa người dùng?</h3>
        <p className="text-sm text-gray-500 mb-1">Bạn sắp xóa tài khoản:</p>
        <p className="font-bold text-gray-800 mb-1">{user.name}</p>
        <p className="text-xs text-gray-400 mb-5">{user.email} · {user.role}</p>
        <p className="text-xs text-red-500 mb-5">Hành động này không thể hoàn tác.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Hủy
          </button>
          <button
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting ? <><RefreshCw size={14} className="animate-spin" />Đang xóa...</> : 'Xóa ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ----- Main User Management Page -----
export default function AdminUserManagement() {
  const [users, setUsers]  = useState<User[]>([]);
  const [roles, setRoles]  = useState<RoleInfo[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ur, rr, dr] = await Promise.all([
        fetch('/api/users'), fetch('/api/roles'), fetch('/api/departments')
      ]);
      if (!ur.ok) throw new Error('Không thể tải người dùng');
      setUsers(await ur.json());
      if (rr.ok) setRoles(await rr.json());
      if (dr.ok) {
        const depts = await dr.json();
        setDepartments(depts.map((d: any) => d.name));
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (u: User) => {
    const isNew = !users.find(x => x.id === u.id);
    const res = await fetch(isNew ? '/api/users' : `/api/users/${u.id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (!res.ok) throw new Error('Lỗi lưu');
    showToast(isNew ? `Đã thêm người dùng ${u.name}` : `Đã cập nhật ${u.name}`);
    await fetchUsers();
  };

  const handleDelete = async (u: User) => {
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Xóa thất bại', 'error'); return; }
    showToast(`Đã xóa ${u.name}`);
    setDeletingUser(null);
    await fetchUsers();
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Quản lý Người dùng</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tổng cộng <strong className="text-gray-700">{users.length}</strong> tài khoản</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers}
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all shadow-sm">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setEditingUser(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all">
            <PlusCircle size={16} /> Thêm người dùng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-200 outline-none text-sm shadow-sm"
          />
        </div>
        <div className="relative">
          <Shield className="absolute left-3.5 top-3 text-gray-400" size={16} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-orange-200 outline-none shadow-sm appearance-none">
            <option value="">Tất cả vai trò</option>
            {roles.length > 0
              ? roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)
              : ['Admin','Director','Manager','Employee'].map(r => <option key={r} value={r}>{r}</option>)
            }
          </select>
          <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={14} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Đang tải danh sách người dùng...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-24 gap-3 text-red-500">
          <AlertCircle size={40} strokeWidth={1.5} />
          <p className="font-semibold">{error}</p>
          <button onClick={fetchUsers} className="px-4 py-2 bg-red-50 rounded-xl text-sm font-medium hover:bg-red-100 flex items-center gap-2">
            <RefreshCw size={14} />Thử lại
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p className="font-medium">Không tìm thấy người dùng phù hợp</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Người dùng</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vai trò</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phòng ban</th>
                    <th className="text-right py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} alt={u.name}
                            className="w-9 h-9 rounded-full ring-1 ring-gray-200 object-cover flex-shrink-0" />
                          <span className="font-semibold text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <RoleBadge roleName={u.role} roles={roles} />
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{u.department}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingUser(u)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeletingUser(u)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingUser !== undefined && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          departments={departments.length > 0 ? departments : DEPARTMENTS_FALLBACK}
          onClose={() => setEditingUser(undefined)}
          onSave={handleSave}
        />
      )}
      {deletingUser && (
        <ConfirmDeleteModal
          user={deletingUser}
          onCancel={() => setDeletingUser(null)}
          onConfirm={() => handleDelete(deletingUser)}
        />
      )}
    </div>
  );
}
