import React, { useMemo, useState } from 'react';
import { Package, Search, ExternalLink } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Product } from '../../services/productService';

interface InventoryTabProps {
  contracts: Contract[];
  products: Product[];
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ contracts, products }) => {
  const [search, setSearch] = useState('');

  const inventoryData = useMemo(() => {
    return products.map(p => {
      // Find all output contracts that use this product
      const outputContracts = contracts.filter(c => 
        c.contractType === 'output' && 
        c.products?.some(cp => cp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
      );

      // Map to contract details
      const relatedContracts = outputContracts.map(c => {
        const cp = c.products?.find(x => x.name.trim().toLowerCase() === p.name.trim().toLowerCase());
        return {
          contractNumber: c.contractNumber,
          clientName: c.clientName,
          exportedQty: cp?.exportedQuantity || cp?.quantity || 0
        };
      });

      const totalExported = relatedContracts.reduce((sum, rc) => sum + rc.exportedQty, 0);
      const importQty = p.importQuantity || 0;
      const remaining = importQty - totalExported;

      return {
        ...p,
        totalExported,
        remaining,
        relatedContracts
      };
    }).filter(p => p.importQuantity && p.importQuantity > 0); // Only show products that have been imported
  }, [products, contracts]);

  const filteredData = inventoryData.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.importCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-emerald-500" /> Hàng đã phân bổ
          </h2>
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-bold text-gray-500 text-xs uppercase w-12 text-center">STT</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase min-w-[200px]">Sản phẩm</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase text-center w-24">Tổng mua</th>
                <th className="p-4 font-bold text-emerald-600 text-xs uppercase text-center w-28">Đã phân bổ</th>
                <th className="p-4 font-bold text-blue-600 text-xs uppercase text-center w-24">Tồn kho</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase w-64">Hợp đồng Bán liên quan</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase min-w-[150px]">Tiến trình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Không tìm thấy dữ liệu.
                  </td>
                </tr>
              ) : (
                filteredData.map((p, idx) => {
                  const percentAllocated = p.importQuantity ? Math.min(100, Math.round((p.totalExported / p.importQuantity) * 100)) : 0;
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 text-center text-sm font-medium text-gray-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.importCode ? `SKU: ${p.importCode} | ` : ''}ĐVT: {p.unit || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-600 text-sm">
                        {p.importQuantity?.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600 text-sm">
                        {p.totalExported.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          p.remaining <= 0 ? 'bg-rose-100 text-rose-700' :
                          p.remaining <= 5 ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {p.remaining}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {p.relatedContracts.map((rc, i) => (
                            <div key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs" title={rc.clientName}>
                              <span className="font-semibold text-gray-700">{rc.contractNumber}</span>
                              <span className="text-emerald-600 font-bold">({rc.exportedQty})</span>
                            </div>
                          ))}
                          {p.relatedContracts.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Chưa có HĐ nào</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${percentAllocated >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${percentAllocated}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-right mt-1 text-gray-500 font-medium">
                          {percentAllocated}%
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
