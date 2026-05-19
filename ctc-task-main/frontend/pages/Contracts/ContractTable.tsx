import React from 'react';
import { FileText, Pencil, Trash2, Paperclip, Building2, PackageMinus, Eye, DollarSign } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Pagination } from '../../components/Pagination';
import { CHECKLIST_ITEMS, getStatusBadge, getStatusSelectClasses, STATUS_OPTIONS } from './contractUtils';

interface ContractTableProps {
  filtered: Contract[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  canViewAll: boolean;
  canApproveContract: boolean;
  canEditContract: (c: Contract) => boolean;
  getUserName: (id: string) => string;
  onEdit: (c: Contract, readOnly?: boolean) => void;
  onDelete: (id: string) => void;
  onQuickStatusChange: (c: Contract, status: string) => void;
  onExportStock: (c: Contract) => void;
  onExportInvoice: (c: Contract) => void;
  onPayment?: (c: Contract) => void;
}

export const ContractTable: React.FC<ContractTableProps> = ({
  filtered, currentPage, itemsPerPage, onPageChange,
  canViewAll, canApproveContract, canEditContract, getUserName,
  onEdit, onDelete, onQuickStatusChange, onExportStock, onExportInvoice, onPayment
}) => {
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Hợp đồng</th>
            <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
            {canViewAll && <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Phòng ban</th>}
            <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Giá trị / Công nợ</th>
            <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
            <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Người tạo</th>
            <th className="text-right py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {currentData.map(c => {
            const debt = Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0));
            const statusInfo = getStatusBadge(c.status);
            const canEdit = canEditContract(c);
            return (
              <tr key={c.id} 
                  className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                  onClick={() => onEdit(c, !canEdit)}
              >
                <td className="py-3.5 px-5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-800">{c.contractNumber}</p>
                      {c.attachments && c.attachments.length > 0 && <Paperclip size={12} className="text-emerald-500 flex-shrink-0" />}
                    </div>
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
                    {/* Document Checklist Mini */}
                    {(() => {
                      const cl = c.documentChecklist || {};
                      const done = CHECKLIST_ITEMS.filter(item => cl[item.key]).length;
                      const total = CHECKLIST_ITEMS.length;
                      if (done === 0) return null;
                      return (
                        <div className="flex items-center gap-1 mt-1" title={`Hồ sơ: ${done}/${total} - ${CHECKLIST_ITEMS.filter(item => cl[item.key]).map(i => i.short).join(', ')}`}>
                          {CHECKLIST_ITEMS.map(item => (
                            <div key={item.key} className={`w-2 h-2 rounded-full ${cl[item.key] ? 'bg-emerald-500' : 'bg-gray-200'}`} title={item.label}></div>
                          ))}
                          <span className={`text-[9px] font-bold ml-1 ${done === total ? 'text-emerald-600' : 'text-amber-600'}`}>{done}/{total}</span>
                        </div>
                      );
                    })()}
                  </div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-gray-700">{c.clientName}</td>
                {canViewAll && (
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <span className="flex items-center gap-1.5 text-gray-500 text-xs"><Building2 size={12} />{c.department || '-'}</span>
                  </td>
                )}
                <td className="py-3.5 px-4">
                  <p className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.postTaxValue || 0)}</p>
                  {debt > 0 ? (
                    <p className="text-xs font-bold text-rose-500">Nợ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt)}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Đã thu đủ</p>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center" onClick={e => canEdit ? e.stopPropagation() : undefined}>
                  {(canApproveContract || canEdit) ? (
                    <select
                      value={c.status || 'draft'}
                      onChange={(e) => onQuickStatusChange(c, e.target.value)}
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 shadow-sm ${getStatusSelectClasses(c.status)}`}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} className={opt.className}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusInfo.classes}`}>{statusInfo.label}</span>
                  )}
                </td>
                <td className="py-3.5 px-4 hidden lg:table-cell">
                  <span className="text-gray-500 text-xs">{getUserName(c.createdBy)}</span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onExportStock(c); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xuất kho"><PackageMinus size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onExportInvoice(c); }} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Xuất hóa đơn"><FileText size={14}/></button>
                    {!canEdit ? (
                      <button onClick={(e) => { e.stopPropagation(); onEdit(c, true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết"><Eye size={14}/></button>
                    ) : (
                      <>
                        {onPayment && (
                          <button onClick={(e) => { e.stopPropagation(); onPayment(c); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Thanh toán"><DollarSign size={14}/></button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onEdit(c, false); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Chỉnh sửa"><Pencil size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={14}/></button>
                      </>
                    )}
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
      </table>
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} totalItems={totalItems} itemsPerPage={itemsPerPage} />
        </div>
      )}
    </>
  );
};
