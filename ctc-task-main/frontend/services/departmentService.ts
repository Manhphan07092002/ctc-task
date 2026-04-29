import { apiFetch } from './api';
import { Department } from '../types';

const API_URL = '/api/departments';

export const getDepartments = async (): Promise<Department[]> => {
  const response = await apiFetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch departments');
  return response.json();
};
