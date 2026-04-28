import React, { useMemo, useState, useEffect } from 'react';
import { 
  CheckCircle2, ListTodo, Timer, Flame, FileText, Video, 
  Sun, Sunset, Moon, Plus, Clock, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, User, Note, Report, Meeting } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, Card, Avatar } from '../../components/UI';
import { TaskListItem } from '../../components/TaskListItem';
import { StatCard } from '../../components/StatCard';
import { subscribeToMeetings } from '../../services/meetingService';

interface DashboardProps {
  roleBasedTasks: Task[];
  filteredTasks: Task[];
  filteredNotes: Note[];
  notes: Note[];
  users: User[];
  user: User;
  reports: Report[];
  searchQuery: string;
  openCreateModal: (d?: string) => void;
  openEditModal: (t: Task) => void;
  handleStatusToggle: (t: Task) => void;
  handleDeleteTask: (id: string) => void;
  checkPermission: (action: 'edit' | 'delete', task: Task, user: User) => boolean;
}

export default function DashboardPage({
  roleBasedTasks, filteredTasks, filteredNotes, notes, users, user, reports = [], searchQuery,
  openCreateModal, openEditModal, handleStatusToggle, handleDeleteTask, checkPermission
}: DashboardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMeetings(setMeetings);
    return () => unsubscribe();
  }, []);

  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { label: 'Chào buổi sáng', icon: Sun, color: 'text-amber-500' };
    if (hour < 18) return { label: 'Chào buổi chiều', icon: Sunset, color: 'text-orange-500' };
    return { label: 'Chào buổi tối', icon: Moon, color: 'text-indigo-500' };
  }, []);

  const todayUpcomingMeetings = useMemo(() => {
    const today = new Date();
    return meetings.filter(m => {
      const date = new Date(m.startTime);
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() && date.getTime() >= today.getTime();
    }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [meetings]);

  const stats = useMemo(() => {
    const total = roleBasedTasks.length;
    const done = roleBasedTasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = roleBasedTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    
    let pendingReports = 0;
    if (user.permissions?.includes('approve_dept_reports') || user.permissions?.includes('director_feedback')) {
      // Manager or Director looking for reports to approve/feedback
      pendingReports = reports.filter(r => r.status === 'Pending').length;
    } else {
      // Employee looking at their own pending reports
      pendingReports = reports.filter(r => r.authorId === user.id && r.status === 'Pending').length;
    }

    return { total, done, inProgress, pendingReports, upcomingMeetings: todayUpcomingMeetings.length };
  }, [roleBasedTasks, reports, user, todayUpcomingMeetings]);

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredTasks.filter(t => t.startDate === today);
  }, [filteredTasks]);

  const recentReports = useMemo(() => {
    const isManagerOrDirector = user.permissions?.includes('approve_dept_reports') || user.permissions?.includes('director_feedback');
    let relevantReports = reports;
    if (!isManagerOrDirector) {
      relevantReports = reports.filter(r => r.authorId === user.id);
    }
    // Sort by created/submitted desc
    return relevantReports
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [reports, user]);

  const chartData = [
    { name: t('done'), value: stats.done, color: '#22c55e' },
    { name: t('inProgress'), value: stats.inProgress, color: '#3b82f6' },
    { name: 'Todo', value: Math.max(0, stats.total - stats.done - stats.inProgress), color: '#94a3b8' },
  ];

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReportStatusBadge = (status: string) => {
    switch(status) {
      case 'Pending': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">Chờ duyệt</span>;
      case 'Approved': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Đã duyệt</span>;
      case 'Rejected': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">Từ chối</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">Nháp</span>;
    }
  };

  return (
    <>
      {/* Header Banner */}
      <div className="mb-6 flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} alt={user.name} size={12} className="ring-4 ring-gray-50" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <timeOfDay.icon size={18} className={timeOfDay.color} />
              <h1 className="text-xl font-bold text-gray-800">{timeOfDay.label}, {user.name}!</h1>
            </div>
            <p className="text-sm text-gray-500">
              Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('totalTasks')} value={stats.total} icon={ListTodo} color="from-purple-500 to-purple-400" />
        <StatCard label={t('done')} value={stats.done} icon={CheckCircle2} color="from-success-500 to-success-400" />
        <StatCard label="Báo cáo chờ duyệt" value={stats.pendingReports} icon={FileText} color="from-amber-500 to-amber-400" />
        <StatCard label="Cuộc họp hôm nay" value={stats.upcomingMeetings} icon={Video} color="from-brand-500 to-brand-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Today's Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ListTodo size={20} className="text-purple-500" />
                {t('todaysSchedule')}
              </h2>
              <button onClick={() => navigate('/tasks')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Xem tất cả <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {todaysTasks.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-3">
                    {searchQuery ? t('noMatchingTasks') : t('noTasksToday')}
                  </p>
                  {!searchQuery && (
                    <Button variant="secondary" size="sm" onClick={() => openCreateModal()}>
                      <Plus size={16} className="mr-1" /> {t('addTask')}
                    </Button>
                  )}
                </div>
              ) : (
                todaysTasks.map(task => {
                  const canEdit = checkPermission('edit', task, user);
                  const canDelete = checkPermission('delete', task, user);
                  const isAssignee = task.assignees.includes(user.id);
                  return (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onClick={() => openEditModal(task)}
                      onCheck={() => handleStatusToggle(task)}
                      onDelete={canDelete ? () => handleDeleteTask(task.id) : undefined}
                      canToggle={canEdit || isAssignee}
                      isReadOnly={!canEdit}
                      showDepartment={!!(user.permissions?.includes('view_all_tasks') || user.permissions?.includes('manage_dept_tasks'))}
                      allUsers={users}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Recent Reports */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-amber-500" />
                Hoạt động Báo cáo gần đây
              </h2>
              <button onClick={() => navigate('/reports')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Quản lý Báo cáo <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentReports.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">Chưa có báo cáo nào gần đây</p>
                </div>
              ) : (
                recentReports.map(report => {
                  const author = users.find(u => u.id === report.authorId);
                  return (
                    <div key={report.id} onClick={() => navigate('/reports')} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {author && <Avatar src={author.avatar} alt={author.name} size={6} />}
                          <div>
                            <p className="text-sm font-bold text-gray-800">{author?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{report.department}</p>
                          </div>
                        </div>
                        {getReportStatusBadge(report.status)}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-700 truncate mb-1">{report.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12} /> {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Notes Preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-emerald-500" />
                {t('quickNotes')}
              </h2>
              <button onClick={() => navigate('/notes')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Ghi chú <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.slice(0, 3).map((note: Note) => (
                <div key={note.id} onClick={() => navigate('/notes')} className={`\${note.color} p-4 rounded-xl border border-black/5 cursor-pointer hover:shadow-md transition-all h-32 flex flex-col`}>
                  <h4 className="font-bold text-gray-800 mb-2 truncate">{note.title || 'Untitled Note'}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3 flex-1">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && !searchQuery && (
                <div onClick={() => navigate('/notes')} className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Plus size={20} className="mx-auto mb-2 text-gray-400" />
                  {t('createNote')}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Side Column */}
        <div className="space-y-6">
          
          {/* Upcoming Meetings Widget */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Video size={18} className="text-brand-500" /> Lịch họp hôm nay
              </h3>
            </div>
            <div className="space-y-3">
              {todayUpcomingMeetings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Không có cuộc họp nào sắp tới trong hôm nay.</p>
              ) : (
                todayUpcomingMeetings.slice(0, 3).map(meeting => (
                  <div key={meeting.id} className="p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-start gap-3">
                    <div className="mt-0.5 bg-white p-2 rounded-lg text-brand-600 shadow-sm">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-800 truncate mb-0.5">{meeting.title}</h4>
                      <p className="text-xs text-brand-600 font-medium mb-2">
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </p>
                      <Button size="sm" onClick={() => navigate('/meetings')} className="w-full text-xs h-7 shadow-none">
                        Vào phòng họp
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Weekly Progress */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">{t('weeklyProgress')}</h3>
            <div className="h-48 w-full relative">
              {stats.total === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Chưa có công việc nào
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-\${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-gray-800">{Math.round((stats.done / (stats.total || 1)) * 100)}%</span>
                    <span className="text-xs text-gray-400">{t('done')}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Team Widget */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">{t('team')}</h3>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">{users.length} thành viên</span>
            </div>
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {(() => {
                const deptMap = new Map<string, typeof users>();
                users.forEach(u => {
                  if (!deptMap.has(u.department)) deptMap.set(u.department, []);
                  deptMap.get(u.department)!.push(u);
                });
                return Array.from(deptMap.entries()).map(([dept, deptUsers]) => (
                  <div key={dept}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                      {dept}
                    </p>
                    <div className="flex flex-col gap-2">
                      {deptUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.avatar} alt={u.name} size={7} />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-brand-600 transition-colors">{u.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={u.role}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
