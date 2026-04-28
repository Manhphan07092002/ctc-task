import React, { useState, useMemo } from 'react';
import { Button } from '../../components/UI';
import { TaskListItem } from '../../components/TaskListItem';
import { Wand2, Sparkles, PlusCircle, LayoutList, LayoutGrid, Clock, CheckCircle2, Flame } from 'lucide-react';
import { Task, User, TaskStatus, TaskPriority } from '../../types';
import { AIAssistantHandle } from '../../components/AIAssistant';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
  handleSaveTask: (task: Task) => Promise<void>;
}

export default function TasksPage({
  t, rawTodaysTasks, filteredTasks, allTags, selectedTags, toggleTagFilter, setSelectedTags,
  searchQuery, openCreateModal, openEditModal, handleStatusToggle, handleDeleteTask,
  checkPermission, user, users, aiAssistantRef, setIsSuggestionModalOpen, handleSaveTask
}: TasksPageProps) {
  
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = filteredTasks.find(t => t.id === draggableId);
    if (!task) return;

    // Permissions check
    const canEdit = checkPermission('edit', task, user);
    const isAssignee = task.assignees.includes(user.id);
    if (!canEdit && !isAssignee) {
      alert("You do not have permission to edit this task's status.");
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const updatedTask = { ...task, status: newStatus };
    await handleSaveTask(updatedTask);
  };

  const columns = useMemo(() => {
    return {
      [TaskStatus.TODO]: filteredTasks.filter(t => t.status === TaskStatus.TODO),
      [TaskStatus.IN_PROGRESS]: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
      [TaskStatus.DONE]: filteredTasks.filter(t => t.status === TaskStatus.DONE),
    };
  }, [filteredTasks]);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'text-red-500 bg-red-50';
      case TaskPriority.MEDIUM: return 'text-amber-500 bg-amber-50';
      case TaskPriority.LOW: return 'text-emerald-500 bg-emerald-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('tasks')}</h2>
          <p className="text-gray-500 text-sm mt-1">Quản lý và theo dõi công việc của bạn</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all \${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="List View"
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all \${viewMode === 'board' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Board View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          
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

      {/* Filter Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-sm text-gray-500 font-medium px-2">Lọc theo Tags:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all \${selectedTags.includes(tag) ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              #{tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="text-xs text-red-500 hover:text-red-700 px-2 underline">
              Xóa lọc
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {viewMode === 'list' ? (
          /* List View */
          <div className="h-full overflow-y-auto pr-2 pb-4 space-y-3 custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                  <LayoutList size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Không tìm thấy công việc nào</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchQuery || selectedTags.length > 0 ? t('noMatchingTasks') : "Bạn chưa có công việc nào. Nhấn Thêm mới để bắt đầu!"}
                </p>
              </div>
            ) : (
              filteredTasks.map(task => {
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
        ) : (
          /* Kanban Board View */
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="h-full flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              
              {/* Column Helper Function */}
              {([
                { id: TaskStatus.TODO, title: 'Cần làm', icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> },
                { id: TaskStatus.IN_PROGRESS, title: 'Đang làm', icon: <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> },
                { id: TaskStatus.DONE, title: 'Hoàn thành', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> }
              ] as const).map(column => (
                <div key={column.id} className="flex flex-col min-w-[320px] w-[320px] max-w-[320px] bg-gray-50/80 rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
                  
                  {/* Column Header */}
                  <div className="p-4 bg-white/50 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      {column.icon}
                      <h3 className="font-bold text-gray-700">{column.title}</h3>
                    </div>
                    <span className="text-xs font-bold bg-white text-gray-500 px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
                      {columns[column.id].length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar transition-colors \${snapshot.isDraggingOver ? 'bg-brand-50/50' : ''}`}
                      >
                        {columns[column.id].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEditModal(task)}
                                className={`bg-white p-4 rounded-xl border transition-all ${
                                  snapshot.isDragging ? 'shadow-xl border-brand-300 scale-[1.02]' : 'shadow-sm border-gray-100 hover:border-brand-200 hover:shadow-md'
                                }`}
                                style={{ ...provided.draggableProps.style }}
                              >
                                <div className="flex items-start justify-between mb-2 gap-2">
                                  <h4 className="font-semibold text-sm text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
                                  {task.status === TaskStatus.DONE && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                                )}

                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {task.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                    {task.tags.length > 3 && <span className="text-[10px] text-gray-400">+{task.tags.length - 3}</span>}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                  {/* Assignees Avatars */}
                                  <div className="flex -space-x-2">
                                    {task.assignees.slice(0, 3).map(assigneeId => {
                                      const u = users.find(user => user.id === assigneeId);
                                      return u ? (
                                        <img key={u.id} src={u.avatar} alt={u.name} title={u.name} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                                      ) : null;
                                    })}
                                    {task.assignees.length > 3 && (
                                      <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                                        +{task.assignees.length - 3}
                                      </div>
                                    )}
                                  </div>

                                  {/* Priority Badge */}
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold \${getPriorityColor(task.priority)}`}>
                                    {task.priority === TaskPriority.HIGH && <Flame size={12} />}
                                    {task.priority}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty state for column */}
                        {columns[column.id].length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium">
                            Kéo thả vào đây
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}

            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
