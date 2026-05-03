import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, Note, User, Report, Role, Department } from '../types';
import { getTasks as fetchTasks, saveTask as apiSaveTask, deleteTask as apiDeleteTask } from '../services/taskService';
import { getNotes as fetchNotes, saveNote as apiSaveNote, deleteNote as apiDeleteNote } from '../services/noteService';
import { getUsers as fetchUsers, saveUser as apiSaveUser, deleteUser as apiDeleteUser } from '../services/userService';
import { getReports as fetchReports, saveReport as apiSaveReport, deleteReport as apiDeleteReport, adminHardDeleteReport as apiAdminHardDeleteReport } from '../services/reportService';
import { getRoles as fetchRoles } from '../services/roleService';
import { getDepartments as fetchDepartments } from '../services/departmentService';
import { getContracts as fetchContracts, saveContract as apiSaveContract, deleteContract as apiDeleteContract, Contract } from '../services/contractService';
import { getRevenueReports as fetchRevenueReports, saveRevenueReport as apiSaveRevenueReport, deleteRevenueReport as apiDeleteRevenueReport, RevenueReport } from '../services/revenueService';
import { useAuth } from './AuthContext';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  users: User[];
  reports: Report[];
  roles: Role[];
  departments: Department[];
  contracts: Contract[];
  revenueReports: RevenueReport[];
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
  adminHardDeleteReport: (id: string) => Promise<void>;
  saveContract: (c: Contract & { _isNew?: boolean }) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  saveRevenueReport: (r: RevenueReport & { _isNew?: boolean }) => Promise<void>;
  deleteRevenueReport: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id || '';

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const { data: notes = [], isLoading: notesLoading, error: notesError } = useQuery({ queryKey: ['notes', userId], queryFn: () => fetchNotes(userId), enabled: !!userId });
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery({ queryKey: ['reports'], queryFn: fetchReports });
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });
  const { data: departments = [], isLoading: departmentsLoading, error: deptsError } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });
  const { data: contracts = [], isLoading: contractsLoading, error: contractsError } = useQuery({ queryKey: ['contracts'], queryFn: fetchContracts, enabled: !!userId, retry: false });
  const { data: revenueReports = [], isLoading: revenueLoading, error: revenueError } = useQuery({ queryKey: ['revenueReports'], queryFn: fetchRevenueReports, enabled: !!userId, retry: false });

  const isLoading = tasksLoading || notesLoading || usersLoading || reportsLoading || rolesLoading || departmentsLoading || contractsLoading || revenueLoading;
  
  const anyError = tasksError || notesError || usersError || reportsError || rolesError || deptsError || contractsError || revenueError;
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', userId] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: apiDeleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', userId] }),
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
    onMutate: async (newReport) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['reports'] });
      // Snapshot the previous value
      const previousReports = queryClient.getQueryData<Report[]>(['reports']);
      // Optimistically update to the new value
      queryClient.setQueryData<Report[]>(['reports'], (old) => {
        if (!old) return [newReport];
        const exists = old.find((r) => r.id === newReport.id);
        if (exists) {
          return old.map((r) => (r.id === newReport.id ? { ...r, ...newReport } : r));
        }
        return [...old, newReport];
      });
      // Return a context object with the snapshotted value
      return { previousReports };
    },
    onError: (err, newReport, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(['reports'], context.previousReports);
      }
    },
    onSettled: () => {
      // Background refetch, do not return the promise to avoid blocking mutateAsync
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: apiDeleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const adminHardDeleteReportMutation = useMutation({
    mutationFn: apiAdminHardDeleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const saveContractMutation = useMutation({
    mutationFn: apiSaveContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const deleteContractMutation = useMutation({
    mutationFn: apiDeleteContract,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
  const saveRevenueReportMutation = useMutation({
    mutationFn: apiSaveRevenueReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenueReports'] }),
  });
  const deleteRevenueReportMutation = useMutation({
    mutationFn: apiDeleteRevenueReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenueReports'] }),
  });

  return (
    <DataContext.Provider value={{
      tasks, notes, users, reports, roles, departments, contracts, revenueReports, isLoading, error,
      saveTask: async (t) => { await saveTaskMutation.mutateAsync(t); },
      deleteTask: async (id) => { await deleteTaskMutation.mutateAsync(id); },
      saveNote: async (n) => { await saveNoteMutation.mutateAsync(n); },
      deleteNote: async (id) => { await deleteNoteMutation.mutateAsync(id); },
      saveUser: async (u) => { await saveUserMutation.mutateAsync(u); },
      deleteUser: async (id) => { await deleteUserMutation.mutateAsync(id); },
      saveReport: async (r) => { await saveReportMutation.mutateAsync(r); },
      deleteReport: async (id) => { await deleteReportMutation.mutateAsync(id); },
      adminHardDeleteReport: async (id) => { await adminHardDeleteReportMutation.mutateAsync(id); },
      saveContract: async (c) => { await saveContractMutation.mutateAsync(c); },
      deleteContract: async (id) => { await deleteContractMutation.mutateAsync(id); },
      saveRevenueReport: async (r) => { await saveRevenueReportMutation.mutateAsync(r); },
      deleteRevenueReport: async (id) => { await deleteRevenueReportMutation.mutateAsync(id); },
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
