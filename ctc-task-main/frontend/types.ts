
export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export enum RecurrenceType {
  NONE = 'None',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  dueDate?: string;
  estimatedEndAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: string[];
  tags?: string[];
  createdBy: string;
  department: string;
  recurrence?: RecurrenceType;
  subtasks?: Subtask[];
  comments?: Comment[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

// Core roles are the 4 built-in system roles.
// The type is kept open (| string) to support custom roles created via Admin panel.
export type UserRole = 'Admin' | 'Director' | 'Manager' | 'Employee' | (string & {});

export type ReportStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface Report {
  id: string;
  title: string;
  content: string;
  authorId: string;
  department: string;
  status: ReportStatus;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  directorFeedback?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar: string;
  permissions?: string[];
}

export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  hostId: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  status: MeetingStatus;
  participants: string[];
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  permissions: string[];
  isSystem: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  managerId?: string;
}
