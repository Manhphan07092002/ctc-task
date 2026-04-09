import React, { useMemo } from 'react';
import { CheckCircle2, ListTodo, Timer, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Task, TaskStatus, TaskPriority, User, Note } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, Card, Avatar } from '../../components/UI';
import { TaskListItem } from '../../components/TaskListItem';
import { StatCard } from '../../components/StatCard';

interface DashboardProps {
  roleBasedTasks: Task[];
  filteredTasks: Task[];
  filteredNotes: Note[];
  notes: Note[];
  users: User[];
  user: User;
  searchQuery: string;
  openCreateModal: (d?: string) => void;
  openEditModal: (t: Task) => void;
  handleStatusToggle: (t: Task) => void;
  handleDeleteTask: (id: string) => void;
  checkPermission: (action: 'edit' | 'delete', task: Task, user: User) => boolean;
}

export default function DashboardPage({
  roleBasedTasks, filteredTasks, filteredNotes, notes, users, user, searchQuery,
  openCreateModal, openEditModal, handleStatusToggle, handleDeleteTask, checkPermission
}: DashboardProps) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const total = roleBasedTasks.length;
    const done = roleBasedTasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = roleBasedTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const highPriority = roleBasedTasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE).length;

    return { total, done, inProgress, highPriority };
  }, [roleBasedTasks]);

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredTasks.filter(t => t.startDate === today);
  }, [filteredTasks]);

  const chartData = [
    { name: t('done'), value: stats.done, color: '#22c55e' },
    { name: t('inProgress'), value: stats.inProgress, color: '#3b82f6' },
    { name: 'Todo', value: stats.total - stats.done - stats.inProgress, color: '#94a3b8' },
  ];

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalTasks')} value={stats.total} icon={ListTodo} color="from-purple-500 to-purple-400" />
        <StatCard label={t('done')} value={stats.done} icon={CheckCircle2} color="from-success-500 to-success-400" />
        <StatCard label={t('inProgress')} value={stats.inProgress} icon={Timer} color="from-blue-500 to-blue-400" />
        <StatCard label={t('highPriority')} value={stats.highPriority} icon={Flame} color="from-brand-500 to-brand-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{t('todaysSchedule')}</h2>
          </div>

          <div className="space-y-3">
            {todaysTasks.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">
                  {searchQuery ? t('noMatchingTasks') : t('noTasksToday')}
                </p>
                {!searchQuery && (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => openCreateModal()}>
                    {t('addTask')}
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
                    showDepartment={user.role === 'Admin' || user.role === 'Manager'}
                    allUsers={users}
                  />
                );
              })
            )}
          </div>

          {/* Notes Preview */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{t('quickNotes')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.slice(0, 2).map((note: Note) => (
                <div key={note.id} className={`${note.color} p-4 rounded-xl border border-black/5 cursor-pointer hover:shadow-sm transition-all`}>
                  <h4 className="font-bold text-gray-800 mb-1">{note.title || 'Untitled Note'}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && !searchQuery && (
                <div className="col-span-2 bg-white p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500 cursor-pointer">
                  + {t('createNote')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">{t('weeklyProgress')}</h3>
            <div className="h-48 w-full relative">
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
            </div>
          </Card>

          {/* Team Widget */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">{t('team')}</h3>
            <div className="flex flex-col gap-3">
              {users.slice(0, 4).map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={u.avatar} alt={u.name} size={8} />
                    <span className="text-sm font-medium text-gray-700">{u.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{u.role}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
