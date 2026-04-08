
import { Task, TaskPriority, TaskStatus } from '../types';

const STORAGE_KEY = 'orange_task_data';

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Design System Review',
    description: 'Review the new color palette and component library compatibility.',
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndAt: new Date(new Date().setHours(17, 0, 0, 0)).toISOString().slice(0, 16), // Today at 5 PM
    priority: TaskPriority.HIGH,
    status: TaskStatus.IN_PROGRESS,
    assignees: ['u1', 'u2'],
    tags: ['Design', 'UI/UX'],
    createdBy: 'u1',
    department: 'Board',
    subtasks: [
      { id: 'st1', title: 'Check color contrast ratios', isCompleted: true },
      { id: 'st2', title: 'Update typography tokens', isCompleted: false },
      { id: 'st3', title: 'Review button states', isCompleted: false },
    ],
    comments: [
      {
        id: 'c1',
        userId: 'u2',
        content: 'I have updated the color tokens in Figma.',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  },
  {
    id: 't2',
    title: 'Client Meeting Preparation',
    description: 'Prepare slides for the Q3 review with Partner Corp.',
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndAt: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10) + 'T10:00', // Tomorrow 10 AM
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    assignees: ['u1'],
    tags: ['Meeting', 'External'],
    createdBy: 'u1',
    department: 'Board',
    subtasks: [],
    comments: []
  },
  {
    id: 't3',
    title: 'Update Dependencies',
    description: 'Upgrade React and Tailwind versions.',
    startDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0], // 2 days ago
    priority: TaskPriority.LOW,
    status: TaskStatus.DONE,
    assignees: ['u3'],
    tags: ['Dev', 'Maintenance'],
    createdBy: 'u3',
    department: 'Product',
    subtasks: [
      { id: 'st4', title: 'Run npm update', isCompleted: true },
      { id: 'st5', title: 'Fix breaking changes', isCompleted: true },
    ],
    comments: []
  },
  {
    id: 't4',
    title: 'Monthly Report',
    description: 'Compile usage stats and revenue.',
    startDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], // 5 days future
    priority: TaskPriority.HIGH,
    status: TaskStatus.TODO,
    assignees: ['u2'],
    tags: ['Finance'],
    createdBy: 'u2',
    department: 'Product',
    subtasks: [],
    comments: []
  }
];

export const getTasks = (): Task[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with mock data if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
  return INITIAL_TASKS;
};

export const saveTask = (task: Task): Task[] => {
  const currentTasks = getTasks();
  const existingIndex = currentTasks.findIndex(t => t.id === task.id);
  
  let newTasks;
  if (existingIndex >= 0) {
    newTasks = [...currentTasks];
    newTasks[existingIndex] = task;
  } else {
    newTasks = [...currentTasks, task];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
  return newTasks;
};

export const deleteTask = (taskId: string): Task[] => {
  const currentTasks = getTasks();
  const newTasks = currentTasks.filter(t => t.id !== taskId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
  return newTasks;
};
