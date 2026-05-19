import React, { useState } from 'react';
import { Search, X, Check, FileText } from 'lucide-react';
import { Contract, ContractProduct } from '../../services/contractService';

interface InputContractPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: Contract[];
  onSelect: (products: ContractProduct[], contractId: string) => void;
}

export const InputContractPickerModal: React.FC<InputContractPickerModalProps> = ({
  isOpen,
  onClose,
  contracts,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inputContracts = contracts.filter(c => c.contractType === 'input' && c.status !== 'cancelled');

  const filteredContracts = inputContracts.filter(c =>
    (c.contractNumber?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (c.contractName?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (c.clientName?.toLowerCase().includes(search.toLowerCase()) || '')
  );

  const handleConfirm = () => {
    if (selectedId) {
      const selected = inputContracts.find(c => c.id === selectedId);
      if (selected && selected.products) {
        onSelect(selected.products, selected.id);
      }
    }
    onClose();
    setSelectedId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/80 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="text-blue-500" /> Chọn từ Hợp đồng mua vào
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
              placeholder="Tìm kiếm số hợp đồng, tên, đối tác..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredContracts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy Hợp đồng mua vào nào.
              </div>
            ) : (
              filteredContracts.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedId(c.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-gray-800">{c.contractNumber || 'Chưa có số'}</div>
                      <div className="text-sm font-medium text-gray-600">{c.contractName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">{(c.postTaxValue || 0).toLocaleString('vi-VN')} ₫</div>
                      <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">Đối tác: <span className="font-semibold text-gray-700">{c.clientName}</span></div>
                  <div className="text-xs font-bold text-gray-500 flex flex-wrap gap-1">
                    Sản phẩm ({c.products?.length || 0}): 
                    {c.products?.slice(0, 3).map((p, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                        {p.name} (x{p.quantity})
                      </span>
                    ))}
                    {(c.products?.length || 0) > 3 && <span className="text-gray-400">...</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end items-center bg-gray-50 dark:bg-slate-800/80 rounded-b-2xl gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors">
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <Check size={18} /> Chọn Hợp đồng này
          </button>
        </div>
      </div>
    </div>
  );
};
