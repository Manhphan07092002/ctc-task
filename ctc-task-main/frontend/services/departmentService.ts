import { Department } from '../types';

const API_URL = '/api/departments';

export const getDepartments = async (): Promise<Department[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch departments');
  return response.json();
};
