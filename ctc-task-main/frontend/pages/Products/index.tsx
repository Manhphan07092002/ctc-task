import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit2, Trash2, X, Save, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import * as productService from '../../services/productService';

export default function ProductsPage() {
  const { t } = useLanguage();
  const { contracts } = useData();
  const [products, setProducts] = useState<productService.Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    category: '',
    importCode: '',
    unit: '', 
    origin: '', 
    importQuantity: '',
    importPrice: '',
    salePrice: '' 
  });
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

  const calculateRemaining = (p: productService.Product) => {
    const importQty = p.importQuantity || 0;
    const exportQty = contracts
      .flatMap(c => c.products || [])
      .filter(cp => cp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
      .reduce((sum, cp) => sum + (cp.exportedQuantity || 0), 0);
    return importQty - exportQty;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        importCode: form.importCode.trim(),
        unit: form.unit.trim(),
        origin: form.origin.trim(),
        importQuantity: Number(form.importQuantity.replace(/\D/g, '')) || 0,
        importPrice: Number(form.importPrice.replace(/\D/g, '')) || 0,
        salePrice: Number(form.salePrice.replace(/\D/g, '')) || 0,
      };

      if (editingId) {
        await productService.updateProduct(editingId, payload);
      } else {
        await productService.createProduct(payload);
      }
      
      closeModal();
      loadProducts();
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra');
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', category: '', importCode: '', unit: '', origin: '', importQuantity: '', importPrice: '', salePrice: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (p: productService.Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category || '',
      importCode: p.importCode || '',
      unit: p.unit || '',
      origin: p.origin || '',
      importQuantity: p.importQuantity ? String(p.importQuantity) : '',
      importPrice: p.importPrice ? String(p.importPrice) : '',
      salePrice: (p.salePrice || p.defaultPrice) ? String(p.salePrice || p.defaultPrice) : ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ name: '', category: '', importCode: '', unit: '', origin: '', importQuantity: '', importPrice: '', salePrice: '' });
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
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.importCode?.toLowerCase().includes(search.toLowerCase()) ||
    p.origin?.toLowerCase().includes(search.toLowerCase())
  );

  const totalInventoryValue = products.reduce((sum, p) => sum + (calculateRemaining(p) * (p.importPrice || 0)), 0);
  const lowStockProducts = products.filter(p => {
    const r = calculateRemaining(p);
    return r > 0 && r <= 5;
  }).length;
  const outOfStockProducts = products.filter(p => calculateRemaining(p) <= 0).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="text-emerald-500" /> Quản lý Xuất/Nhập Kho
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Quản lý hàng hóa, kiểm soát tồn kho và theo dõi giá vốn/bán</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm">
          <PlusCircle size={18} />
          Nhập kho
        </button>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 border-l-4 border-emerald-500">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Tổng mặt hàng</p>
            <p className="text-2xl font-black text-gray-800">{products.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-l-4 border-blue-500">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Tổng giá trị tồn kho</p>
            <p className="text-2xl font-black text-gray-800">{totalInventoryValue.toLocaleString('vi-VN')} ₫</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-l-4 border-amber-500">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Sắp hết hàng</p>
            <p className="text-2xl font-black text-amber-600">{lowStockProducts}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-l-4 border-rose-500">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <X size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Hết hàng</p>
            <p className="text-2xl font-black text-rose-600">{outOfStockProducts}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm kiếm tên, mã kho, danh mục..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-700 text-gray-800 dark:text-slate-100" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-12 text-center">STT</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Mã NK</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Sản phẩm</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Loại SP</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-20">SL Nhập</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-20">Tồn kho</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Giá nhập</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-right">Giá bán</th>
                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Không tìm thấy hàng hóa nào.</td></tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const remain = calculateRemaining(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 text-sm text-gray-500 dark:text-slate-400 text-center">{idx + 1}</td>
                      <td className="p-3 text-sm font-semibold text-gray-700 dark:text-slate-300">{p.importCode || '-'}</td>
                      <td className="p-3">
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.origin || '-'} | ĐVT: {p.unit || '-'}</p>
                      </td>
                      <td className="p-3 text-sm font-medium text-gray-600 dark:text-slate-400">
                        {p.category ? <span className="text-xs">{p.category}</span> : '-'}
                      </td>
                      <td className="p-3 text-center text-sm font-bold text-gray-600">
                        {p.importQuantity ? p.importQuantity.toLocaleString('vi-VN') : '0'}
                      </td>
                      <td className="p-3 text-center">
                        {remain <= 0 ? (
                          <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded font-bold text-xs whitespace-nowrap">Hết hàng (0)</span>
                        ) : remain <= 5 ? (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-bold text-xs">{remain}</span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-xs">{remain}</span>
                        )}
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-500 text-right">{p.importPrice ? p.importPrice.toLocaleString('vi-VN') : '-'}</td>
                      <td className="p-3 text-sm font-bold text-emerald-600 text-right">{(p.salePrice || p.defaultPrice) ? (p.salePrice || p.defaultPrice)?.toLocaleString('vi-VN') : '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog isOpen={!!deleteId} title="Xóa sản phẩm" message="Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh mục?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" />

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Package className="text-emerald-500" />
                {editingId ? 'Cập nhật hàng hóa' : 'Nhập kho'}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">TÊN SẢN PHẨM *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="VD: Laptop Dell Inspiron..."
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">MÃ NHẬP KHO (SKU)</label>
                  <input value={form.importCode} onChange={e => setForm({...form, importCode: e.target.value})} placeholder="VD: DELL-INS-001"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">LOẠI SẢN PHẨM</label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="VD: Vật tư, Thiết bị..."
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">ĐƠN VỊ TÍNH</label>
                  <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="VD: Cái, Bộ"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">XUẤT XỨ</label>
                  <input value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="VD: VN"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">SỐ LƯỢNG TỔNG (NHẬP KHO)</label>
                  <input value={form.importQuantity ? Number(form.importQuantity.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} 
                    onChange={e => setForm({...form, importQuantity: e.target.value})} placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 text-center font-bold text-blue-600" />
                  <p className="text-[10px] text-gray-400 mt-1">* Số lượng còn lại (tồn kho) sẽ tự động được tính = Số lượng tổng trừ đi số lượng đã xuất hóa đơn trong Hợp đồng.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">GIÁ NHẬP / GIÁ VỐN (VNĐ)</label>
                  <input value={form.importPrice ? Number(form.importPrice.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} 
                    onChange={e => setForm({...form, importPrice: e.target.value})} placeholder="1.000.000"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">GIÁ BÁN GỢI Ý (VNĐ)</label>
                  <input value={form.salePrice ? Number(form.salePrice.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} 
                    onChange={e => setForm({...form, salePrice: e.target.value})} placeholder="1.200.000"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 text-right font-bold text-emerald-600" />
                </div>
              </div>

              <div className="pt-6 flex gap-3 border-t border-gray-100 dark:border-slate-700 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                  Hủy bỏ
                </button>
                <button type="submit" disabled={!form.name} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
                  <Save size={20} /> {editingId ? 'Cập nhật' : 'Lưu vào kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
