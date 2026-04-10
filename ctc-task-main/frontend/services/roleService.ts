import { Role } from '../types';

const API_URL = '/api/roles';

export const getRoles = async (): Promise<Role[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};
