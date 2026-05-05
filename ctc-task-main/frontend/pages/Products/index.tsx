import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit2, Trash2, X, Save, Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import * as productService from '../../services/productService';

export default function ProductsPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<productService.Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: '', origin: '', defaultPrice: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        origin: form.origin.trim(),
        defaultPrice: Number(form.defaultPrice.replace(/\D/g, '')) || 0,
      };

      if (editingId) {
        await productService.updateProduct(editingId, payload);
      } else {
        await productService.createProduct(payload);
      }
      
      setForm({ name: '', unit: '', origin: '', defaultPrice: '' });
      setEditingId(null);
      loadProducts();
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleEdit = (p: productService.Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      unit: p.unit || '',
      origin: p.origin || '',
      defaultPrice: p.defaultPrice ? String(p.defaultPrice) : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', unit: '', origin: '', defaultPrice: '' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await productService.deleteProduct(deleteId);
      setDeleteId(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Lỗi khi xóa sản phẩm');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.origin?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="text-emerald-500" /> Quản lý Sản phẩm / Dịch vụ
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Chuẩn hóa danh mục để gợi ý nhanh khi tạo hợp đồng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
              {editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">TÊN SẢN PHẨM *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">ĐƠN VỊ TÍNH</label>
                  <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="VD: Cái, Bộ"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">XUẤT XỨ</label>
                  <input value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="VD: VN"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">ĐƠN GIÁ MẶC ĐỊNH (VNĐ)</label>
                <input value={form.defaultPrice ? Number(form.defaultPrice.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} 
                  onChange={e => setForm({...form, defaultPrice: e.target.value})} placeholder="1.000.000"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 font-medium" />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" disabled={!form.name} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={18} /> {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition-colors">
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Tìm kiếm sản phẩm..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-700 text-gray-800 dark:text-slate-100" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-12 text-center">STT</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Tên sản phẩm</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">ĐVT</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Xuất xứ</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Đơn giá</th>
                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Không tìm thấy sản phẩm nào.</td></tr>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 text-sm text-gray-500 dark:text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-3 text-sm font-bold text-gray-800 dark:text-slate-200">{p.name}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-slate-400">{p.unit || '-'}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-slate-400">{p.origin || '-'}</td>
                        <td className="p-3 text-sm font-semibold text-emerald-600 text-right">{p.defaultPrice ? p.defaultPrice.toLocaleString('vi-VN') : '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog isOpen={!!deleteId} title="Xóa sản phẩm" message="Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh mục?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" />
    </div>
  );
}
