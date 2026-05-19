import React, { useState, useMemo } from 'react';
import { Search, X, Package, Check } from 'lucide-react';
import { Product } from '../../services/productService';
import { Contract } from '../../services/contractService';

interface WarehousePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  contracts: Contract[]; // Used to calculate remaining inventory
  onSelect: (selectedProducts: { product: Product; quantity: number }[]) => void;
}

export const WarehousePickerModal: React.FC<WarehousePickerModalProps> = ({
  isOpen,
  onClose,
  products,
  contracts,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});

  const calculateRemaining = (p: Product) => {
    const importQty = p.importQuantity || 0;
    const exportQty = contracts
      .flatMap(c => c.products || [])
      .filter(cp => cp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
      .reduce((sum, cp) => sum + (cp.exportedQuantity || 0), 0);
    return importQty - exportQty;
  };

  const inventoryProducts = useMemo(() => {
    return products.map(p => ({
      ...p,
      remaining: calculateRemaining(p)
    }));
  }, [products, contracts]);

  const filteredProducts = inventoryProducts.filter(p =>
    p.remaining > 0 &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.importCode?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleQtyChange = (id: string, val: string, max: number) => {
    const qty = Math.max(0, Math.min(Number(val.replace(/\D/g, '')) || 0, max));
    setSelectedQty(prev => {
      const next = { ...prev };
      if (qty === 0) {
        delete next[id];
      } else {
        next[id] = qty;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = Object.entries(selectedQty)
      .map(([id, quantity]) => {
        const product = products.find(p => p.id === id);
        return product ? { product, quantity } : null;
      })
      .filter((item): item is { product: Product; quantity: number } => item !== null);

    if (selected.length > 0) {
      onSelect(selected);
    }
    onClose();
    setSelectedQty({});
  };

  if (!isOpen) return null;

  const totalSelected = Object.keys(selectedQty).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/80 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="text-emerald-500" /> Chọn hàng từ Kho
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã SKU, tên hàng hóa (chỉ hiển thị hàng còn tồn)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="p-3 font-bold text-gray-600 dark:text-slate-300 text-xs uppercase">Mã / Sản phẩm</th>
                  <th className="p-3 font-bold text-gray-600 dark:text-slate-300 text-xs uppercase text-center w-20">Tồn kho</th>
                  <th className="p-3 font-bold text-gray-600 dark:text-slate-300 text-xs uppercase text-right w-24">Giá vốn</th>
                  <th className="p-3 font-bold text-gray-600 dark:text-slate-300 text-xs uppercase text-right w-28">Giá bán (Gợi ý)</th>
                  <th className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase text-center w-32">SL Bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Không tìm thấy hàng hóa phù hợp hoặc trong kho đã hết hàng.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-800 dark:text-slate-200">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.importCode ? `SKU: ${p.importCode} | ` : ''}ĐVT: {p.unit || '-'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-xs">{p.remaining}</span>
                      </td>
                      <td className="p-3 text-right text-sm text-gray-500">
                        {p.importPrice ? p.importPrice.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 text-sm">
                        {(p.salePrice || p.defaultPrice) ? (p.salePrice || p.defaultPrice)?.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={p.remaining}
                          value={selectedQty[p.id] || ''}
                          onChange={e => handleQtyChange(p.id, e.target.value, p.remaining)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded text-center focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 bg-emerald-50/50"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 rounded-b-2xl">
          <div className="text-sm font-medium text-gray-600 dark:text-slate-300">
            Đã chọn: <span className="font-bold text-emerald-600 text-base">{totalSelected}</span> sản phẩm
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl font-bold transition-colors">
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalSelected === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
            >
              <Check size={18} /> Xác nhận ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
