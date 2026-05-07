import { apiFetch } from './api';

const API_URL = '/api/contracts';

export interface ContractProduct {
  name: string;
  unit: string;
  quantity: number;
  origin: string;
  unitPrice: number;
  total: number;
  exportedQuantity?: number;
  invoicedQuantity?: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  contractName: string; // Tên dự án/hợp đồng chung
  products?: ContractProduct[];
  preTaxValue: number; // Tổng giá trị trước thuế
  vatRate: number; // % thuế VAT (ví dụ: 8, 10)
  postTaxValue: number; // Tổng giá trị sau thuế
  invoiceDate?: string;
  invoiceNumber?: string;
  department: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number;
  status?: string; // 'draft', 'pending', 'in_progress', 'completed', 'cancelled'
  attachments?: string[];
  paidAmount?: number;
}

export const getContracts = async (): Promise<Contract[]> => {
  const res = await apiFetch(API_URL);
  if (!res.ok) throw new Error('Failed to fetch contracts');
  return res.json();
};

export const saveContract = async (contract: Contract & { _isNew?: boolean }): Promise<void> => {
  const isNew = contract._isNew !== false && !contract.updatedAt;
  const res = await apiFetch(isNew ? API_URL : `${API_URL}/${contract.id}`, {
    method: isNew ? 'POST' : 'PUT',
    body: JSON.stringify(contract),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to save contract details:', errText);
    throw new Error('Failed to save contract');
  }
};

export const deleteContract = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete contract');
};
