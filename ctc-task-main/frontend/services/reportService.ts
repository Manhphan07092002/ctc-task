import { apiFetch } from './api';
import { Report } from '../types';

const API_URL = '/api/reports';

export const getReports = async (): Promise<Report[]> => {
  const response = await apiFetch(API_URL);
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
};

export const saveReport = async (report: Report): Promise<void> => {
  const existing = await getReports();
  const exists = existing.find(r => r.id === report.id);
  
  const response = await apiFetch(exists ? `${API_URL}/${report.id}` : API_URL, {
    method: exists ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error('Failed to save report');
};

// Soft delete — marks deletedAt, report hidden from all non-admin views
export const deleteReport = async (id: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete report');
};

// Admin only: permanently remove a report from DB
export const adminHardDeleteReport = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to hard-delete report');
};

// Admin only: restore a soft-deleted report
export const restoreReport = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/admin/reports/${id}/restore`, { method: 'PUT' });
  if (!response.ok) throw new Error('Failed to restore report');
};
