import { User } from '../types';

const API_URL = '/api/users';

export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const saveUser = async (user: User): Promise<void> => {
  const allUsers = await getUsers();
  const exists = allUsers.some(u => u.id === user.id);
  
  if (exists) {
    const res = await fetch(`${API_URL}/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Update failed');
  } else {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Create failed');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  const res = await fetch(`${API_URL}/${userId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Delete failed');
};
