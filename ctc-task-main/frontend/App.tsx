import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Bell,
  Search,
  Menu,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Settings,
  Trash2,
  Repeat,
  CheckSquare,
  Mail,
  Shield,
  X,
  Sparkles,
  Filter,
  Target,
  Globe,
  Lock,
  Edit,
  Wand2,
  Layout,
  ListTodo,
  Timer,
  Flame
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

import { Task, TaskStatus, TaskPriority, Note, RecurrenceType, User } from './types';
import { getTasks, saveTask, deleteTask } from './services/taskService';
import { getNotes, saveNote, deleteNote } from './services/noteService';
import { getUsers, saveUser, deleteUser } from './services/userService';
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
import { AIAssistant, AIAssistantHandle } from './components/AIAssistant';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Meeting } from './types';
import { LoginView } from './components/LoginView';
import { ConfirmDialog } from './components/ConfirmDialog';

// -- Helper: Calculate Next Date --
const getNextDate = (dateStr: string, type: RecurrenceType): string => {
  const d = new Date(dateStr + 'T12:00:00Z');

  if (type === RecurrenceType.DAILY) d.setUTCDate(d.getUTCDate() + 1);
  if (type === RecurrenceType.WEEKLY) d.setUTCDate(d.getUTCDate() + 7);
  if (type === RecurrenceType.MONTHLY) d.setUTCMonth(d.getUTCMonth() + 1);

  return d.toISOString().split('T')[0];
};

// -- Helper: Greeting --
const getGreeting = (t: (key: string) => string) => {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 18) return t('goodAfternoon');
  return t('goodEvening');
};

// -- Internal Component: Live Clock --
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  const { language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="hidden xl:flex flex-col items-end mr-4 border-r border-gray-200 pr-4">
      <div className="text-lg font-bold text-gray-800 font-mono leading-none tabular-nums">
        {time.toLocaleTimeString(locale, { hour12: false })}
      </div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {time.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
};

// -- Components Internal to App --

const StatCard: React.FC<{ label: string; value: number; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-white/60 flex items-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
      <Icon size={28} className="drop-shadow-sm" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{value}</p>
    </div>
  </div>
);

interface TaskListItemProps {
  task: Task;
  onClick: () => void;
  onCheck: () => void;
  onDelete?: () => void;
  canToggle: boolean;
  isReadOnly: boolean;
  showDepartment?: boolean;
  allUsers: User[];
}

const TaskListItem: React.FC<TaskListItemProps> = ({
  task, onClick, onCheck, onDelete, canToggle, isReadOnly, showDepartment, allUsers
}) => {
  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.isCompleted).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const { language } = useLanguage();

  return (
    <div className="group flex items-center gap-4 p-5 bg-white/70 backdrop-blur-xl border border-white shadow-lg shadow-gray-200/50 rounded-[1.5rem] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 relative">
      <button
        onClick={(e) => { e.stopPropagation(); if (canToggle) onCheck(); }}
        disabled={!canToggle}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110
          ${task.status === TaskStatus.DONE
            ? 'bg-gradient-to-br from-success-500 to-success-600 border-success-500 text-white shadow-md shadow-success-500/30'
            : canToggle ? 'border-gray-300 hover:border-brand-500 text-transparent' : 'border-gray-200 bg-gray-50 cursor-not-allowed'}
        `}
      >
        <CheckCircle2 size={16} fill="currentColor" className={task.status === TaskStatus.DONE ? "animate-in zoom-in" : ""} />
      </button>

      <div className="flex-grow min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {isReadOnly && <Lock size={12} className="text-gray-400" />}
          <h4 className={`font-semibold truncate ${task.status === TaskStatus.DONE ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {task.title}
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {showDepartment && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
              {task.department}
            </span>
          )}
          {task.recurrence && task.recurrence !== RecurrenceType.NONE && (
            <span className="flex items-center gap-1 text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              <Repeat size={10} /> {task.recurrence}
            </span>
          )}
          {task.tags && task.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 truncate">{task.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {task.startDate}
          </span>
          {task.estimatedEndAt && (
            <span className="flex items-center gap-1 text-brand-600" title="Estimated Completion Time">
              <Target size={12} /> {new Date(task.estimatedEndAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {totalSubtasks > 0 && (
            <span className={`flex items-center gap-1 ${completedSubtasks === totalSubtasks ? 'text-success-600' : 'text-gray-500'}`}>
              <CheckSquare size={12} /> {completedSubtasks}/{totalSubtasks}
            </span>
          )}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignees.map(uid => {
                const u = allUsers.find(user => user.id === uid);
                return u ? <img key={u.id} src={u.avatar} className="w-5 h-5 rounded-full border border-white" alt={u.name} title={u.name} /> : null;
              })}
            </div>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
          title="Delete Task"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

interface NotificationState {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'warning';
}

// -- Main App Content --

function CTCTaskApp() {
  // Context
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, isLoading: isAuthLoading } = useAuth();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Available users
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<string>('');

  // Task Suggestion Modal
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  // Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // User Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Meeting State
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({ visible: false, title: '', message: '' });

  // AI Assistant Ref
  const aiAssistantRef = useRef<AIAssistantHandle>(null);

  // Initial Data Load
  useEffect(() => {
    setTasks(getTasks());
    setNotes(getNotes());
    setUsers(getUsers());
  }, []);

  // -- Permission Helpers --
  const checkPermission = (action: 'edit' | 'delete', task: Task, currentUser: User) => {
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Manager') {
      // Manager can edit/delete tasks in their department
      return task.department === currentUser.department;
    }
    if (currentUser.role === 'Employee') {
      // Employee can edit/delete ONLY their own tasks
      return task.createdBy === currentUser.id;
    }
    return false;
  };

  // -- Role-Based Data Filtering --
  const roleBasedTasks = useMemo(() => {
    if (!user) return [];

    return tasks.filter(t => {
      // 1. Admin sees everything
      if (user.role === 'Admin') return true;

      // 2. Everyone sees tasks assigned to them
      if (t.assignees.includes(user.id)) return true;

      // 3. Manager sees all tasks in their department
      if (user.role === 'Manager' && t.department === user.department) return true;

      // 4. Employee sees tasks they created
      if (user.role === 'Employee' && t.createdBy === user.id) return true;

      return false;
    });
  }, [tasks, user]);

  // Get raw tasks for today for reminder
  const rawTodaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return roleBasedTasks.filter(t => t.startDate === today);
  }, [roleBasedTasks]);

  // 5-Minute Reminder Effect
  useEffect(() => {
    const checkPendingTasks = () => {
      const pendingTasks = rawTodaysTasks.filter(t => t.status !== TaskStatus.DONE);
      const pendingCount = pendingTasks.length;

      if (pendingCount > 0) {
        setNotification({
          visible: true,
          title: "Reminder: Pending Tasks ⏰",
          message: `You have ${pendingCount} unfinished tasks for today. Keep focusing!`,
          type: 'warning'
        });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 10000);
      }
    };

    const intervalId = setInterval(checkPendingTasks, 300000);
    return () => clearInterval(intervalId);
  }, [rawTodaysTasks]);


  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    roleBasedTasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [roleBasedTasks]);

  // Filtered Data
  const filteredTasks = useMemo(() => {
    let result = roleBasedTasks;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter(t =>
        t.tags && t.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return result;
  }, [roleBasedTasks, searchQuery, selectedTags]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery)
    );
  }, [notes, searchQuery]);

  // Task Handlers
  const handleSaveTask = (task: Task) => {
    const isNew = !tasks.find(t => t.id === task.id);
    if (!isNew && !checkPermission('edit', task, user!)) {
      setNotification({ visible: true, title: 'Error', message: 'You do not have permission to edit this task.', type: 'warning' });
      return;
    }

    const updatedTasks = saveTask(task);
    setTasks(updatedTasks);
  };

  const handleAddMultipleTasks = (newTasks: Task[]) => {
    let currentTasks = getTasks();
    // Filter duplicates just in case IDs clash (unlikely with Math.random)
    const existingIds = new Set(currentTasks.map(t => t.id));

    const tasksToAdd = newTasks.filter(t => !existingIds.has(t.id));

    // Update state and storage iteratively (or could batch update service)
    // For now, simpler to just spread.
    const updatedTasks = [...currentTasks, ...tasksToAdd];

    // Persist manual save simulation since saveTask does single item
    // In a real app, we'd have a saveTasks (plural) method.
    // We'll use the side effect of saveTask to persist the last one, but really we need to set whole array.
    // Let's use the logic from saveTask:
    localStorage.setItem('orange_task_data', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);

    setNotification({
      visible: true,
      title: 'Success',
      message: `Added ${tasksToAdd.length} new tasks from your plan.`,
      type: 'info'
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    if (!checkPermission('delete', taskToDelete, user!)) {
      setNotification({
        visible: true,
        title: t('permissionDenied') || 'Permission Denied',
        message: t('noPermissionDeleteTask') || 'You do not have permission to delete this task.',
        type: 'warning'
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: t('confirmDelete'),
      message: t('confirmDeleteTask'),
      type: 'danger',
      onConfirm: () => {
        const updatedTasks = deleteTask(taskId);
        setTasks(updatedTasks);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleStatusToggle = (task: Task) => {
    const canEdit = checkPermission('edit', task, user!);
    const isAssignee = task.assignees.includes(user!.id);

    if (!canEdit && !isAssignee) {
      setNotification({
        visible: true,
        title: 'Permission Denied',
        message: 'You cannot update this task status.',
        type: 'warning'
      });
      return;
    }

    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    const updatedTask = { ...task, status: newStatus };
    let currentTaskList = saveTask(updatedTask);

    if (newStatus === TaskStatus.DONE && task.recurrence && task.recurrence !== RecurrenceType.NONE) {
      const nextDate = getNextDate(task.startDate, task.recurrence);
      const exists = currentTaskList.some(t =>
        t.title === task.title &&
        t.startDate === nextDate &&
        t.status === TaskStatus.TODO
      );

      if (!exists) {
        const newTask: Task = {
          ...task,
          id: Math.random().toString(36).substr(2, 9),
          startDate: nextDate,
          status: TaskStatus.TODO,
          subtasks: task.subtasks?.map(st => ({ ...st, isCompleted: false })),
          comments: []
        };
        currentTaskList = saveTask(newTask);
      }
    }
    setTasks(currentTaskList);
  };

  const openCreateModal = (date?: string) => {
    setEditingTask(null);
    setSelectedDateForCreate(date || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Note Handlers
  const handleSaveNote = (note: Note) => {
    const updatedNotes = saveNote(note);
    setNotes(updatedNotes);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = deleteNote(noteId);
    setNotes(updatedNotes);
  };

  const openCreateNoteModal = () => {
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const openEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  // User Handlers
  const handleSaveUser = (userToSave: User) => {
    const updatedUsers = saveUser(userToSave);
    setUsers(updatedUsers);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === user?.id) {
      setNotification({
        visible: true,
        title: t('error'),
        message: t('cannotDeleteSelf'),
        type: 'warning'
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: t('confirmDelete'),
      message: t('confirmDeleteUser'),
      type: 'danger',
      onConfirm: () => {
        const updatedUsers = deleteUser(userId);
        setUsers(updatedUsers);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setIsUserModalOpen(true);
  };

  // Derived Data for Dashboard
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

  // Chart Data
  const chartData = [
    { name: t('done'), value: stats.done, color: '#22c55e' },
    { name: t('inProgress'), value: stats.inProgress, color: '#3b82f6' },
    { name: 'Todo', value: stats.total - stats.done - stats.inProgress, color: '#94a3b8' },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  // Auth Checks
  if (isAuthLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-brand-500"><Sparkles className="animate-spin mr-2" /> Loading...</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-transparent text-gray-800 overflow-hidden font-sans selection:bg-brand-200">

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-4 left-4 z-40 w-72 bg-white/70 backdrop-blur-3xl border border-white/60 shadow-2xl shadow-brand-500/10 rounded-[2rem] flex flex-col overflow-hidden transform transition-all duration-500 ease-out
        ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] lg:translate-x-0 lg:opacity-100'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-20 flex items-center px-8 border-b border-white/40">
            <img src="/logo.png" alt="CTC Logo" className="h-10 w-auto object-contain mr-3 drop-shadow-sm mix-blend-multiply" />
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
              CTC Task
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="mb-6">
              <Button onClick={() => openCreateModal()} className="w-full justify-center gap-2 shadow-brand-200 shadow-lg whitespace-nowrap" size="lg">
                <PlusCircle size={20} /> {t('newTask')}
              </Button>
            </div>

            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
            {NAV_ITEMS.map(item => {
              if (item.id === 'team' && user.role === 'Employee') return null;
              return (
                <button
                  key={item.id}
                  onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${currentView === item.id
                      ? 'bg-brand-50 text-brand-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                >
                  <item.icon size={18} />
                  {t(item.id)}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <div
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={logout}
              title="Click to Logout"
            >
              <Avatar src={user.avatar} alt={user.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
              <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative lg:pl-80 transition-all duration-300">

        {/* Top Header */}
        <header className="h-20 mt-4 mx-4 lg:ml-6 lg:mr-8 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl flex items-center justify-between px-6 shrink-0 z-30 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 capitalize hidden sm:block">
              {currentView === 'dashboard' ? `${getGreeting(t)}, ${user.name.split(' ')[0]}` : t(currentView)}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <LiveClock />
            <button
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
            >
              <Globe size={16} className="text-gray-500" />
              {language === 'vi' ? 'Tiếng Việt' : 'English'}
            </button>

            <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-brand-200 transition-all">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors relative"
                onClick={() => setNotification({ ...notification, visible: false })}
              >
                <Bell size={20} />
                {notification.visible && (
                  <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-brand-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
              </button>

              {notification.visible && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in slide-in-from-top-2">
                  <div className="flex gap-3">
                    <div className={`mt-1 p-1 rounded-full h-fit ${notification.type === 'warning' ? 'bg-brand-100' : 'bg-blue-100'}`}>
                      <AlertCircle size={16} className={notification.type === 'warning' ? 'text-brand-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => setNotification(prev => ({ ...prev, visible: false }))} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* DASHBOARD VIEW */}
            {currentView === 'dashboard' && (
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
                      <button className="text-sm text-brand-600 font-medium hover:underline" onClick={() => setCurrentView('tasks')}>{t('viewAll')}</button>
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
                        <Button variant="ghost" size="sm" onClick={() => setCurrentView('notes')}>{t('viewNotes')}</Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredNotes.slice(0, 2).map(note => (
                          <div key={note.id} className={`${note.color} p-4 rounded-xl border border-black/5 cursor-pointer hover:shadow-sm transition-all`} onClick={() => openEditNoteModal(note)}>
                            <h4 className="font-bold text-gray-800 mb-1">{note.title || 'Untitled Note'}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
                          </div>
                        ))}
                        {notes.length === 0 && !searchQuery && (
                          <div className="col-span-2 bg-white p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500 cursor-pointer" onClick={openCreateNoteModal}>
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
                                <Cell key={`cell-${index}`} fill={entry.color} />
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
                      <div className="flex justify-center gap-4 mt-2">
                        {chartData.map(d => (
                          <div key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </div>
                        ))}
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
                        {user.role !== 'Employee' && (
                          <button onClick={() => setCurrentView('team')} className="w-full mt-2 text-xs text-brand-600 font-medium hover:bg-brand-50 py-2 rounded transition-colors">
                            {t('manageTeam')}
                          </button>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {/* CALENDAR VIEW */}
            {currentView === 'calendar' && (
              <div className="h-[calc(100vh-8rem)]">
                <CalendarView
                  tasks={roleBasedTasks}
                  onDateClick={(date) => openCreateModal(date)}
                  onTaskClick={(task) => openEditModal(task)}
                />
              </div>
            )}

            {/* NOTES VIEW */}
            {currentView === 'notes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">{t('notes')}</h2>
                  <Button onClick={openCreateNoteModal}>
                    <PlusCircle size={18} className="mr-2" /> {t('addNote')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => openEditNoteModal(note)}
                      className={`${note.color} p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative group border border-black/5 flex flex-col h-64`}
                    >
                      <h3 className="font-bold text-gray-900 text-lg mb-3 pr-6 line-clamp-1">
                        {note.title || 'Untitled'}
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-grow overflow-hidden mask-image-b">
                        {note.content}
                      </p>
                      <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center text-xs text-gray-500">
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={openCreateNoteModal}
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-300 hover:bg-brand-50 transition-all h-64"
                  >
                    <PlusCircle size={40} className="mb-2 opacity-50" />
                    <span className="font-medium">{t('createNote')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TEAM VIEW - Protected */}
            {currentView === 'team' && user.role !== 'Employee' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{t('teamMembers')}</h2>
                    <p className="text-gray-500 text-sm mt-1">Manage your team and permissions</p>
                  </div>
                  {user.role === 'Admin' && (
                    <div className="flex gap-2">
                      <Button onClick={() => openCreateUserModal()}>
                        <PlusCircle size={18} className="mr-2" /> Add Member
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u =>
                    // Managers can only see members of their department (and Admins generally)
                    user.role === 'Admin' ? true : u.department === user.department
                  ).map(u => (
                    <Card key={u.id} className="p-6 flex items-center gap-4 relative group">
                      <Avatar src={u.avatar} alt={u.name} size={16} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-lg truncate">{u.name}</h4>
                        <p className="text-gray-500 text-sm mb-2">{u.department} • {u.email}</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'Admin' ? 'bg-brand-100 text-brand-700' : u.role === 'Manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                          {u.role === 'Admin' && <Shield size={10} />}
                          {u.role}
                        </span>
                      </div>

                      {user.role === 'Admin' && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg p-1">
                          <button onClick={() => openEditUserModal(u)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md hover:text-blue-600">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-gray-500 hover:bg-red-50 rounded-md hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TASKS LIST VIEW */}
            {currentView === 'tasks' && (
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
                    <Button variant="secondary" onClick={() => aiAssistantRef.current?.summarizeTasks(todaysTasks)}>
                      <Sparkles size={18} className="mr-2" /> {t('aiSummary')}
                    </Button>
                    <Button onClick={() => openCreateModal()}>
                      <PlusCircle size={18} className="mr-2" /> {t('addTask')}
                    </Button>
                  </div>
                </div>

                {/* Tag Filter Bar */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mr-2">
                      <Filter size={14} />
                      <span>{t('filter')}</span>
                    </div>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${selectedTags.includes(tag)
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                      >
                        {t('clear')}
                      </button>
                    )}
                  </div>
                )}

                <Card className="overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex-1">{t('taskDetails')}</div>
                    <div className="w-32 text-center">{t('priority')}</div>
                    <div className="w-32 text-center">{t('status')}</div>
                    <div className="w-10"></div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {filteredTasks.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {searchQuery || selectedTags.length > 0 ? t('noMatchingTasks') : t('noTasksToday')}
                      </div>
                    ) : filteredTasks.map(task => {
                      const canEdit = checkPermission('edit', task, user);
                      const canDelete = checkPermission('delete', task, user);
                      const isAssignee = task.assignees.includes(user.id);

                      return (
                        <div key={task.id} className="px-6 py-4 flex items-center hover:bg-gray-50 transition-colors group">
                          <div className="flex-1 cursor-pointer" onClick={() => openEditModal(task)}>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusToggle(task) }}
                                disabled={!canEdit && !isAssignee}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                      ${task.status === TaskStatus.DONE
                                    ? 'bg-success-500 border-success-500 text-white'
                                    : (canEdit || isAssignee) ? 'border-gray-300 text-transparent hover:border-brand-400' : 'border-gray-200 bg-gray-50 cursor-not-allowed'}
                                    `}>
                                <CheckCircle2 size={12} fill="currentColor" />
                              </button>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!canEdit && <Lock size={12} className="text-gray-400" />}
                                  <p className={`font-semibold text-gray-800 ${task.status === TaskStatus.DONE ? 'line-through text-gray-400' : ''}`}>
                                    {task.title}
                                  </p>
                                  {task.tags && task.tags.map(t => (
                                    <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{t}</span>
                                  ))}
                                  {(user.role === 'Admin' || user.role === 'Manager') && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100">
                                      {task.department}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span className="truncate max-w-md">{task.description}</span>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock size={10} /> {task.startDate}
                                  </div>
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                      <CheckSquare size={10} /> {task.subtasks.filter(t => t.isCompleted).length}/{task.subtasks.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="w-32 flex justify-center">
                            <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="w-32 flex justify-center">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${task.status === TaskStatus.DONE ? 'bg-green-100 text-green-700' :
                              task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="w-10 flex justify-end">
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title={t('deleteTask')}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Settings View */}
            {currentView === 'settings' && <SettingsView />}

            {/* Meetings View */}
            {currentView === 'meetings' && (
              <MeetingView
                allUsers={users}
                onJoinMeeting={(meeting) => setActiveMeeting(meeting)}
                onCreateMeeting={() => setIsMeetingModalOpen(true)}
              />
            )}

          </div>
        </div>

      </main>

      {/* AI Assistant */}
      <AIAssistant ref={aiAssistantRef} />

      {/* MODALS */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        initialDate={selectedDateForCreate}
        user={user}
        readOnly={editingTask ? !checkPermission('edit', editingTask, user!) : false}
        allUsers={users}
      />

      <TaskSuggestionModal
        isOpen={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        onAddTasks={handleAddMultipleTasks}
        currentUser={user}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        initialNote={editingNote}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        initialUser={editingUser}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Meeting Room Overlay */}
      {activeMeeting && (
        <MeetingRoom
          meeting={activeMeeting}
          onLeave={() => setActiveMeeting(null)}
          allUsers={users}
        />
      )}

      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        allUsers={users}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />

    </div>
  );
}

// Export App wrapped in Providers
export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CTCTaskApp />
      </LanguageProvider>
    </AuthProvider>
  );
}
