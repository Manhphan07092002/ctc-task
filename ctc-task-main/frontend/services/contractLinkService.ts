import { apiFetch } from './api';

export interface ContractLink {
  id: string;
  outputContractId: string;
  inputContractId: string;
  linkType: string; // 'related' | 'procurement' | 'subcontract'
  description?: string;
  createdBy?: string;
  createdAt: string;
}

export const getContractLinks = async (): Promise<ContractLink[]> => {
  const res = await apiFetch('/api/contract-links');
  if (!res.ok) throw new Error('Failed to fetch contract links');
  return res.json();
};

export const createContractLink = async (link: Omit<ContractLink, 'id' | 'createdAt' | 'createdBy'>): Promise<{ id: string }> => {
  const res = await apiFetch('/api/contract-links', {
    method: 'POST',
    body: JSON.stringify(link),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create link');
  }
  return res.json();
};

export const updateContractLink = async (id: string, updates: Partial<ContractLink>): Promise<void> => {
  const res = await apiFetch(`/api/contract-links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update link');
};

export const deleteContractLink = async (id: string): Promise<void> => {
  const res = await apiFetch(`/api/contract-links/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete link');
};
