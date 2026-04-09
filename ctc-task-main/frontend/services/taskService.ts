import { Task } from '../types';

const API_URL = '/api/tasks';

export const getTasks = async (): Promise<Task[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
};

export const saveTask = async (task: Task): Promise<void> => {
  // Check if it already exists (if id exists, we'll try to update, if update fails, it means it doesn't exist?
  // Our API expects POST to create, PUT to update.
  // We can do a quick check to see if it exists by doing a PUT, if 404, we do POST. But sqlite doesn't work like that without a check.
  // Let's fetch all tasks first to see if it exists... Actually, better to just modify the API or pass a flag.
  // Wait, in App.tsx, a newly created task has a random id assigned right before calling saveTask.
  // So we can assume if we fetch and find it, it's an update.
  
  // This is slightly inefficient but matches previous mock behavior cleanly.
  const allTasks = await getTasks();
  const exists = allTasks.some(t => t.id === task.id);
  
  if (exists) {
    const res = await fetch(`${API_URL}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error('Update failed');
  } else {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error('Create failed');
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const res = await fetch(`${API_URL}/${taskId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Delete failed');
};
