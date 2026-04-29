import { apiFetch } from './api';
import { Role } from '../types';

const API_URL = '/api/roles';

export const getRoles = async (): Promise<Role[]> => {
  const response = await apiFetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};
