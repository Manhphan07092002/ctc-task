import React, { useState, useEffect } from 'react';
import { X, Save, PackageMinus } from 'lucide-react';
import { Contract, ContractProduct } from '../../services/contractService';

interface ExportStockModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractId: string, updatedProducts: ContractProduct[]) => Promise<void>;
}

export const ExportStockModal: React.FC<ExportStockModalProps> = ({ contract, onClose, onSave }) => {
  const [products, setProducts] = useState<ContractProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contract?.products) {
      // Create a deep copy to edit
      setProducts(JSON.parse(JSON.stringify(contract.products)));
    }
  }, [contract]);

  if (!contract) return null;

  const handleExportQuantityChange = (index: number, val: string) => {
    const newQty = Number(val.replace(/\D/g, '')) || 0;
    const maxQty = products[index].quantity;
    
    // Prevent exporting more than total quantity in contract
    const safeQty = Math.min(newQty, maxQty);
    
    const newProducts = [...products];
    newProducts[index].exportedQuantity = safeQty;
    setProducts(newProducts);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(contract.id, products);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra khi lưu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <PackageMinus className="text-blue-500" />
            Xuất kho theo hợp đồng
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Hợp đồng: <span className="text-blue-600">{contract.contractNumber}</span></p>
              <p className="text-xs text-gray-500 mt-1">Khách hàng: {contract.clientName}</p>
            </div>

            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                    <th className="p-3 font-bold text-gray-600 dark:text-slate-300">Sản phẩm</th>
                    <th className="p-3 font-bold text-gray-600 dark:text-slate-300 text-center w-24">Tổng SL</th>
                    <th className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-center w-32">Đã xuất kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {products.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-gray-800 dark:text-slate-200">{p.name}</p>
                        <p className="text-xs text-gray-500">ĐVT: {p.unit}</p>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-700 dark:text-slate-300">{p.quantity}</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          min="0"
                          max={p.quantity}
                          value={p.exportedQuantity !== undefined ? p.exportedQuantity : 0}
                          onChange={e => handleExportQuantityChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded text-center focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                        />
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-500">Hợp đồng này chưa có sản phẩm nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs flex gap-2">
              <div className="font-bold">Lưu ý:</div>
              <div>Số lượng đã xuất kho sẽ được trừ vào Tồn kho trong trang Quản lý Kho. Bạn có thể xuất kho từng phần (một số lượng nhỏ hơn Tổng SL).</div>
            </div>
          </div>
          
          <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex gap-3 bg-gray-50 dark:bg-slate-800/80">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-xl font-bold transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={loading || products.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
              <Save size={18} /> {loading ? 'Đang lưu...' : 'Xác nhận xuất kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
