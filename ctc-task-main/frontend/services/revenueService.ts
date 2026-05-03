import { apiFetch } from './api';

const API_URL = '/api/revenue-reports';

export interface RevenueReport {
  id: string;
  title: string;
  reportType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  content?: string;
  totalPreTax: number;
  totalDelivered: number;
  totalCumulative: number;
  authorId: string;
  department: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  managerFeedback?: string;
  directorFeedback?: string;
  createdAt: string;
  submittedAt?: string;
  isDeleted?: number;
}

export const getRevenueReports = async (): Promise<RevenueReport[]> => {
  const res = await apiFetch(API_URL);
  if (!res.ok) throw new Error('Failed to fetch revenue reports');
  return res.json();
};

export const saveRevenueReport = async (report: RevenueReport & { _isNew?: boolean }): Promise<void> => {
  const isNew = report._isNew !== undefined ? report._isNew : (!report.submittedAt && !report.approvedAt);
  const res = await apiFetch(isNew ? API_URL : `${API_URL}/${report.id}`, {
    method: isNew ? 'POST' : 'PUT',
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error('Failed to save revenue report');
};

export const deleteRevenueReport = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete revenue report');
};
