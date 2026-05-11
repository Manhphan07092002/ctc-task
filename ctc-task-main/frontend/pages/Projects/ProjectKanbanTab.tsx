import React from 'react';
import { Project } from '../../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle2, DollarSign, Briefcase, User as UserIcon, AlertTriangle, Clock, Flag } from 'lucide-react';

interface Props {
  projects: Project[];
  contracts: any[];
  tasks: any[];
  searchQuery: string;
  filterStatus: string;
  onEdit: (p: Project) => void;
  onDragEnd: (result: DropResult) => void;
}

const COLUMNS = [
  { id: 'planning', title: 'Kế hoạch', color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-50/80', borderColor: 'border-gray-200', icon: '📋' },
  { id: 'in_progress', title: 'Đang chạy', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50/50', borderColor: 'border-blue-200', icon: '🚀' },
  { id: 'on_hold', title: 'Tạm dừng', color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-200', icon: '⏸️' },
  { id: 'completed', title: 'Hoàn thành', color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50/50', borderColor: 'border-emerald-200', icon: '✅' },
];

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-400',
  low: 'bg-gray-300',
};

export const ProjectKanbanTab: React.FC<Props> = ({ projects, contracts, tasks, searchQuery, filterStatus, onEdit, onDragEnd }) => {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const filtered = (() => {
    let result = projects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q));
    }
    if (filterStatus) result = result.filter(p => p.status === filterStatus);
    return result;
  })();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
        {COLUMNS.map(col => {
          const colProjects = filtered.filter(p => p.status === col.id);
          return (
            <div key={col.id} className={`flex flex-col flex-shrink-0 w-[310px] ${col.bgColor} rounded-2xl border ${col.borderColor} overflow-hidden shadow-sm`}>
              {/* Column header */}
              <div className={`px-4 py-3 border-b ${col.borderColor} flex justify-between items-center bg-white`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.icon}</span>
                  <h3 className="font-bold text-sm text-gray-800">{col.title}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${col.color} text-white shadow-sm`}>
                  {colProjects.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2.5 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-brand-50/60' : ''}`}
                  >
                    {colProjects.map((p, index) => {
                      const pTasks = tasks.filter((t: any) => t.projectId === p.id);
                      const pDone = pTasks.filter((t: any) => t.status === 'Done');
                      const progress = pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;
                      const pContracts = contracts.filter((c: any) => c.projectId === p.id && c.status !== 'cancelled');
                      const isOverdue = p.endDate && p.endDate < today && p.status !== 'completed';
                      const isNearDeadline = p.endDate && !isOverdue && p.endDate <= sevenDaysLater && p.status !== 'completed';
                      const priorityDot = PRIORITY_DOT[p.priority || 'medium'] || PRIORITY_DOT.medium;

                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2.5 bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                                snapshot.isDragging
                                  ? 'shadow-xl border-brand-300 ring-2 ring-brand-100 scale-[1.02] rotate-1'
                                  : `shadow-sm border-gray-200 hover:border-brand-200 hover:shadow-md ${isOverdue ? 'border-l-[3px] border-l-red-500' : isNearDeadline ? 'border-l-[3px] border-l-amber-400' : ''}`
                              }`}
                              onClick={() => onEdit(p)}
                            >
                              {/* Top row */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${priorityDot} flex-shrink-0`} title={`Ưu tiên: ${p.priority || 'medium'}`} />
                                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{p.projectCode}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {isOverdue && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                  {isNearDeadline && <Clock size={14} className="text-amber-500" />}
                                  {progress === 100 && <CheckCircle2 size={14} className="text-emerald-500" />}
                                </div>
                              </div>

                              {/* Name */}
                              <h4 className="font-bold text-gray-800 text-sm mb-1 leading-snug line-clamp-2">{p.name}</h4>
                              {p.clientName && (
                                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><UserIcon size={11} />{p.clientName}</p>
                              )}

                              {/* Progress */}
                              {pTasks.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                    <span>Tiến độ ({pDone.length}/{pTasks.length})</span>
                                    <span className={progress >= 80 ? 'text-emerald-600' : ''}>{progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-gray-400'}`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Deadline */}
                              {p.endDate && (
                                <div className={`text-[10px] font-medium mb-2 ${isOverdue ? 'text-red-600' : isNearDeadline ? 'text-amber-600' : 'text-gray-400'}`}>
                                  <Clock size={10} className="inline mr-1" />
                                  {isOverdue ? 'Quá hạn ' : ''}
                                  {new Date(p.endDate).toLocaleDateString('vi-VN')}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-600 flex items-center gap-1" title="Ngân sách">
                                  <DollarSign size={13} className="text-blue-500" /> {((p.winningPrice || p.budget || 0) / 1000000).toFixed(0)}M
                                </span>
                                <div className="flex items-center gap-2">
                                  {pContracts.length > 0 && (
                                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded" title="Số hợp đồng">
                                      <Briefcase size={11} className="text-indigo-400" /> {pContracts.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colProjects.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                        <div className="text-3xl mb-2 opacity-50">{col.icon}</div>
                        <p className="text-xs font-medium">Chưa có dự án</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
