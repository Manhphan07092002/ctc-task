import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, Note, User } from '../types';
import { getTasks as fetchTasks, saveTask as apiSaveTask, deleteTask as apiDeleteTask } from '../services/taskService';
import { getNotes as fetchNotes, saveNote as apiSaveNote, deleteNote as apiDeleteNote } from '../services/noteService';
import { getUsers as fetchUsers, saveUser as apiSaveUser, deleteUser as apiDeleteUser } from '../services/userService';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  saveTask: (t: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  saveNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [tRes, nRes, uRes] = await Promise.all([fetchTasks(), fetchNotes(), fetchUsers()]);
      setTasks(tRes);
      setNotes(nRes);
      setUsers(uRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const saveTask = async (task: Task) => {
    await apiSaveTask(task);
    await refreshData();
  };

  const deleteTask = async (id: string) => {
    await apiDeleteTask(id);
    await refreshData();
  };

  const saveNote = async (note: Note) => {
    await apiSaveNote(note);
    await refreshData();
  };

  const deleteNote = async (id: string) => {
    await apiDeleteNote(id);
    await refreshData();
  };

  const saveUser = async (user: User) => {
    await apiSaveUser(user);
    await refreshData();
  };

  const deleteUser = async (id: string) => {
    await apiDeleteUser(id);
    await refreshData();
  };

  return (
    <DataContext.Provider value={{
      tasks, notes, users, isLoading, error,
      saveTask, deleteTask, saveNote, deleteNote, saveUser, deleteUser, refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
