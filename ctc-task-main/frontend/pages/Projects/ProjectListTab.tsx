import React, { useState, useMemo } from 'react';
import { Project } from '../../types';
import { Edit2, Trash2, ChevronUp, ChevronDown, ArrowUpDown, Briefcase, AlertTriangle, Clock } from 'lucide-react';
import { Pagination } from '../../components/Pagination';

interface Props {
  projects: Project[];
  contracts: any[];
  tasks: any[];
  searchQuery: string;
  filterStatus: string;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}

type SortField = 'projectCode' | 'name' | 'clientName' | 'status' | 'progress' | 'value' | 'priority' | 'endDate';
type SortDir = 'asc' | 'desc';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'Đang chạy', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  on_hold: { label: 'Tạm dừng', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  planning: { label: 'Kế hoạch', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Khẩn cấp', cls: 'bg-red-100 text-red-700' },
  high: { label: 'Cao', cls: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Trung bình', cls: 'bg-blue-100 text-blue-600' },
  low: { label: 'Thấp', cls: 'bg-gray-100 text-gray-500' },
};

export const ProjectListTab: React.FC<Props> = ({ projects, contracts, tasks, searchQuery, filterStatus, onEdit, onDelete }) => {
  const [sortField, setSortField] = useState<SortField>('projectCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30 ml-1" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="ml-1 text-brand-600" /> : <ChevronDown size={12} className="ml-1 text-brand-600" />;
  };

  const getProjectProgress = (p: Project) => {
    const pTasks = tasks.filter((t: any) => t.projectId === p.id);
    const pDone = pTasks.filter((t: any) => t.status === 'Done');
    return pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;
  };

  const getProjectValue = (p: Project) => (p.winningPrice || p.budget) || 0;

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let result = projects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q) || (p.biddingCode && p.biddingCode.toLowerCase().includes(q)));
    }
    if (filterStatus) result = result.filter(p => p.status === filterStatus);
    
    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'projectCode': cmp = a.projectCode.localeCompare(b.projectCode); break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'clientName': cmp = (a.clientName || '').localeCompare(b.clientName || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'progress': cmp = getProjectProgress(a) - getProjectProgress(b); break;
        case 'value': cmp = getProjectValue(a) - getProjectValue(b); break;
        case 'priority': { const order = { critical: 0, high: 1, medium: 2, low: 3 }; cmp = (order[(a.priority || 'medium') as keyof typeof order] || 2) - (order[(b.priority || 'medium') as keyof typeof order] || 2); break; }
        case 'endDate': cmp = (a.endDate || '').localeCompare(b.endDate || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [projects, searchQuery, filterStatus, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('projectCode')}>
                <span className="flex items-center">Mã DA <SortIcon field="projectCode" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('name')}>
                <span className="flex items-center">Tên Dự án <SortIcon field="name" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('clientName')}>
                <span className="flex items-center">Khách hàng <SortIcon field="clientName" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('priority')}>
                <span className="flex items-center">Ưu tiên <SortIcon field="priority" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('status')}>
                <span className="flex items-center">Trạng thái <SortIcon field="status" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('progress')}>
                <span className="flex items-center">Tiến độ <SortIcon field="progress" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors" onClick={() => toggleSort('endDate')}>
                <span className="flex items-center">Hạn <SortIcon field="endDate" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-brand-600 transition-colors text-right" onClick={() => toggleSort('value')}>
                <span className="flex items-center justify-end">Giá trị <SortIcon field="value" /></span>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.map(p => {
              const progress = getProjectProgress(p);
              const value = getProjectValue(p);
              const isOverdue = p.endDate && p.endDate < today && p.status !== 'completed';
              const isNearDeadline = p.endDate && !isOverdue && p.endDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] && p.status !== 'completed';
              const statusInfo = STATUS_LABELS[p.status] || STATUS_LABELS.planning;
              const priorityInfo = PRIORITY_LABELS[p.priority || 'medium'] || PRIORITY_LABELS.medium;
              const pContracts = contracts.filter((c: any) => c.projectId === p.id && c.status !== 'cancelled');

              return (
                <tr key={p.id} className={`hover:bg-gray-50/80 transition-all cursor-pointer group ${isOverdue ? 'bg-red-50/30' : ''}`} onClick={() => onEdit(p)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md text-xs">{p.projectCode || p.biddingCode}</span>
                      {isOverdue && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                      {isNearDeadline && <Clock size={14} className="text-amber-500" />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-1">{p.name}</p>
                    {p.department && <p className="text-[11px] text-gray-400 mt-0.5">{p.department}</p>}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-sm">{p.clientName || p.investor || '-'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${priorityInfo.cls}`}>{priorityInfo.label}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-500 w-8 text-right">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.endDate ? (
                      <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 font-bold' : isNearDeadline ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                        {new Date(p.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-gray-800 text-sm">{value.toLocaleString('vi-VN')} đ</span>
                      {pContracts.length > 0 && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5"><Briefcase size={10} /> {pContracts.length} HĐ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(p)} className="p-1.5 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={15}/></button>
                      <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center text-gray-400">
                    <Briefcase size={40} className="mb-3 opacity-20" />
                    <p className="font-semibold text-gray-500 mb-1">Chưa có dự án nào</p>
                    <p className="text-sm">Bấm "Tạo mới" để thêm dự án đầu tiên</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
        </div>
      )}
    </div>
  );
};
