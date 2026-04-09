import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { TaskListItem } from './components/TaskListItem';

import {
  PlusCircle,
  CheckCircle2,
  Clock,
  Trash2,
  CheckSquare,
  Shield,
  Filter,
  Lock,
  Edit,
  Wand2,
  Sparkles
} from 'lucide-react';

import { Task, TaskStatus, TaskPriority, Note, RecurrenceType, User } from './types';
import { NAV_ITEMS, PRIORITY_COLORS } from './constants';
import { Button, Card, Avatar } from './components/UI';
import { CalendarView } from './components/CalendarView';
import { TaskModal } from './components/TaskModal';
import { NoteModal } from './components/NoteModal';
import { UserModal } from './components/UserModal';
import { SettingsView } from './components/SettingsView';
import { InviteModal } from './components/InviteModal';
import { TaskSuggestionModal } from './components/TaskSuggestionModal';
import { MeetingView } from './components/MeetingView';
import { MeetingModal } from './components/MeetingModal';
import { MeetingRoom } from './components/MeetingRoom';
import { JoinMeetingPage } from './pages/JoinMeetingPage';
import { AIAssistant, AIAssistantHandle } from './components/AIAssistant';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import { Meeting } from './types';
import { LoginView } from './components/LoginView';
import { ConfirmDialog } from './components/ConfirmDialog';

const getNextDate = (dateStr: string, type: RecurrenceType): string => {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (type === RecurrenceType.DAILY) d.setUTCDate(d.getUTCDate() + 1);
  if (type === RecurrenceType.WEEKLY) d.setUTCDate(d.getUTCDate() + 7);
  if (type === RecurrenceType.MONTHLY) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().split('T')[0];
};

export default function CTCTaskApp() {
  const { t } = useLanguage();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { tasks, notes, users, isLoading: isDataLoading, saveTask, deleteTask, saveNote, deleteNote, saveUser, deleteUser } = useData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Modals Data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<string>('');
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [notification, setNotification] = useState({ visible: false, title: '', message: '', type: 'info' as any });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as any
  });

  const aiAssistantRef = useRef<AIAssistantHandle>(null);

  const checkPermission = (action: 'edit' | 'delete', task: Task, currentUser: User) => {
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Manager') return task.department === currentUser.department;
    if (currentUser.role === 'Employee') return task.createdBy === currentUser.id;
    return false;
  };

  const roleBasedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(t => {
      if (user.role === 'Admin') return true;
      if (t.assignees.includes(user.id)) return true;
      if (user.role === 'Manager' && t.department === user.department) return true;
      if (user.role === 'Employee' && t.createdBy === user.id) return true;
      return false;
    });
  }, [tasks, user]);

  const rawTodaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return roleBasedTasks.filter(t => t.startDate === today);
  }, [roleBasedTasks]);

  useEffect(() => {
    const checkPendingTasks = () => {
      const pendingCount = rawTodaysTasks.filter(t => t.status !== TaskStatus.DONE).length;
      if (pendingCount > 0) {
        setNotification({
          visible: true, title: "Reminder: Pending Tasks ⏰",
          message: `You have \${pendingCount} unfinished tasks for today.`, type: 'warning'
        });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 10000);
      }
    };
    const intervalId = setInterval(checkPendingTasks, 300000);
    return () => clearInterval(intervalId);
  }, [rawTodaysTasks]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    roleBasedTasks.forEach(task => task.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [roleBasedTasks]);

  const filteredTasks = useMemo(() => {
    let result = roleBasedTasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q)));
    }
    if (selectedTags.length > 0) {
      result = result.filter(t => t.tags && t.tags.some(tag => selectedTags.includes(tag)));
    }
    return result;
  }, [roleBasedTasks, searchQuery, selectedTags]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const handleSaveTask = async (task: Task) => {
    const isNew = !tasks.find(t => t.id === task.id);
    if (!isNew && !checkPermission('edit', task, user!)) {
      setNotification({ visible: true, title: 'Error', message: 'No permission to edit this task.', type: 'warning' });
      return;
    }
    await saveTask(task);
  };

  const handleAddMultipleTasks = async (newTasks: Task[]) => {
    const existingIds = new Set(tasks.map(t => t.id));
    const tasksToAdd = newTasks.filter(t => !existingIds.has(t.id));
    for (const t of tasksToAdd) {
      await saveTask(t);
    }
    setNotification({ visible: true, title: 'Success', message: `Added \${tasksToAdd.length} tasks.`, type: 'info' });
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    if (!checkPermission('delete', taskToDelete, user!)) {
      setNotification({ visible: true, title: t('permissionDenied') || 'Permission Denied', message: t('noPermissionDeleteTask') || 'No permission.', type: 'warning' });
      return;
    }
    setConfirmDialog({
      isOpen: true, title: t('confirmDelete'), message: t('confirmDeleteTask'), type: 'danger',
      onConfirm: async () => {
        await deleteTask(taskId);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleStatusToggle = async (task: Task) => {
    const canEdit = checkPermission('edit', task, user!);
    const isAssignee = task.assignees.includes(user!.id);
    if (!canEdit && !isAssignee) {
      setNotification({ visible: true, title: 'Permission Denied', message: 'You cannot update this task status.', type: 'warning' });
      return;
    }
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    const updatedTask = { ...task, status: newStatus };
    await saveTask(updatedTask);

    if (newStatus === TaskStatus.DONE && task.recurrence && task.recurrence !== RecurrenceType.NONE) {
      const nextDate = getNextDate(task.startDate, task.recurrence);
      // Wait for tasks update to refresh before checking, we do quick check
      const exists = tasks.some(t => t.title === task.title && t.startDate === nextDate && t.status === TaskStatus.TODO);
      if (!exists) {
        const newTask: Task = { ...task, id: Math.random().toString(36).substr(2, 9), startDate: nextDate, status: TaskStatus.TODO, subtasks: task.subtasks?.map(st => ({ ...st, isCompleted: false })), comments: [] };
        await saveTask(newTask);
      }
    }
  };

  const openCreateModal = (date?: string) => { setEditingTask(null); setSelectedDateForCreate(date || new Date().toISOString().split('T')[0]); setIsModalOpen(true); };
  const openEditModal = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };
  const toggleTagFilter = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSaveNote = async (note: Note) => await saveNote(note);
  const handleDeleteNote = async (noteId: string) => await deleteNote(noteId);
  const openCreateNoteModal = () => { setEditingNote(null); setIsNoteModalOpen(true); };
  const openEditNoteModal = (note: Note) => { setEditingNote(note); setIsNoteModalOpen(true); };

  const handleSaveUser = async (u: User) => await saveUser(u);
  const handleDeleteUser = (userId: string) => {
    if (userId === user?.id) { setNotification({ visible: true, title: t('error'), message: t('cannotDeleteSelf'), type: 'warning' }); return; }
    setConfirmDialog({ isOpen: true, title: t('confirmDelete'), message: t('confirmDeleteUser'), type: 'danger', onConfirm: async () => { await deleteUser(userId); setConfirmDialog(prev => ({ ...prev, isOpen: false })); }});
  };
  const openCreateUserModal = () => { setEditingUser(null); setIsUserModalOpen(true); };
  const openEditUserModal = (u: User) => { setEditingUser(u); setIsUserModalOpen(true); };

  if (isAuthLoading || isDataLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-brand-500"><Sparkles className="animate-spin mr-2" /> Loading...</div>;
  }
  if (!user) return <LoginView />;

  return (
    <div className="flex h-screen bg-transparent text-gray-800 overflow-hidden font-sans selection:bg-brand-200">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} openCreateModal={openCreateModal} />

      <main className="flex-1 flex flex-col min-w-0 h-full relative lg:pl-80 transition-all duration-300">
        <TopHeader
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notification={notification}
          setNotification={setNotification}
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Routes>
              <Route path="/" element={
                 <DashboardPage
                 roleBasedTasks={roleBasedTasks} filteredTasks={filteredTasks} filteredNotes={filteredNotes} 
                 notes={notes} users={users} user={user} searchQuery={searchQuery} 
                 openCreateModal={openCreateModal} openEditModal={openEditModal} 
                 handleStatusToggle={handleStatusToggle} handleDeleteTask={handleDeleteTask} 
                 checkPermission={checkPermission}
               />
              } />
              
              <Route path="/tasks" element={
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
                      <button key={tag} onClick={() => toggleTagFilter(tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all border \${selectedTags.includes(tag) ? 'bg-brand-500 text-white border-brand-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'}`}>{tag}</button>
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
                      <TaskListItem key={task.id} task={task} onClick={() => openEditModal(task)} onCheck={() => handleStatusToggle(task)} onDelete={checkPermission('delete', task, user) ? () => handleDeleteTask(task.id) : undefined} canToggle={checkPermission('edit', task, user) || task.assignees.includes(user.id)} isReadOnly={!checkPermission('edit', task, user)} showDepartment={user.role === 'Admin' || user.role === 'Manager'} allUsers={users} />
                    ))}
                  </div>
                </Card>
              </div>
              } />

              <Route path="/calendar" element={
                <div className="h-[calc(100vh-8rem)]">
                  <CalendarView tasks={roleBasedTasks} onDateClick={(date) => openCreateModal(date)} onTaskClick={(task) => openEditModal(task)} />
                </div>
              } />

               {/* Notes View inside routes */}
              <Route path="/notes" element={
                <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">{t('notes')}</h2>
                  <Button onClick={openCreateNoteModal}><PlusCircle size={18} className="mr-2" /> {t('addNote')}</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredNotes.map(note => (
                    <div key={note.id} onClick={() => openEditNoteModal(note)} className={`\${note.color} p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative group border border-black/5 flex flex-col h-64`}>
                      <h3 className="font-bold text-gray-900 text-lg mb-3 pr-6 line-clamp-1">{note.title || 'Untitled'}</h3>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-grow overflow-hidden mask-image-b">{note.content}</p>
                      <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center text-xs text-gray-500"><span>{new Date(note.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  ))}
                  <button onClick={openCreateNoteModal} className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-300 hover:bg-brand-50 transition-all h-64"><PlusCircle size={40} className="mb-2 opacity-50" /><span className="font-medium">{t('createNote')}</span></button>
                </div>
              </div>
              } />

              <Route path="/team" element={
                user.role !== 'Employee' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div><h2 className="text-xl font-bold text-gray-800">{t('teamMembers')}</h2><p className="text-gray-500 text-sm mt-1">Manage your team and permissions</p></div>
                      {user.role === 'Admin' && <Button onClick={() => openCreateUserModal()}><PlusCircle size={18} className="mr-2" /> Add Member</Button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {users.filter(u => user.role === 'Admin' ? true : u.department === user.department).map(u => (
                        <Card key={u.id} className="p-6 flex items-center gap-4 relative group">
                          <Avatar src={u.avatar} alt={u.name} size={16} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-lg truncate">{u.name}</h4><p className="text-gray-500 text-sm mb-2">{u.department} • {u.email}</p>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium \${u.role === 'Admin' ? 'bg-brand-100 text-brand-700' : u.role === 'Manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{u.role === 'Admin' && <Shield size={10} />}{u.role}</span>
                          </div>
                          {user.role === 'Admin' && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg p-1">
                              <button onClick={() => openEditUserModal(u)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md hover:text-blue-600"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-gray-500 hover:bg-red-50 rounded-md hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : <Navigate to="/" replace />
              } />

              <Route path="/meetings" element={<MeetingView allUsers={users} onJoinMeeting={setActiveMeeting} onCreateMeeting={() => setIsMeetingModalOpen(true)} />} />
              <Route path="/meetings/join/:meetingId" element={<JoinMeetingPage onJoinMeeting={setActiveMeeting} />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </main>

      <AIAssistant ref={aiAssistantRef} />
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} initialTask={editingTask} initialDate={selectedDateForCreate} user={user} readOnly={editingTask ? !checkPermission('edit', editingTask, user!) : false} allUsers={users} />
      <TaskSuggestionModal isOpen={isSuggestionModalOpen} onClose={() => setIsSuggestionModalOpen(false)} onAddTasks={handleAddMultipleTasks} currentUser={user} />
      <NoteModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} onSave={handleSaveNote} onDelete={handleDeleteNote} initialNote={editingNote} />
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} initialUser={editingUser} />
      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      {activeMeeting && <MeetingRoom meeting={activeMeeting} onLeave={() => setActiveMeeting(null)} allUsers={users} />}
      <MeetingModal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} allUsers={users} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} type={confirmDialog.type} confirmText={t('delete')} cancelText={t('cancel')} />
    </div>
  );
}
