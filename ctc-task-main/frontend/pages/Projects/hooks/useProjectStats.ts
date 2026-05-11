import { useMemo } from 'react';
import { Project } from '../../../types';

export interface ProjectRisk {
  id: string;
  projectCode: string;
  name: string;
  type: 'overdue' | 'near_deadline' | 'over_budget' | 'slow_progress';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  nearDeadline: number;
  overdue: number;
  completedCount: number;
  totalBudget: number;
  totalContractValue: number;
  totalPaid: number;
  totalDebt: number;
  risks: ProjectRisk[];
  statusCounts: Record<string, number>;
  projectFinancials: { name: string; fullName: string; budget: number; contractValue: number; paidAmount: number }[];
  statusPie: { name: string; value: number; color: string }[];
  departmentPie: { name: string; value: number; color: string }[];
}

const DEPT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#14B8A6', '#EF4444', '#6366F1'];

export function useProjectStats(projects: Project[], contracts: any[], tasks: any[]): ProjectStats {
  return useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const active = projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed');
    const risks: ProjectRisk[] = [];

    let totalBudget = 0;
    let totalContractValue = 0;
    let totalPaid = 0;
    let nearDeadline = 0;
    let overdue = 0;

    const statusCounts: Record<string, number> = { planning: 0, in_progress: 0, on_hold: 0, completed: 0, cancelled: 0 };
    const deptMap = new Map<string, number>();

    const projectFinancials = projects.filter(p => p.status !== 'cancelled').map(p => {
      // Status
      if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;

      // Department
      const dept = p.department || 'Chưa phân bổ';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);

      // Financial
      const pContracts = contracts.filter((c: any) => c.projectId === p.id && c.status !== 'cancelled');
      const cValue = pContracts.reduce((sum: number, c: any) => sum + (c.postTaxValue || 0), 0);
      const cPaid = pContracts.reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0);
      const pValue = p.winningPrice || p.budget || 0;
      totalBudget += pValue;
      totalContractValue += cValue;
      totalPaid += cPaid;

      // Risks - Overdue
      if (p.endDate && p.endDate < today && p.status !== 'completed') {
        overdue++;
        risks.push({
          id: p.id, projectCode: p.projectCode, name: p.name,
          type: 'overdue', severity: 'high',
          message: `Đã quá hạn (hết ${p.endDate})`
        });
      }
      // Risks - Near deadline
      else if (p.endDate && p.endDate >= today && p.endDate <= sevenDaysLater && p.status !== 'completed') {
        nearDeadline++;
        risks.push({
          id: p.id, projectCode: p.projectCode, name: p.name,
          type: 'near_deadline', severity: 'medium',
          message: `Sắp hết hạn (${p.endDate})`
        });
      }

      // Risks - Over budget
      if (pValue > 0 && cValue > pValue * 1.05) {
        risks.push({
          id: p.id, projectCode: p.projectCode, name: p.name,
          type: 'over_budget', severity: 'high',
          message: `Giá trị HĐ vượt ${Math.round(((cValue / pValue) - 1) * 100)}% ngân sách`
        });
      }

      // Risks - Slow progress
      if (p.startDate && p.endDate && p.status === 'in_progress') {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.endDate).getTime();
        const now = Date.now();
        const timeProgress = Math.min(100, Math.round(((now - start) / (end - start)) * 100));
        
        const pTasks = tasks.filter((t: any) => t.projectId === p.id);
        const pDone = pTasks.filter((t: any) => t.status === 'Done');
        const taskProgress = pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;
        
        if (timeProgress > 50 && taskProgress < timeProgress - 30) {
          risks.push({
            id: p.id, projectCode: p.projectCode, name: p.name,
            type: 'slow_progress', severity: 'medium',
            message: `Tiến độ chậm (${taskProgress}% CV vs ${timeProgress}% TG)`
          });
        }
      }

      return {
        name: p.projectCode,
        fullName: p.name,
        budget: pValue,
        contractValue: cValue,
        paidAmount: cPaid
      };
    }).sort((a, b) => b.budget - a.budget).slice(0, 10);

    // cancelled ones
    projects.filter(p => p.status === 'cancelled').forEach(() => statusCounts.cancelled++);

    const statusPie = [
      { name: 'Kế hoạch', value: statusCounts.planning, color: '#9CA3AF' },
      { name: 'Đang chạy', value: statusCounts.in_progress, color: '#3B82F6' },
      { name: 'Tạm dừng', value: statusCounts.on_hold, color: '#F59E0B' },
      { name: 'Hoàn thành', value: statusCounts.completed, color: '#10B981' },
    ].filter(d => d.value > 0);

    const departmentPie = Array.from(deptMap.entries()).map(([name, value], i) => ({
      name, value, color: DEPT_COLORS[i % DEPT_COLORS.length]
    })).filter(d => d.value > 0);

    // Sort risks by severity
    risks.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });

    return {
      totalProjects: projects.length,
      activeProjects: active.length,
      nearDeadline,
      overdue,
      completedCount: statusCounts.completed,
      totalBudget,
      totalContractValue,
      totalPaid,
      totalDebt: Math.max(0, totalContractValue - totalPaid),
      risks,
      statusCounts,
      projectFinancials,
      statusPie,
      departmentPie,
    };
  }, [projects, contracts, tasks]);
}
