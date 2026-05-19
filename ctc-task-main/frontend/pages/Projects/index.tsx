import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project } from '../../types';
import { PlusCircle, Search, List, LayoutGrid, BarChart2, Calendar, AlertTriangle, TrendingUp, Briefcase, Clock } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DropResult } from '@hello-pangea/dnd';

import { useProjectStats } from './hooks/useProjectStats';
import { ProjectListTab } from './ProjectListTab';
import { ProjectKanbanTab } from './ProjectKanbanTab';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { ProjectTimelineTab } from './ProjectTimelineTab';
import { ProjectEditForm } from './ProjectEditForm';

type TabType = 'list' | 'kanban' | 'overview' | 'timeline';

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: 'list', label: 'Danh sách', icon: List },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
];

const ProjectsPage: React.FC = () => {
  const { projects, contracts = [], tasks = [], users = [], departments = [], saveProject, deleteProject, saveContract } = useData();
  const { user } = useAuth();
  
  const perms = user?.permissions || [];
  const canEditProject = (p: Project) => p.managerId === user?.id || user?.role === 'Manager' || perms.includes('admin_panel') || perms.includes('director_feedback');

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const stats = useProjectStats(projects, contracts, tasks);

  const handleSave = async () => {
    if (!editingProject.name || !editingProject.projectCode) return;
    await saveProject(editingProject as Project);
    setIsEditing(false);
    setEditingProject({});
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProject(deleteId);
      setDeleteId(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;
    const project = projects.find(p => p.id === draggableId);
    if (project && canEditProject(project)) {
      await saveProject({ ...project, status: destination.droppableId });
    } else if (project) {
      alert('Bạn không có quyền chuyển trạng thái dự án này.');
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setIsEditing(true);
  };

  const navigateToProject = (id: string) => {
    const p = projects.find(x => x.id === id);
    if (p) openEdit(p);
  };

  if (isEditing) {
    return (
      <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
        <ProjectEditForm
          project={editingProject}
          projects={projects}
          onChange={setEditingProject}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setEditingProject({}); }}
          contracts={contracts}
          tasks={tasks}
          users={users}
          departments={departments}
          saveContract={saveContract}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Dự án</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Theo dõi và điều phối các dự án của tổ chức</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm tên, mã DA, mã TBMT..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm font-medium" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="hidden sm:block text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-brand-500 font-medium text-gray-600">
            <option value="">Tất cả</option>
            <option value="planning">Kế hoạch</option><option value="in_progress">Đang chạy</option><option value="on_hold">Tạm dừng</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option>
          </select>
          <button onClick={() => { setEditingProject({ status: 'planning', budget: 0, priority: 'medium', phase: 'initiation' }); setIsEditing(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl hover:shadow-md hover:shadow-brand-500/20 transition-all font-bold text-sm">
            <PlusCircle size={18} /> Tạo mới
          </button>
        </div>
      </div>

      {/* Summary mini cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Briefcase size={18} className="text-blue-600" /></div>
          <div><p className="text-lg font-black text-gray-800">{stats.totalProjects}</p><p className="text-[10px] text-gray-500 font-medium uppercase">Tổng dự án</p></div>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center"><TrendingUp size={18} className="text-indigo-600" /></div>
          <div><p className="text-lg font-black text-gray-800">{stats.statusCounts.in_progress || 0}</p><p className="text-[10px] text-gray-500 font-medium uppercase">Đang chạy</p></div>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.nearDeadline > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}><Clock size={18} className={stats.nearDeadline > 0 ? 'text-amber-600' : 'text-gray-400'} /></div>
          <div><p className="text-lg font-black text-gray-800">{stats.nearDeadline}</p><p className="text-[10px] text-gray-500 font-medium uppercase">Sắp hết hạn</p></div>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.overdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}><AlertTriangle size={18} className={stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'} /></div>
          <div><p className="text-lg font-black text-gray-800">{stats.overdue}</p><p className="text-[10px] text-gray-500 font-medium uppercase">Quá hạn</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-white border border-gray-200 rounded-xl w-max shadow-sm">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'list' && <ProjectListTab projects={projects} contracts={contracts} tasks={tasks} searchQuery={searchQuery} filterStatus={filterStatus} onEdit={openEdit} onDelete={setDeleteId} canEditProject={canEditProject} />}
      {activeTab === 'kanban' && <ProjectKanbanTab projects={projects} contracts={contracts} tasks={tasks} searchQuery={searchQuery} filterStatus={filterStatus} onEdit={openEdit} onDragEnd={handleDragEnd} canEditProject={canEditProject} />}
      {activeTab === 'overview' && <ProjectOverviewTab stats={stats} onNavigateToProject={navigateToProject} />}
      {activeTab === 'timeline' && <ProjectTimelineTab projects={projects} tasks={tasks} searchQuery={searchQuery} filterStatus={filterStatus} onEdit={openEdit} canEditProject={canEditProject} />}

      <ConfirmDialog isOpen={!!deleteId} title="Xóa dự án" message="Bạn có chắc muốn xóa dự án này không?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" confirmText="Xóa" cancelText="Hủy" />
    </div>
  );
};

export default ProjectsPage;
