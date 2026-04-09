
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  StickyNote, 
  Users, 
  Settings,
  Video
} from 'lucide-react';
import { User, TaskPriority } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'tasks', icon: CheckSquare },
  { id: 'calendar', icon: Calendar },
  { id: 'notes', icon: StickyNote },
  { id: 'meetings', icon: Video },
  { id: 'team', icon: Users },
  { id: 'settings', icon: Settings },
];

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: 'bg-red-50 text-red-600 border-red-200',
  [TaskPriority.MEDIUM]: 'bg-orange-50 text-orange-600 border-orange-200',
  [TaskPriority.LOW]: 'bg-green-50 text-green-600 border-green-200',
};



export const NOTE_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-300' },
  { id: 'green', bg: 'bg-green-100', border: 'border-green-300' },
  { id: 'pink', bg: 'bg-pink-100', border: 'border-pink-300' },
  { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-300' },
  { id: 'orange', bg: 'bg-orange-100', border: 'border-orange-300' },
  { id: 'white', bg: 'bg-white', border: 'border-gray-200' },
];
