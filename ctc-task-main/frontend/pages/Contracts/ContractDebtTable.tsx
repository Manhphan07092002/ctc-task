import React from 'react';
import { FileText } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Pagination } from '../../components/Pagination';
import { fmtMoney } from './contractUtils';

interface ContractDebtTableProps {
  filtered: Contract[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  totalPostTax: number;
  totalPaid: number;
  totalDebt: number;
  onPayment: (c: Contract) => void;
}

export const ContractDebtTable: React.FC<ContractDebtTableProps> = ({
  filtered, currentPage, itemsPerPage, onPageChange,
  totalPostTax, totalPaid, totalDebt, onPayment
}) => {
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider w-12">STT</th>
            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Số hợp đồng</th>
            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Chủ đầu tư</th>
            <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Giá trị (Sau thuế)</th>
            <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Đã thanh toán</th>
            <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Công nợ</th>
            <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Tỷ lệ thu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {currentData.map((c, idx) => {
            const pTax = c.postTaxValue || 0;
            const paid = c.paidAmount || 0;
            const debt = Math.max(0, pTax - paid);
            const rate = pTax > 0 ? Math.round((paid / pTax) * 100) : 0;
            return (
              <tr key={c.id} onClick={() => onPayment(c)} className="hover:bg-emerald-50/50 transition-colors group cursor-pointer">
                <td className="px-4 py-3 text-gray-500 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{c.contractNumber}</td>
                <td className="px-4 py-3 text-gray-700">{c.clientName}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmtMoney(pTax)}</td>
                <td className="px-4 py-3 text-right font-semibold text-blue-600">{fmtMoney(paid)}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{fmtMoney(debt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${rate === 100 ? 'bg-emerald-500' : rate >= 50 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 w-6 text-right">{rate}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="py-16 text-center text-gray-400">
              <FileText size={44} className="mx-auto mb-3 opacity-20"/>
              <p className="font-medium">Chưa có hợp đồng nào</p>
            </td></tr>
          )}
        </tbody>
        {filtered.length > 0 && (
          <tfoot>
            <tr className="bg-rose-50 border-t-2 border-rose-200">
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-rose-800 text-sm">Tổng cộng (Theo bộ lọc):</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">{fmtMoney(totalPostTax)}</td>
              <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">{fmtMoney(totalPaid)}</td>
              <td className="px-4 py-3 text-right font-black text-rose-600 text-base">{fmtMoney(totalDebt)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} totalItems={totalItems} itemsPerPage={itemsPerPage} />
        </div>
      )}
    </>
  );
};
