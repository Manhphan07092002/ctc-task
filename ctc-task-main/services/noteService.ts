
import { Note } from '../types';

const STORAGE_KEY = 'orange_note_data';

const INITIAL_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Project Ideas',
    content: '- Mobile first approach\n- Dark mode support\n- Voice commands integration',
    color: 'bg-yellow-100',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: 'Meeting Minutes',
    content: 'Discussed Q3 roadmap. Team agreed on focusing on performance optimization first.',
    color: 'bg-blue-100',
    createdAt: new Date().toISOString(),
  }
];

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTES));
  return INITIAL_NOTES;
};

export const saveNote = (note: Note): Note[] => {
  const currentNotes = getNotes();
  const existingIndex = currentNotes.findIndex(n => n.id === note.id);
  
  let newNotes;
  if (existingIndex >= 0) {
    newNotes = [...currentNotes];
    newNotes[existingIndex] = note;
  } else {
    newNotes = [note, ...currentNotes]; // Add new notes to top
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  return newNotes;
};

export const deleteNote = (noteId: string): Note[] => {
  const currentNotes = getNotes();
  const newNotes = currentNotes.filter(n => n.id !== noteId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  return newNotes;
};
