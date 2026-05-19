import React, { useState, useEffect } from 'react';
import { Project, ProjectMilestone, User } from '../../types';
import { Building, CheckCircle2, DollarSign, AlignLeft, PieChart as PieChartIcon, Briefcase, List, ExternalLink, Trash2, Target, UserIcon, Clock, Plus, Flag, Milestone } from 'lucide-react';
import { getProjectMilestones, saveProjectMilestone, deleteProjectMilestone } from '../../services/projectService';

interface Props {
  project: Partial<Project>;
  projects: Project[];
  onChange: (p: Partial<Project>) => void;
  onSave: () => void;
  onCancel: () => void;
  contracts: any[];
  tasks: any[];
  users: User[];
  departments: any[];
  saveContract: (c: any) => Promise<void>;
}

const PHASE_LABELS: Record<string, string> = {
  initiation: 'Khởi tạo', planning: 'Lập kế hoạch', execution: 'Thực hiện', monitoring: 'Giám sát', closure: 'Nghiệm thu',
};

export const ProjectEditForm: React.FC<Props> = ({ project, projects, onChange, onSave, onCancel, contracts, tasks, users, departments, saveContract }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');

  const projectContracts = contracts.filter((c: any) => c.projectId === project.id && c.status !== 'cancelled');
  const contractValue = projectContracts.reduce((sum: number, c: any) => sum + (c.postTaxValue || 0), 0);
  const budget = project.budget || 0;
  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const completedTasks = projectTasks.filter((t: any) => t.status === 'Done');
  const taskProgress = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  useEffect(() => {
    if (project.id) {
      getProjectMilestones(project.id).then(setMilestones).catch(() => {});
    }
  }, [project.id]);

  const handleAddMilestone = async () => {
    if (!newMilestone.trim() || !project.id) return;
    await saveProjectMilestone(project.id, { title: newMilestone, status: 'pending', sortOrder: milestones.length });
    setNewMilestone('');
    const data = await getProjectMilestones(project.id);
    setMilestones(data);
  };

  const toggleMilestone = async (m: ProjectMilestone) => {
    if (!project.id) return;
    const newStatus = m.status === 'completed' ? 'pending' : 'completed';
    await saveProjectMilestone(project.id, { ...m, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined });
    const data = await getProjectMilestones(project.id);
    setMilestones(data);
  };

  const removeMilestone = async (mId: string) => {
    if (!project.id) return;
    await deleteProjectMilestone(project.id, mId);
    setMilestones(prev => prev.filter(m => m.id !== mId));
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="text-brand-500" /> {project.id ? 'Dashboard Dự án' : 'Thêm Dự án mới'}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg hover:shadow-md font-bold flex items-center gap-2 transition-all" disabled={!project.name || !project.projectCode}>
            <CheckCircle2 size={16} /> Lưu Dự án
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4 text-sm uppercase tracking-wider flex items-center gap-2"><AlignLeft size={16}/> Thông tin cơ bản</h3>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-600">Mã dự án *</label>
            <input value={project.projectCode || ''} onChange={e => onChange({...project, projectCode: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 bg-gray-50" placeholder="VD: DA-2026-01" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-600">Tên dự án *</label>
            <input value={project.name || ''} onChange={e => onChange({...project, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="Nhập tên dự án" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Mã TBMT</label>
              <input value={project.biddingCode || ''} onChange={e => onChange({...project, biddingCode: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Khách hàng</label>
              <input list="client-suggestions" value={project.clientName || ''} onChange={e => onChange({...project, clientName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
              <datalist id="client-suggestions">
                {Array.from(new Set([
                  ...contracts.map(c => c.clientName?.trim()),
                  ...projects.map(p => p.clientName?.trim())
                ].filter(Boolean))).sort().map(val => (
                  <option key={val as string} value={val as string} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Hình thức LCNT</label>
              <input list="procurement-suggestions" value={project.procurementMethod || ''} onChange={e => onChange({...project, procurementMethod: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
              <datalist id="procurement-suggestions">
                {Array.from(new Set(projects.map(p => p.procurementMethod?.trim()).filter(Boolean))).sort().map(val => (
                  <option key={val as string} value={val as string} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Ngày đấu thầu</label>
              <input type="date" value={project.biddingDate || ''} onChange={e => onChange({...project, biddingDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-600">Chủ đầu tư</label>
            <input list="investor-suggestions" value={project.investor || ''} onChange={e => onChange({...project, investor: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
            <datalist id="investor-suggestions">
              {Array.from(new Set([
                ...contracts.map(c => c.clientName?.trim()),
                ...projects.map(p => p.investor?.trim()),
                ...projects.map(p => p.clientName?.trim())
              ].filter(Boolean))).sort().map(val => (
                <option key={val as string} value={val as string} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{label:'Giá dự toán',key:'budget'},{label:'Giá dự thầu',key:'biddingPrice'},{label:'Giá trúng thầu',key:'winningPrice'}].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold mb-1 text-gray-600">{f.label} (VNĐ)</label>
                <input type="text" value={(project as any)[f.key] ? (project as any)[f.key].toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); onChange({...project, [f.key]: val ? Number(val) : 0}); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm font-bold text-gray-700" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Trạng thái</label>
              <select value={project.status || 'planning'} onChange={e => onChange({...project, status: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="planning">Kế hoạch</option><option value="in_progress">Đang triển khai</option><option value="on_hold">Tạm dừng</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Ưu tiên</label>
              <select value={project.priority || 'medium'} onChange={e => onChange({...project, priority: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="critical">Khẩn cấp</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Phòng ban</label>
              <select value={project.department || ''} onChange={e => onChange({...project, department: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="">-- Chọn --</option>
                {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Quản lý dự án</label>
              <select value={project.managerId || ''} onChange={e => onChange({...project, managerId: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="">-- Chọn --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Giai đoạn</label>
              <select value={project.phase || 'initiation'} onChange={e => onChange({...project, phase: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Ngày bắt đầu</label>
              <input type="date" value={project.startDate || ''} onChange={e => onChange({...project, startDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Ngày kết thúc</label>
              <input type="date" value={project.endDate || ''} onChange={e => onChange({...project, endDate: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-600">Ghi chú / Mô tả</label>
            <textarea value={project.description || ''} onChange={e => onChange({...project, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 min-h-[80px] text-sm" placeholder="Mô tả chi tiết dự án..." />
          </div>
        </div>

        {/* Right: Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {!project.id ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-8">
              <Target size={48} className="mb-4 text-gray-300" />
              <p className="font-medium text-center">Vui lòng lưu thông tin cơ bản trước khi quản lý Hợp đồng và Công việc.</p>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4 text-sm uppercase tracking-wider flex items-center gap-2"><PieChartIcon size={16}/> Tình hình Dự án</h3>
              
              {/* Phase indicator */}
              <div className="flex items-center gap-1 bg-gray-50 p-2 rounded-xl">
                {Object.entries(PHASE_LABELS).map(([k, v], i) => (
                  <div key={k} className={`flex-1 text-center py-2 rounded-lg text-[11px] font-bold transition-all ${project.phase === k ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-400'}`}>{v}</div>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1"><DollarSign size={14}/> Tài chính</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm items-center"><span className="text-gray-500 font-medium">Giá dự toán:</span><span className="font-bold text-gray-800">{budget.toLocaleString('vi-VN')} đ</span></div>
                    {(project.winningPrice || 0) > 0 && <div className="flex justify-between text-sm items-center"><span className="text-gray-500 font-medium">Giá trúng thầu:</span><span className="font-bold text-gray-800">{project.winningPrice?.toLocaleString('vi-VN')} đ</span></div>}
                    <div className="flex justify-between text-sm items-center pt-2 border-t border-indigo-100/50"><span className="text-gray-600 font-bold">Tổng HĐ đã ký:</span><span className={`font-black ${contractValue >= (project.winningPrice || budget) ? 'text-green-600' : 'text-indigo-700'}`}>{contractValue.toLocaleString('vi-VN')} đ</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                      {(() => { const target = project.winningPrice || budget; const percent = target ? Math.min(100, (contractValue / target) * 100) : 0; return <div className={`h-2 rounded-full transition-all duration-1000 ${contractValue >= target ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />; })()}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 size={14}/> Tiến độ Công việc</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div><span className="text-4xl font-black text-emerald-700">{taskProgress}%</span><p className="text-xs font-medium text-gray-500 mt-1">{completedTasks.length} / {projectTasks.length} công việc</p></div>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200" /><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * taskProgress) / 100} className="text-emerald-500 transition-all duration-1000 ease-out" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Flag size={16} className="text-amber-500" /> Cột mốc ({milestones.filter(m => m.status === 'completed').length}/{milestones.length})</h3>
                </div>
                <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-2 group">
                      <button onClick={() => toggleMilestone(m)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${m.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-brand-400'}`}>
                        {m.status === 'completed' && <CheckCircle2 size={12} />}
                      </button>
                      <span className={`flex-1 text-sm ${m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{m.title}</span>
                      {m.dueDate && <span className="text-[10px] text-gray-400">{new Date(m.dueDate).toLocaleDateString('vi-VN')}</span>}
                      <button onClick={() => removeMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMilestone()} placeholder="Thêm cột mốc..." className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                    <button onClick={handleAddMilestone} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"><Plus size={16} /></button>
                  </div>
                </div>
              </div>

              {/* Contracts & Tasks */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[280px]">
                  <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Briefcase size={16} className="text-brand-500" /> Hợp đồng ({projectContracts.length})</h3>
                    <select className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white shadow-sm font-medium" onChange={async (e) => { if (!e.target.value) return; const c = contracts.find((c: any) => c.id === e.target.value); if (c) { await saveContract({ ...c, projectId: project.id, _isNew: false }); e.target.value = ''; }}} defaultValue="">
                      <option value="" disabled>+ Liên kết HĐ</option>
                      {contracts.filter((c: any) => c.projectId !== project.id).map((c: any) => <option key={c.id} value={c.id}>{c.contractNumber}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {projectContracts.map((c: any) => (
                      <div key={c.id} className="flex flex-col p-3 border border-gray-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition-all bg-white group">
                        <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm text-gray-800">{c.contractNumber}</span><button onClick={async () => window.confirm('Gỡ hợp đồng này khỏi dự án?') && await saveContract({ ...c, projectId: '', _isNew: false })} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button></div>
                        <span className="text-xs text-gray-500 line-clamp-1 mb-2">{c.contractName}</span>
                        <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                          <span className="text-brand-600 font-bold text-xs">{(c.postTaxValue || 0).toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                    ))}
                    {projectContracts.length === 0 && <div className="h-full flex flex-col items-center justify-center py-8 text-gray-400"><Briefcase size={24} className="mb-2 opacity-50"/><p className="text-xs">Chưa có hợp đồng</p></div>}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[280px]">
                  <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><List size={16} className="text-brand-500" /> Công việc đang chạy</h3>
                    <a href="/tasks" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-lg transition-colors"><ExternalLink size={12}/> Xem tất cả</a>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {projectTasks.filter((t: any) => t.status !== 'Done').map((t: any) => (
                      <div key={t.id} className="flex flex-col justify-between p-3 border border-gray-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition-all bg-white">
                        <p className="font-bold text-sm text-gray-800 line-clamp-2 leading-snug">{t.title}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium bg-gray-50 px-2 py-1 rounded-md">{t.assignees?.length > 0 ? users.find(u => u.id === t.assignees[0])?.name?.split(' ').pop() : 'N/A'}</span>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md shadow-sm ${t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>{t.status}</span>
                        </div>
                      </div>
                    ))}
                    {projectTasks.filter((t: any) => t.status !== 'Done').length === 0 && <div className="h-full flex flex-col items-center justify-center py-8 text-gray-400"><CheckCircle2 size={24} className="mb-2 opacity-50"/><p className="text-xs">Không có việc đang chạy</p></div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
