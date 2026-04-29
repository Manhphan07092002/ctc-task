import { apiFetch } from './api';
import { Note } from '../types';

const API_URL = '/api/notes';

export const getNotes = async (userId: string): Promise<Note[]> => {
  const response = await apiFetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error('Failed to fetch notes');
  return response.json();
};

export const saveNote = async (note: Note): Promise<void> => {
  // Fetch only user's own notes to check existence
  const allNotes = await getNotes(note.userId || '');
  const exists = allNotes.some(n => n.id === note.id);

  if (exists) {
    const res = await apiFetch(`${API_URL}/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    if (!res.ok) throw new Error('Update failed');
  } else {
    const res = await apiFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    if (!res.ok) throw new Error('Create failed');
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const res = await apiFetch(`${API_URL}/${noteId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Delete failed');
};
