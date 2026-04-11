import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';

import DashboardPage from './pages/Dashboard/index';
import TasksPage from './pages/Tasks/index';
import NotesPage from './pages/Notes/index';
import TeamPage from './pages/Team/index';
import { CalendarView as CalendarPage } from './pages/Calendar/index';
import { MeetingView as MeetingsPage } from './pages/Meetings/index';
import { JoinMeetingPage } from './pages/Meetings/JoinMeeting';
import { SettingsView as SettingsPage } from './pages/Settings/index';
import ReportsPage from './pages/Reports/index';
import ForgotPasswordPage from './pages/ForgotPassword/index';
import ResetPasswordPage from './pages/ResetPassword/index';

import { Sparkles } from 'lucide-react';

import { Task, TaskStatus, Note, RecurrenceType, User, Meeting } from './types';
import { TaskModal } from './components/TaskModal';
import { NoteModal } from './components/NoteModal';
import { UserModal } from './components/UserModal';
import { InviteModal } from './components/InviteModal';
import { TaskSuggestionModal } from './components/TaskSuggestionModal';
import { MeetingModal } from './components/MeetingModal';
import { MeetingRoom } from './components/MeetingRoom';
import { AIAssistant, AIAssistantHandle } from './components/AIAssistant';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
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
    const perms = currentUser.permissions || [];
    if (perms.includes('admin_panel') || perms.includes('manage_users')) return true;
    if (perms.includes('manage_dept_tasks')) return task.department === currentUser.department;
    return task.createdBy === currentUser.id;
  };

  const roleBasedTasks = useMemo(() => {
    if (!user) return [];
    const perms = user.permissions || [];
    return tasks.filter(t => {
      if (perms.includes('admin_panel') || perms.includes('view_all_tasks')) return true;
      if (perms.includes('manage_dept_tasks') && t.department === user.department) return true;
      if (t.assignees.includes(user.id) || t.createdBy === user.id) return true;
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
          message: `You have ${pendingCount} unfinished tasks for today.`, type: 'warning'
        });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 10000);
      }
    };
    const intervalId = setInterval(checkPendingTasks, 300000);
    return () => clearInterval(intervalId);
  }, [rawTodaysTasks]);

  useEffect(() => {
    // Report Reminder: Every Friday at >= 16:00
    const checkReportTime = () => {
      const now = new Date();
      if (now.getDay() === 5 && now.getHours() >= 16 && user && user.permissions?.includes('create_report')) {
        const hasFired = localStorage.getItem(`report_reminder_${now.toLocaleDateString()}`);
        if (!hasFired) {
          setNotification({
            visible: true, 
            title: "⏰ Đã đến giờ làm Báo cáo!",
            message: "Hôm nay là Thứ 6, đã qua 16h00. Vui lòng vào mục Báo cáo để tạo và gửi báo cáo công việc tuần này nhé!", 
            type: 'warning'
          });
          localStorage.setItem(`report_reminder_${now.toLocaleDateString()}`, 'true');
          setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 15000);
        }
      }
    };
    const interval = setInterval(checkReportTime, 60000);
    checkReportTime(); // check immediately on mount
    return () => clearInterval(interval);
  }, [user]);

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
    setNotification({ visible: true, title: 'Success', message: `Added ${tasksToAdd.length} tasks.`, type: 'info' });
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
  if (!user) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginView />} />
      </Routes>
    );
  }

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

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col">
          <div className="w-full flex-1 space-y-8">
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
                <TasksPage 
                  t={t}
                  rawTodaysTasks={rawTodaysTasks}
                  filteredTasks={filteredTasks}
                  allTags={allTags}
                  selectedTags={selectedTags}
                  toggleTagFilter={toggleTagFilter}
                  setSelectedTags={setSelectedTags}
                  searchQuery={searchQuery}
                  openCreateModal={openCreateModal}
                  openEditModal={openEditModal}
                  handleStatusToggle={handleStatusToggle}
                  handleDeleteTask={handleDeleteTask}
                  checkPermission={checkPermission}
                  user={user}
                  users={users}
                  aiAssistantRef={aiAssistantRef}
                  setIsSuggestionModalOpen={setIsSuggestionModalOpen}
                />
              } />

              <Route path="/calendar" element={
                <div className="h-[calc(100vh-8rem)]">
                  <CalendarPage tasks={roleBasedTasks} onDateClick={(date) => openCreateModal(date)} onTaskClick={(task) => openEditModal(task)} />
                </div>
              } />

              <Route path="/notes" element={
                <NotesPage 
                  t={t}
                  filteredNotes={filteredNotes}
                  openCreateNoteModal={openCreateNoteModal}
                  openEditNoteModal={openEditNoteModal}
                />
              } />

              <Route path="/team" element={
                <TeamPage 
                  t={t}
                  user={user}
                  users={users}
                  openCreateUserModal={openCreateUserModal}
                  openEditUserModal={openEditUserModal}
                  handleDeleteUser={handleDeleteUser}
                />
              } />

              <Route path="/reports" element={<ReportsPage />} />

              <Route path="/meetings" element={<MeetingsPage allUsers={users} onJoinMeeting={setActiveMeeting} onCreateMeeting={() => setIsMeetingModalOpen(true)} />} />
              <Route path="/meetings/join/:meetingId" element={<JoinMeetingPage onJoinMeeting={setActiveMeeting} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/forgot-password" element={<Navigate to="/" replace />} />
              <Route path="/reset-password" element={<Navigate to="/" replace />} />
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
