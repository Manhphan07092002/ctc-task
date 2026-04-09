import React from 'react';
import { Button, Card } from '../../components/UI';
import { TaskListItem } from '../../components/TaskListItem';
import { Wand2, Sparkles, PlusCircle, Filter } from 'lucide-react';
import { Task, User } from '../../types';
import { AIAssistantHandle } from '../../components/AIAssistant';

interface TasksPageProps {
  t: (key: string) => string;
  rawTodaysTasks: Task[];
  filteredTasks: Task[];
  allTags: string[];
  selectedTags: string[];
  toggleTagFilter: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  searchQuery: string;
  openCreateModal: (date?: string) => void;
  openEditModal: (task: Task) => void;
  handleStatusToggle: (task: Task) => void;
  handleDeleteTask: (taskId: string) => void;
  checkPermission: (action: 'edit'|'delete', task: Task, u: User) => boolean;
  user: User;
  users: User[];
  aiAssistantRef: React.RefObject<AIAssistantHandle | null>;
  setIsSuggestionModalOpen: (val: boolean) => void;
}

export default function TasksPage({
  t, rawTodaysTasks, filteredTasks, allTags, selectedTags, toggleTagFilter, setSelectedTags,
  searchQuery, openCreateModal, openEditModal, handleStatusToggle, handleDeleteTask,
  checkPermission, user, users, aiAssistantRef, setIsSuggestionModalOpen
}: TasksPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('tasks')}</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your complete task list</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-brand-600 border-brand-200 hover:bg-brand-50" onClick={() => setIsSuggestionModalOpen(true)}>
            <Wand2 size={18} className="mr-2" /> AI Plan
          </Button>
          <Button variant="secondary" onClick={() => aiAssistantRef.current?.summarizeTasks(rawTodaysTasks)}>
            <Sparkles size={18} className="mr-2" /> {t('aiSummary')}
          </Button>
          <Button onClick={() => openCreateModal()}>
            <PlusCircle size={18} className="mr-2" /> {t('addTask')}
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500 mr-2"><Filter size={14} /><span>{t('filter')}</span></div>
          {allTags.map(tag => (
            <button key={tag} onClick={() => toggleTagFilter(tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedTags.includes(tag) ? 'bg-brand-500 text-white border-brand-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'}`}>{tag}</button>
          ))}
          {selectedTags.length > 0 && <button onClick={() => setSelectedTags([])} className="text-xs text-gray-400 hover:text-gray-600 ml-2">{t('clear')}</button>}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex-1">{t('taskDetails')}</div><div className="w-32 text-center">{t('priority')}</div><div className="w-32 text-center">{t('status')}</div><div className="w-10"></div>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{searchQuery || selectedTags.length > 0 ? t('noMatchingTasks') : t('noTasksToday')}</div>
          ) : filteredTasks.map(task => (
            <TaskListItem 
              key={task.id} 
              task={task} 
              onClick={() => openEditModal(task)} 
              onCheck={() => handleStatusToggle(task)} 
              onDelete={checkPermission('delete', task, user) ? () => handleDeleteTask(task.id) : undefined} 
              canToggle={checkPermission('edit', task, user) || task.assignees.includes(user.id)} 
              isReadOnly={!checkPermission('edit', task, user)} 
              showDepartment={user.role === 'Admin' || user.role === 'Manager'} 
              allUsers={users} 
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
