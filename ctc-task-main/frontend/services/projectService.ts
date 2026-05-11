import { Project, ProjectReport, ProjectMilestone } from '../types';
import { apiFetch } from './api';

export const getProjects = async (): Promise<Project[]> => {
  const res = await apiFetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
};

export const getProjectDetails = async (id: string): Promise<{ project: Project, contracts: any[], reports: ProjectReport[] }> => {
  const res = await apiFetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project details');
  return res.json();
};

export const saveProject = async (project: Partial<Project>): Promise<void> => {
  const isUpdate = !!project.id;
  const res = await apiFetch(isUpdate ? `/api/projects/${project.id}` : '/api/projects', {
    method: isUpdate ? 'PUT' : 'POST',
    body: JSON.stringify(project)
  });
  if (!res.ok) throw new Error('Failed to save project');
};

export const deleteProject = async (id: string): Promise<void> => {
  const res = await apiFetch(`/api/projects/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete project');
};

export const getProjectReports = async (projectId: string): Promise<ProjectReport[]> => {
  const res = await apiFetch(`/api/projects/${projectId}/reports`);
  if (!res.ok) throw new Error('Failed to fetch project reports');
  return res.json();
};

export const saveProjectReport = async (projectId: string, report: Partial<ProjectReport>): Promise<void> => {
  const isUpdate = !!report.id;
  const url = isUpdate ? `/api/projects/${projectId}/reports/${report.id}` : `/api/projects/${projectId}/reports`;
  const res = await apiFetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    body: JSON.stringify(report)
  });
  if (!res.ok) throw new Error('Failed to save project report');
};

export const deleteProjectReport = async (projectId: string, reportId: string): Promise<void> => {
  const res = await apiFetch(`/api/projects/${projectId}/reports/${reportId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete project report');
};

// --- Milestones ---

export const getProjectMilestones = async (projectId: string): Promise<ProjectMilestone[]> => {
  const res = await apiFetch(`/api/projects/${projectId}/milestones`);
  if (!res.ok) throw new Error('Failed to fetch milestones');
  return res.json();
};

export const saveProjectMilestone = async (projectId: string, milestone: Partial<ProjectMilestone>): Promise<void> => {
  const isUpdate = !!milestone.id;
  const url = isUpdate ? `/api/projects/${projectId}/milestones/${milestone.id}` : `/api/projects/${projectId}/milestones`;
  const res = await apiFetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    body: JSON.stringify(milestone)
  });
  if (!res.ok) throw new Error('Failed to save milestone');
};

export const deleteProjectMilestone = async (projectId: string, milestoneId: string): Promise<void> => {
  const res = await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete milestone');
};
