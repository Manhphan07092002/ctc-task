
import { User } from '../types';
import { MOCK_USERS } from '../constants';

const STORAGE_KEY = 'orange_task_users';

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with mock data if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_USERS));
  return MOCK_USERS;
};

export const saveUser = (user: User): User[] => {
  const currentUsers = getUsers();
  const existingIndex = currentUsers.findIndex(u => u.id === user.id);
  
  let newUsers;
  if (existingIndex >= 0) {
    newUsers = [...currentUsers];
    newUsers[existingIndex] = user;
  } else {
    newUsers = [...currentUsers, user];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
  return newUsers;
};

export const deleteUser = (userId: string): User[] => {
  const currentUsers = getUsers();
  // Prevent deleting the last admin or yourself (handled in UI mostly, but safety check here)
  const newUsers = currentUsers.filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
  return newUsers;
};
