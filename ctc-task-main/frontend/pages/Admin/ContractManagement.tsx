import { apiFetch } from '../../services/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, AlertCircle, Filter, Trash2, Edit2, CheckCircle,
  ChevronDown, Building2, X, Save, FileSignature, Wallet
} from 'lucide-react';
import { User } from '../../types';
import { Contract } from '../../services/contractService';

const STATUS_STYLE: Record<string, string> = {
  'completed': 'bg-emerald-100 text-emerald-700',
  'in_progress': 'bg-blue-100 text-blue-700',
  'pending': 'bg-yellow-100 text-yellow-700',
  'cancelled': 'bg-red-100 text-red-600',
  'draft': 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  'completed': 'Hoàn thành',
  'in_progress': 'Đang thực hiện',
  'pending': 'Chờ duyệt',
  'cancelled': 'Đã hủy',
  'draft': 'Nháp',
};

const DEPARTMENTS = ['Board', 'Product', 'Marketing', 'Sales', 'IT', 'HR', 'Finance'];

const ContractFormModal: React.FC<{
  contract: Contract | null; users: User[]; onClose: () => void; onSave: (c: Contract) => Promise<void>;
}> = ({ contract, users, onClose, onSave }) => {
  const isEdit = !!contract;
  const [form, setForm] = useState(contract ? {
    contractNumber: contract.contractNumber,
    clientName: contract.clientName,
    contractName: contract.contractName,
    postTaxValue: contract.postTaxValue || 0,
    paidAmount: contract.paidAmount || 0,
    department: contract.department || 'Sales',
    status: contract.status || 'draft',
    createdBy: contract.createdBy || '',
  } : {
    contractNumber: '', clientName: '', contractName: '', postTaxValue: 0, paidAmount: 0, department: 'Sales', status: 'draft', createdBy: users[0]?.id || ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contractNumber.trim()) { setErr('Số hợp đồng không được trống.'); return; }
    setSaving(true); setErr('');
    try {
      const saved: Contract = {
        ...(contract || {
          id: Math.random().toString(36).substring(2, 10),
          products: [],
          preTaxValue: 0,
          vatRate: 10,
          createdAt: new Date().toISOString(),
        }),
        contractNumber: form.contractNumber.trim(),
        clientName: form.clientName,
        contractName: form.contractName,
        postTaxValue: Number(form.postTaxValue) || 0,
        paidAmount: Number(form.paidAmount) || 0,
        department: form.department,
        status: form.status,
        createdBy: form.createdBy,
        _isNew: !isEdit
      } as any;
      
      await onSave(saved);
      onClose();
    } catch { setErr('Lưu thất bại, vui lòng thử lại.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-500 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileSignature size={18} className="text-white" />
            <h3 className="text-white font-bold">{isEdit ? 'Chỉnh sửa Hợp đồng' : 'Tạo hợp đồng (Admin)'}</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"><AlertCircle size={15} />{err}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Số HĐ <span className="text-red-500">*</span></label>
              <input required value={form.contractNumber} onChange={e => set('contractNumber', e.target.value)}
                placeholder="VD: HD-001"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-300 outline-none">
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tên Khách Hàng</label>
            <input required value={form.clientName} onChange={e => set('clientName', e.target.value)}
              placeholder="VD: Công ty XYZ"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tên Hợp Đồng</label>
            <input required value={form.contractName} onChange={e => set('contractName', e.target.value)}
              placeholder="VD: Hợp đồng cung cấp dịch vụ"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Giá trị HĐ (Sau thuế)</label>
              <input type="number" required value={form.postTaxValue} onChange={e => set('postTaxValue', Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Đã thu</label>
              <input type="number" required value={form.paidAmount} onChange={e => set('paidAmount', Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phòng ban</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-300 outline-none">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Người tạo</label>
              <select value={form.createdBy} onChange={e => set('createdBy', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-300 outline-none">
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-blue-300 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <><RefreshCw size={14} className="animate-spin" />Đang lưu...</> : <><Save size={14} />{isEdit ? 'Lưu thay đổi' : 'Lưu hợp đồng'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminContractManagement() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null | undefined>(undefined);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cr, ur] = await Promise.all([apiFetch('/api/contracts'), apiFetch('/api/users')]);
      setContracts(await cr.json()); setUsers(await ur.json());
    } catch { setError('Không thể tải dữ liệu hợp đồng'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (c: Contract & { _isNew?: boolean }) => {
    const isNew = c._isNew;
    const res = await apiFetch(isNew ? '/api/contracts' : `/api/contracts/${c.id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
    if (!res.ok) throw new Error('Lỗi');
    showToast(isNew ? `Đã tạo hợp đồng: ${c.contractNumber}` : `Đã cập nhật: ${c.contractNumber}`);
    await fetchAll();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa hoàn toàn hợp đồng "${name}" khỏi cơ sở dữ liệu?`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/contracts/${id}`, { method: 'DELETE' });
      showToast(`Đã xóa: ${name}`);
      await fetchAll();
    } catch { showToast('Xóa thất bại', 'error'); }
    finally { setDeletingId(null); }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;
  const departments = [...new Set(contracts.map(c => c.department).filter(Boolean))].sort();

  const filtered = contracts.filter(c => {
    const s = search.toLowerCase();
    if (s && !c.contractNumber.toLowerCase().includes(s) && !c.clientName.toLowerCase().includes(s)) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterDept && c.department !== filterDept) return false;
    return true;
  });

  const stats = {
    total: contracts.length,
    totalValue: contracts.reduce((acc, c) => acc + (c.postTaxValue || 0), 0),
    totalDebt: contracts.reduce((acc, c) => acc + Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0)), 0),
    inProgress: contracts.filter(c => c.status === 'in_progress').length,
  };

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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg shadow-blue-200">
            <FileSignature size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Quản lý Hợp đồng</h1>
            <p className="text-sm text-gray-400 mt-0.5">Toàn bộ <strong className="text-gray-700">{contracts.length}</strong> hợp đồng trong hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng số lượng', value: stats.total, color: 'bg-blue-50 text-blue-700', icon: FileSignature },
          { label: 'Đang thực hiện', value: stats.inProgress, color: 'bg-indigo-50 text-indigo-700', icon: RefreshCw },
          { label: 'Tổng giá trị (tr)', value: Math.round(stats.totalValue / 1000000), color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
          { label: 'Tổng công nợ (tr)', value: Math.round(stats.totalDebt / 1000000), color: 'bg-rose-50 text-rose-700', icon: Wallet },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3`}>
            <s.icon size={20} /><div><p className="text-2xl font-black">{s.value}</p><p className="text-xs opacity-70">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={15} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm Số HĐ, Khách hàng..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm shadow-sm" />
        </div>
        {[
          { value: filterStatus, set: setFilterStatus, opts: [['', 'Tất cả trạng thái'], ...Object.entries(STATUS_LABEL)] },
          { value: filterDept, set: setFilterDept, opts: [['', 'Tất cả phòng ban'], ...departments.map(d => [d, d])] },
        ].map((f, i) => (
          <div key={i} className="relative">
            <Filter className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={14} />
            <select value={f.value} onChange={e => f.set(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none">
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" size={13} />
          </div>
        ))}
        {(filterStatus || filterDept || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterDept(''); }}
            className="px-3 py-2.5 text-xs text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50">Xóa bộ lọc</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-24 gap-3 text-red-500">
          <AlertCircle size={40} strokeWidth={1.5} /><p>{error}</p>
          <button onClick={fetchAll} className="px-4 py-2 bg-red-50 rounded-xl text-sm flex items-center gap-2"><RefreshCw size={14} />Thử lại</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              {filtered.length !== contracts.length ? `${filtered.length} / ${contracts.length} kết quả` : `${contracts.length} hợp đồng`}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-gray-400">
              <FileSignature size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p>Không tìm thấy hợp đồng nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Hợp đồng</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Phòng ban</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Giá trị / Công nợ</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Người tạo</th>
                    <th className="text-right py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => {
                    const debt = Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0));
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition-colors group">
                        <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-1">
                        <p className="font-bold text-gray-800">{c.contractNumber}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]" title={c.contractName}>{c.contractName}</p>
                        <div className="flex items-center">
                          {c.invoiceNumber ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Hóa đơn số: {c.invoiceNumber} {c.invoiceDate ? `- ${new Date(c.invoiceDate).toLocaleDateString('vi-VN')}` : ''}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Chưa có hóa đơn</span>
                          )}
                        </div>
                      </div>
                    </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-700">{c.clientName}</td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-gray-500 text-xs"><Building2 size={12} />{c.department || '-'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.postTaxValue || 0)}</p>
                          {debt > 0 ? (
                            <p className="text-xs font-bold text-rose-500">Nợ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt)}</p>
                          ) : (
                            <p className="text-xs text-gray-400">Đã thu đủ</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[c.status || 'draft'] || 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[c.status || 'draft'] || 'Nháp'}</span>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <span className="text-gray-500 text-xs">{getUserName(c.createdBy)}</span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingContract(c)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa nhanh (Admin)">
                              <Edit2 size={13} />
                            </button>
                            <button disabled={deletingId === c.id} onClick={() => handleDelete(c.id, c.contractNumber)}
                              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-50" title="Xóa">
                              {deletingId === c.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
      {editingContract !== undefined && (
        <ContractFormModal contract={editingContract} users={users} onClose={() => setEditingContract(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
