import { apiFetch } from './api';

export interface Client {
  id: string;
  name: string;
  region: string;
  createdAt: string;
}

export const getClients = async (): Promise<Client[]> => {
  const response = await apiFetch('/api/clients');
  if (!response.ok) {
    throw new Error('Failed to fetch clients');
  }
  return response.json();
};
