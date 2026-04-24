import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, Note, User, Report, Role, Department } from '../types';
import { getTasks as fetchTasks, saveTask as apiSaveTask, deleteTask as apiDeleteTask } from '../services/taskService';
import { getNotes as fetchNotes, saveNote as apiSaveNote, deleteNote as apiDeleteNote } from '../services/noteService';
import { getUsers as fetchUsers, saveUser as apiSaveUser, deleteUser as apiDeleteUser } from '../services/userService';
import { getReports as fetchReports, saveReport as apiSaveReport, deleteReport as apiDeleteReport } from '../services/reportService';
import { getRoles as fetchRoles } from '../services/roleService';
import { getDepartments as fetchDepartments } from '../services/departmentService';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  users: User[];
  reports: Report[];
  roles: Role[];
  departments: Department[];
  isLoading: boolean;
  error: string | null;
  saveTask: (t: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  saveNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveReport: (r: Report) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const { data: notes = [], isLoading: notesLoading, error: notesError } = useQuery({ queryKey: ['notes'], queryFn: fetchNotes });
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery({ queryKey: ['reports'], queryFn: fetchReports });
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });
  const { data: departments = [], isLoading: departmentsLoading, error: deptsError } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });

  const isLoading = tasksLoading || notesLoading || usersLoading || reportsLoading || rolesLoading || departmentsLoading;
  
  const anyError = tasksError || notesError || usersError || reportsError || rolesError || deptsError;
  const error = anyError ? 'Failed to fetch data' : null;

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };

  const saveTaskMutation = useMutation({
    mutationFn: apiSaveTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: apiDeleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const saveNoteMutation = useMutation({
    mutationFn: apiSaveNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: apiDeleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const saveUserMutation = useMutation({
    mutationFn: apiSaveUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const saveReportMutation = useMutation({
    mutationFn: apiSaveReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const deleteReportMutation = useMutation({
    mutationFn: apiDeleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  return (
    <DataContext.Provider value={{
      tasks, notes, users, reports, roles, departments, isLoading, error,
      saveTask: async (t) => { await saveTaskMutation.mutateAsync(t); },
      deleteTask: async (id) => { await deleteTaskMutation.mutateAsync(id); },
      saveNote: async (n) => { await saveNoteMutation.mutateAsync(n); },
      deleteNote: async (id) => { await deleteNoteMutation.mutateAsync(id); },
      saveUser: async (u) => { await saveUserMutation.mutateAsync(u); },
      deleteUser: async (id) => { await deleteUserMutation.mutateAsync(id); },
      saveReport: async (r) => { await saveReportMutation.mutateAsync(r); },
      deleteReport: async (id) => { await deleteReportMutation.mutateAsync(id); },
      refreshData
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
