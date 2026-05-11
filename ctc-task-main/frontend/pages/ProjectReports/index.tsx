import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project, ProjectReport } from '../../types';
import { PlusCircle, Search, Edit2, Trash2, FileText } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { getProjectReports, saveProjectReport, deleteProjectReport } from '../../services/projectService';

const ProjectReportsPage: React.FC = () => {
  const { projects, users } = useData();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<ProjectReport>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    if (selectedProjectId) {
      setIsLoading(true);
      getProjectReports(selectedProjectId)
        .then(data => setReports(data))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [selectedProjectId]);

  const filtered = useMemo(() => {
    let result = reports;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(q));
    }
    return result;
  }, [reports, searchQuery]);

  const handleSave = async () => {
    if (!editingReport.title || !selectedProjectId) return;
    try {
      await saveProjectReport(selectedProjectId, { ...editingReport, authorId: user?.id } as ProjectReport);
      const data = await getProjectReports(selectedProjectId);
      setReports(data);
      setIsEditing(false);
      setEditingReport({});
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (deleteId && selectedProjectId) {
      try {
        await deleteProjectReport(selectedProjectId, deleteId);
        setReports(reports.filter(r => r.id !== deleteId));
      } catch (e) { console.error(e); }
      setDeleteId(null);
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-300 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6 text-gray-800">{editingReport.id ? 'Sửa Báo cáo' : 'Thêm Báo cáo mới'}</h2>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Tiêu đề *</label>
            <input value={editingReport.title || ''} onChange={e => setEditingReport({...editingReport, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="Tiêu đề báo cáo" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Dự án</label>
            <select disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500">
              <option>{projects.find(p => p.id === selectedProjectId)?.name || ''}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Nội dung báo cáo</label>
            <textarea value={editingReport.content || ''} onChange={e => setEditingReport({...editingReport, content: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 min-h-[200px]" placeholder="Nhập nội dung tiến độ, khó khăn, đề xuất..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Tiến độ (%)</label>
              <input type="number" min="0" max="100" value={editingReport.progress || 0} onChange={e => setEditingReport({...editingReport, progress: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Trạng thái</label>
              <select value={editingReport.status || 'draft'} onChange={e => setEditingReport({...editingReport, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="draft">Bản nháp</option>
                <option value="submitted">Đã gửi</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">Hủy</button>
          <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold" disabled={!editingReport.title}>Lưu Báo cáo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Báo cáo Dự án</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Báo cáo tiến độ và tình trạng các dự án</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full sm:w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-sm">
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>
            ))}
            {projects.length === 0 && <option value="">Không có dự án nào</option>}
          </select>
          
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
          </div>
          
          <button onClick={() => { setEditingReport({ status: 'draft', progress: 0 }); setIsEditing(true); }} disabled={!selectedProjectId} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold text-sm disabled:opacity-50">
            <PlusCircle size={16} /> Viết báo cáo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày báo cáo</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Người báo cáo</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tiến độ</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600 font-medium">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{r.title}</td>
                  <td className="px-6 py-4 text-gray-600">{(() => { const u = users.find((u: any) => u.id === r.authorId); return u ? u.name : r.authorId; })()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${r.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-600">{r.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[11px] font-bold uppercase rounded-md ${r.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {r.status === 'submitted' ? 'Đã gửi' : 'Nháp'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingReport(r); setIsEditing(true); }} className="p-1.5 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    Chưa có báo cáo nào cho dự án này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {totalPages > 1 && !isLoading && (
          <div className="p-4 border-t border-gray-100">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={!!deleteId} title="Xóa báo cáo" message="Bạn có chắc muốn xóa báo cáo này không?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" confirmText="Xóa" cancelText="Hủy"/>
    </div>
  );
};

export default ProjectReportsPage;
