import React, { useMemo, useState } from 'react';
import { Project } from '../../types';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Calendar } from 'lucide-react';

interface Props {
  projects: Project[];
  tasks: any[];
  searchQuery: string;
  filterStatus: string;
  onEdit: (p: Project) => void;
}

const MONTH_NAMES = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
const STATUS_COLORS: Record<string, string> = {
  planning: '#9CA3AF',
  in_progress: '#3B82F6',
  on_hold: '#F59E0B',
  completed: '#10B981',
  cancelled: '#EF4444',
};
const STATUS_BG: Record<string, string> = {
  planning: 'rgba(156,163,175,0.15)',
  in_progress: 'rgba(59,130,246,0.12)',
  on_hold: 'rgba(245,158,11,0.12)',
  completed: 'rgba(16,185,129,0.12)',
  cancelled: 'rgba(239,68,68,0.12)',
};

export const ProjectTimelineTab: React.FC<Props> = ({ projects, tasks, searchQuery, filterStatus, onEdit }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const filtered = useMemo(() => {
    let result = projects.filter(p => p.startDate || p.endDate);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q));
    }
    if (filterStatus) result = result.filter(p => p.status === filterStatus);
    return result.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [projects, searchQuery, filterStatus, viewYear]);

  // Generate month columns for the year
  const months = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(viewYear, i, 1);
    const end = new Date(viewYear, i + 1, 0);
    return { month: i, label: MONTH_NAMES[i], start, end, daysInMonth: end.getDate() };
  });

  const yearStart = new Date(viewYear, 0, 1).getTime();
  const yearEnd = new Date(viewYear, 11, 31).getTime();
  const yearDuration = yearEnd - yearStart;

  const todayOffset = Math.max(0, Math.min(100, ((today.getTime() - yearStart) / yearDuration) * 100));
  const isCurrentYear = today.getFullYear() === viewYear;

  const getBarStyle = (p: Project) => {
    const start = p.startDate ? new Date(p.startDate).getTime() : yearStart;
    const end = p.endDate ? new Date(p.endDate).getTime() : start + 90 * 86400000; // default 3 months
    const clampedStart = Math.max(start, yearStart);
    const clampedEnd = Math.min(end, yearEnd);
    
    if (clampedEnd < yearStart || clampedStart > yearEnd) return null; // outside view
    
    const left = ((clampedStart - yearStart) / yearDuration) * 100;
    const width = Math.max(1, ((clampedEnd - clampedStart) / yearDuration) * 100);
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getProgress = (p: Project) => {
    const pTasks = tasks.filter((t: any) => t.projectId === p.id);
    const pDone = pTasks.filter((t: any) => t.status === 'Done');
    return pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-brand-500" />
          <h3 className="font-bold text-gray-800 text-sm">Timeline Dự án</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{filtered.length} dự án</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
          <span className="px-4 py-1.5 font-bold text-gray-800 text-sm bg-gray-50 rounded-lg min-w-[80px] text-center">{viewYear}</span>
          <button onClick={() => setViewYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Month headers */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <div className="w-[260px] flex-shrink-0 px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Dự án
            </div>
            <div className="flex-1 flex relative">
              {months.map(m => (
                <div key={m.month} className="flex-1 text-center py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100 last:border-r-0">
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Project rows */}
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const barStyle = getBarStyle(p);
              const progress = getProgress(p);
              const color = STATUS_COLORS[p.status] || STATUS_COLORS.planning;
              const bgColor = STATUS_BG[p.status] || STATUS_BG.planning;
              const isOverdue = p.endDate && p.endDate < todayStr && p.status !== 'completed';
              const isNearDeadline = p.endDate && !isOverdue && p.endDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] && p.status !== 'completed';

              return (
                <div key={p.id} className="flex hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => onEdit(p)}>
                  {/* Left info */}
                  <div className="w-[260px] flex-shrink-0 px-4 py-3 border-r border-gray-100 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{p.projectCode}</span>
                        {isOverdue && <AlertTriangle size={12} className="text-red-500 animate-pulse flex-shrink-0" />}
                        {isNearDeadline && <Clock size={12} className="text-amber-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate leading-snug group-hover:text-brand-700 transition-colors">{p.name}</p>
                      {p.clientName && <p className="text-[10px] text-gray-400 truncate">{p.clientName}</p>}
                    </div>
                  </div>

                  {/* Timeline bar area */}
                  <div className="flex-1 relative py-3 px-1">
                    {/* Month grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map(m => (
                        <div key={m.month} className="flex-1 border-r border-gray-100 last:border-r-0" />
                      ))}
                    </div>

                    {/* Today line */}
                    {isCurrentYear && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 opacity-60" style={{ left: `${todayOffset}%` }}>
                        <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                      </div>
                    )}

                    {/* Project bar */}
                    {barStyle && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden transition-all duration-300 group-hover:h-8 group-hover:shadow-md z-[5]"
                        style={{ ...barStyle, backgroundColor: bgColor, border: `1.5px solid ${color}` }}
                        title={`${p.name}\n${p.startDate || '?'} → ${p.endDate || '?'}\nTiến độ: ${progress}%`}
                      >
                        {/* Progress fill */}
                        <div
                          className="h-full rounded-l-md transition-all duration-700"
                          style={{ width: `${progress}%`, backgroundColor: color, opacity: 0.4 }}
                        />
                        {/* Label */}
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-[10px] font-bold truncate" style={{ color }}>{progress}%</span>
                        </div>
                      </div>
                    )}

                    {!barStyle && (
                      <div className="h-7 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 italic">Ngoài phạm vi hiển thị</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-6 py-16 text-center text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">Chưa có dự án nào có ngày bắt đầu/kết thúc</p>
                <p className="text-xs mt-1">Hãy cập nhật ngày cho dự án để hiển thị trên timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
