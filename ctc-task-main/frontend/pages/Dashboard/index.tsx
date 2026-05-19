import React, { useMemo, useState, useEffect } from 'react';
import {
  CheckCircle2, ListTodo, Timer, Flame, FileText, Video,
  Sun, Sunset, Moon, Plus, Clock, ChevronRight, AlertCircle, AlertTriangle,
  FileSignature, Wallet, DollarSign, Briefcase, PenTool, CalendarPlus, X, ExternalLink, Users, Bot
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, User, Note, Report, Meeting } from '../../types';
import { Contract } from '../../services/contractService';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, Card, Avatar } from '../../components/UI';
import { TaskListItem } from '../../components/TaskListItem';
import { StatCard } from '../../components/StatCard';
import { subscribeToMeetings } from '../../services/meetingService';
import { useData } from '../../contexts/DataContext';

interface DashboardProps {
  roleBasedTasks: Task[];
  filteredTasks: Task[];
  filteredNotes: Note[];
  notes: Note[];
  users: User[];
  user: User;
  reports: Report[];
  contracts?: Contract[];
  searchQuery: string;
  openCreateModal: (d?: string) => void;
  openEditModal: (t: Task) => void;
  handleStatusToggle: (t: Task) => void;
  handleDeleteTask: (id: string) => void;
  checkPermission: (action: 'edit' | 'delete', task: Task, user: User) => boolean;
}

export default function DashboardPage({
  roleBasedTasks, filteredTasks, filteredNotes, notes, users, user, reports = [], contracts = [], searchQuery,
  openCreateModal, openEditModal, handleStatusToggle, handleDeleteTask, checkPermission
}: DashboardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const { projects = [] } = useData();
  const [popup, setPopup] = useState<{ title: string; content: React.ReactNode; navPath?: string; navLabel?: string } | null>(null);

  const closePopup = () => setPopup(null);
  const openPopupAndNav = (path: string) => { closePopup(); navigate(path); };

  useEffect(() => {
    const unsubscribe = subscribeToMeetings(setMeetings);
    return () => unsubscribe();
  }, []);

  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { label: 'Chào buổi sáng', icon: Sun, color: 'text-amber-500' };
    if (hour < 18) return { label: 'Chào buổi chiều', icon: Sunset, color: 'text-orange-500' };
    return { label: 'Chào buổi tối', icon: Moon, color: 'text-indigo-500' };
  }, []);

  const randomGreeting = useMemo(() => {
    const greetings = [
      "Chúc bạn một ngày làm việc tràn đầy năng lượng cùng CTC!",
      "Sẵn sàng bứt phá mục tiêu hôm nay chưa?",
      "CTC chúc bạn một ngày làm việc hiệu quả và thành công!",
      "Hôm nay là một ngày tuyệt vời để hoàn thành những dự án lớn!",
      "Hãy giữ vững phong độ và gặt hái nhiều thành công cùng CTC nhé!",
      "Một tinh thần sảng khoái sẽ mang lại hiệu suất tuyệt vời!",
      "Cùng CTC tạo nên những đột phá mới trong ngày hôm nay!",
      "Chúc bạn giải quyết mọi công việc thật mượt mà và nhanh chóng!",
      "Khởi động ngày mới với 100% năng lượng nào!",
      "Thành công luôn đến với những ai làm việc chăm chỉ. Cố lên!",
      "CTC luôn đồng hành cùng bạn trên con đường phát triển!",
      "Hãy biến những thách thức hôm nay thành cơ hội tỏa sáng!",
      "Chúc bạn có một ngày ngập tràn ý tưởng sáng tạo!",
      "Đừng quên dành vài phút nghỉ ngơi để nạp lại năng lượng nhé!",
      "Mỗi nhiệm vụ hoàn thành là một bước tiến gần hơn đến mục tiêu chung của CTC!",

      "Có công mài sắt, có ngày nên kim. Cùng cố gắng hôm nay nhé!",
      "Đi một ngày đàng, học một sàng khôn. Mỗi ngày làm việc là một ngày trưởng thành!",
      "Muốn đi nhanh thì đi một mình, muốn đi xa thì đi cùng nhau. CTC cùng bạn tiến bước!",
      "Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao. Cùng phối hợp thật tốt hôm nay nhé!",
      "Nước chảy đá mòn. Kiên trì từng chút, thành công sẽ đến!",
      "Lửa thử vàng, gian nan thử sức. Hôm nay là cơ hội để bạn tỏa sáng!",
      "Thua keo này ta bày keo khác. Khó khăn chỉ là bước đệm để làm tốt hơn!",
      "Có chí thì nên. Chỉ cần bắt đầu, bạn đã tiến gần hơn đến mục tiêu!",
      "Chậm mà chắc vẫn hơn nhanh mà vội. Làm việc bình tĩnh và hiệu quả nhé!",
      "Góp gió thành bão. Mỗi việc nhỏ hôm nay đều tạo nên kết quả lớn ngày mai!",
      "Kiến tha lâu cũng đầy tổ. Từng nhiệm vụ nhỏ sẽ đưa bạn đến thành công lớn!",
      "Học đi đôi với hành. Hôm nay vừa làm, vừa học, vừa tiến bộ nhé!",
      "Việc hôm nay chớ để ngày mai. Cùng bắt tay hoàn thành thật gọn gàng nào!",
      "Đoàn kết là sức mạnh. Cùng CTC tạo nên một ngày làm việc thật hiệu quả!",
      "Người có tâm ắt có tầm. Làm việc bằng trách nhiệm, kết quả sẽ xứng đáng!",

      "Chúc bạn hôm nay làm đâu chắc đó, xử lý việc nào gọn việc đó!",
      "Một ngày mới bắt đầu, chúc bạn luôn tỉnh táo, tập trung và đầy cảm hứng!",
      "Hãy để hôm nay trở thành một ngày đáng tự hào trong hành trình làm việc của bạn!",
      "Chúc bạn luôn giữ tinh thần tích cực, dù công việc có bận rộn đến đâu!",
      "Mỗi ngày là một cơ hội mới để làm tốt hơn hôm qua!",
      "Cố gắng thêm một chút hôm nay, bạn sẽ thấy kết quả khác biệt vào ngày mai!",
      "Chúc bạn có một ngày làm việc thật suôn sẻ, ít áp lực và nhiều thành quả!",
      "Bắt đầu bằng sự tập trung, kết thúc bằng một kết quả thật xứng đáng!",
      "Hôm nay hãy làm việc bằng cả sự chủ động, trách nhiệm và tinh thần đồng đội!",
      "Chúc bạn luôn có đủ bình tĩnh để xử lý việc khó và đủ năng lượng để hoàn thành việc lớn!",
      "Một ngày hiệu quả không cần quá hoàn hảo, chỉ cần bạn tiến bộ hơn hôm qua!",
      "Cùng CTC biến kế hoạch hôm nay thành kết quả thực tế!",
      "Chúc bạn luôn tìm thấy niềm vui trong từng nhiệm vụ mình đang làm!",
      "Dù hôm nay có nhiều việc, hãy cứ từng bước hoàn thành thật chắc chắn nhé!",
      "Tinh thần tốt là khởi đầu của một ngày làm việc thành công!",
      "Chúc bạn hôm nay gặp nhiều thuận lợi, phối hợp nhịp nhàng và đạt kết quả tốt!",
      "Hãy làm việc bằng sự tận tâm, vì những điều lớn lao luôn bắt đầu từ những việc nhỏ!",
      "Mỗi thử thách hôm nay là một cơ hội để bạn chứng minh năng lực của mình!",
      "Chúc bạn có một ngày thật nhiều cảm hứng, nhiều ý tưởng và nhiều thành công!",
      "Cùng nhau làm việc hết mình để mỗi ngày tại CTC đều là một ngày đáng nhớ!"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, []);

  const todayUpcomingMeetings = useMemo(() => {
    const today = new Date();
    return meetings.filter(m => {
      const date = new Date(m.startTime);
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() && date.getTime() >= today.getTime();
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [meetings]);

  const stats = useMemo(() => {
    const total = roleBasedTasks.length;
    const done = roleBasedTasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = roleBasedTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = roleBasedTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
    const highPriority = roleBasedTasks.filter(t => t.priority === TaskPriority.HIGH).length;

    let pendingReports = 0;
    if (user.permissions?.includes('approve_dept_reports') || user.permissions?.includes('director_feedback')) {
      pendingReports = reports.filter(r => r.status === 'Pending').length;
    } else {
      pendingReports = reports.filter(r => r.authorId === user.id && r.status === 'Pending').length;
    }

    const myContracts = user.permissions?.includes('view_all_reports') || user.permissions?.includes('director_feedback') || user.permissions?.includes('admin_panel')
      ? contracts
      : contracts.filter(c => c.department === user.department);

    const totalContracts = myContracts.length;
    const totalDebt = myContracts.reduce((s, c) => s + Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0)), 0);
    const totalPaid = myContracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalPostTax = myContracts.reduce((s, c) => s + (c.postTaxValue || 0), 0);

    return { total, done, inProgress, pendingReports, upcomingMeetings: todayUpcomingMeetings.length, overdue, highPriority, myNotes: notes.length, totalContracts, totalDebt, totalPaid, totalPostTax };
  }, [roleBasedTasks, reports, user, todayUpcomingMeetings, notes, contracts]);

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredTasks.filter(t => t.startDate === today);
  }, [filteredTasks]);

  const recentReports = useMemo(() => {
    const isManagerOrDirector = user.permissions?.includes('approve_dept_reports') || user.permissions?.includes('director_feedback');
    let relevantReports = reports;
    if (!isManagerOrDirector) {
      relevantReports = reports.filter(r => r.authorId === user.id);
    }
    // Sort by created/submitted desc
    return relevantReports
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [reports, user]);

  const recentContracts = useMemo(() => {
    const isManagerOrDirector = user.permissions?.includes('view_all_reports') || user.permissions?.includes('director_feedback') || user.permissions?.includes('admin_panel');
    let relevantContracts = contracts;
    if (!isManagerOrDirector) {
      relevantContracts = contracts.filter(c => c.department === user.department);
    }
    return relevantContracts
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [contracts, user]);

  const chartData = [
    { name: t('done'), value: stats.done, color: '#22c55e' },
    { name: t('inProgress'), value: stats.inProgress, color: '#3b82f6' },
    { name: 'Todo', value: Math.max(0, stats.total - stats.done - stats.inProgress), color: '#94a3b8' },
  ];

  const overdueTasksList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return roleBasedTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE)
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
  }, [roleBasedTasks]);

  const priorityChartData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    roleBasedTasks.forEach(t => {
      if (counts[t.priority as keyof typeof counts] !== undefined) {
        counts[t.priority as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Thấp', value: counts.Low, fill: '#94a3b8' },
      { name: 'Trung bình', value: counts.Medium, fill: '#3b82f6' },
      { name: 'Cao', value: counts.High, fill: '#f59e0b' }
    ];
  }, [roleBasedTasks]);

  const financeChartData = useMemo(() => {
    return [
      { name: 'Doanh thu', value: stats.totalPostTax, fill: '#10b981' },
      { name: 'Thực thu', value: stats.totalPaid, fill: '#3b82f6' },
      { name: 'Công nợ', value: stats.totalDebt, fill: '#f43f5e' }
    ];
  }, [stats]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReportStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">Chờ duyệt</span>;
      case 'Approved': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Đã duyệt</span>;
      case 'Rejected': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">Từ chối</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">Nháp</span>;
    }
  };

  return (
    <>
      {/* Global Popup Modal */}
      {popup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={closePopup}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{popup.title}</h3>
              <button onClick={closePopup} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6">{popup.content}</div>
            {popup.navPath && (
              <div className="px-6 pb-5">
                <button onClick={() => openPopupAndNav(popup.navPath!)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-brand-500/30">
                  <ExternalLink size={15} /> {popup.navLabel || 'Mở trang quản lý'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-brand-50/30 dark:from-slate-800/80 dark:via-slate-800/80 dark:to-slate-700/40 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} alt={user.name} size={12} className="ring-4 ring-brand-100/50 dark:ring-slate-700" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <timeOfDay.icon size={20} className={timeOfDay.color} />
              <h1 className="text-xl font-black text-gray-800 dark:text-slate-100">{timeOfDay.label}, {user.name}!</h1>
            </div>
            <p className="text-sm text-brand-600 dark:text-brand-400 font-medium italic flex items-center gap-1.5">
              <Bot size={16} className="text-brand-500" />
              {randomGreeting}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreateModal()} className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors border border-brand-200/50"><CalendarPlus size={14} /> Tạo CV</button>
          <button onClick={() => navigate('/reports')} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-200/50"><PenTool size={14} /> Báo cáo</button>
          <button onClick={() => navigate('/contracts')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200/50"><FileSignature size={14} /> Hợp đồng</button>
          <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200/50"><Briefcase size={14} /> Dự án</button>
        </div>
      </div>

      {/* Task Stats Row */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Công việc & Hoạt động</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={t('totalTasks')} value={stats.total} icon={ListTodo} color="from-purple-500 to-purple-400" onClick={() => navigate('/tasks')} subtitle={`${stats.inProgress} đang chạy`} delay={0} details={[{ label: 'Đang chạy', value: stats.inProgress, color: 'text-blue-600' }, { label: 'Hoàn thành', value: stats.done, color: 'text-emerald-600' }, { label: 'Trễ hạn', value: stats.overdue, color: 'text-rose-600' }, { label: 'Ưu tiên cao', value: stats.highPriority, color: 'text-orange-600' }]} />
          <StatCard label={t('done')} value={stats.done} icon={CheckCircle2} color="from-success-500 to-success-400" onClick={() => navigate('/tasks')} subtitle={`${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}% hoàn thành`} delay={60} details={[{ label: 'Tỉ lệ', value: `${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%`, color: 'text-emerald-600' }, { label: 'Tổng CV', value: stats.total }]} />
          <StatCard label="Trễ hạn" value={stats.overdue} icon={AlertCircle} color="from-rose-500 to-rose-400" onClick={() => navigate('/tasks')} subtitle={stats.overdue > 0 ? 'Cần xử lý ngay!' : 'Tốt, không có trễ'} alert={true} delay={120} details={[{ label: 'Số CV trễ', value: stats.overdue, color: stats.overdue > 0 ? 'text-rose-600' : 'text-emerald-600' }, { label: 'Trạng thái', value: stats.overdue > 0 ? 'Cần xử lý' : 'Dúng hạn 100%' }]} />
          <StatCard label="Ưu tiên cao" value={stats.highPriority} icon={Flame} color="from-orange-500 to-orange-400" onClick={() => navigate('/tasks')} subtitle={`${stats.total > 0 ? Math.round((stats.highPriority / stats.total) * 100) : 0}% tổng CV`} delay={180} details={[{ label: 'Số lượng', value: stats.highPriority, color: 'text-orange-600' }, { label: 'Tỉ trọng', value: `${stats.total > 0 ? Math.round((stats.highPriority / stats.total) * 100) : 0}%` }]} />
        </div>
      </div>

      {/* Finance & Other Stats Row */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Tài chính & Khác</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Hợp đồng" value={stats.totalContracts} icon={FileSignature} color="from-blue-500 to-blue-400" onClick={() => navigate('/contracts')} subtitle={`${contracts.filter(c => c.status === 'in_progress').length} đang thực hiện`} delay={240} details={[{ label: 'Tổng HĐ', value: stats.totalContracts }, { label: 'Đang thực hiện', value: contracts.filter(c => c.status === 'in_progress').length, color: 'text-blue-600' }, { label: 'Hoàn thành', value: contracts.filter(c => c.status === 'completed').length, color: 'text-emerald-600' }]} />
          <StatCard label="Công nợ (tr)" value={Math.round(stats.totalDebt / 1000000)} icon={Wallet} color="from-teal-500 to-teal-400" onClick={() => navigate('/contracts')} subtitle={`DT: ${Math.round(stats.totalPostTax / 1000000)}tr`} delay={300} details={[{ label: 'Doanh thu', value: `${Math.round(stats.totalPostTax / 1000000)}tr`, color: 'text-emerald-600' }, { label: 'Đã thu', value: `${Math.round(stats.totalPaid / 1000000)}tr`, color: 'text-blue-600' }, { label: 'Công nợ', value: `${Math.round(stats.totalDebt / 1000000)}tr`, color: 'text-rose-600' }]} />
          <StatCard label="Ghi chú" value={stats.myNotes} icon={FileText} color="from-emerald-500 to-emerald-400" onClick={() => navigate('/notes')} subtitle="Ghi chú cá nhân" delay={360} details={[{ label: 'Tổng ghi chú', value: stats.myNotes }]} />
          <StatCard label="Báo cáo chờ" value={stats.pendingReports} icon={Clock} color="from-amber-500 to-amber-400" onClick={() => navigate('/reports')} subtitle="Chờ phê duyệt" alert={true} delay={420} details={[{ label: 'Chờ phê duyệt', value: stats.pendingReports, color: stats.pendingReports > 0 ? 'text-amber-600' : 'text-emerald-600' }]} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-8">

          {/* Overdue Tasks Alert */}
          {overdueTasksList.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-rose-500" />
                  Công việc trễ hạn ({overdueTasksList.length})
                </h2>
              </div>
              <div className="space-y-3 bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                {overdueTasksList.slice(0, 3).map(task => {
                  const canEdit = checkPermission('edit', task, user);
                  const isAssignee = task.assignees.includes(user.id);
                  return (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onClick={() => openEditModal(task)}
                      onCheck={() => handleStatusToggle(task)}
                      canToggle={canEdit || isAssignee}
                      isReadOnly={!canEdit}
                      showDepartment={true}
                      allUsers={users}
                    />
                  );
                })}
                {overdueTasksList.length > 3 && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/tasks')} className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 mt-3">
                    Xem tất cả {overdueTasksList.length} công việc trễ hạn
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Today's Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <ListTodo size={20} className="text-purple-500" />
                {t('todaysSchedule')}
              </h2>
              <button onClick={() => navigate('/tasks')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Xem tất cả <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {todaysTasks.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                  <p className="text-gray-500 dark:text-slate-400 mb-3">
                    {searchQuery ? t('noMatchingTasks') : t('noTasksToday')}
                  </p>
                  {!searchQuery && (
                    <Button variant="secondary" size="sm" onClick={() => openCreateModal()}>
                      <Plus size={16} className="mr-1" /> {t('addTask')}
                    </Button>
                  )}
                </div>
              ) : (
                todaysTasks.map(task => {
                  const canEdit = checkPermission('edit', task, user);
                  const canDelete = checkPermission('delete', task, user);
                  const isAssignee = task.assignees.includes(user.id);
                  return (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onClick={() => openEditModal(task)}
                      onCheck={() => handleStatusToggle(task)}
                      onDelete={canDelete ? () => handleDeleteTask(task.id) : undefined}
                      canToggle={canEdit || isAssignee}
                      isReadOnly={!canEdit}
                      showDepartment={!!(user.permissions?.includes('view_all_tasks') || user.permissions?.includes('manage_dept_tasks'))}
                      allUsers={users}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* Recent Reports */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={20} className="text-amber-500" />
                Hoạt động Báo cáo gần đây
              </h2>
              <button onClick={() => navigate('/reports')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Quản lý Báo cáo <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentReports.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-8 text-center bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                  <p className="text-gray-500 dark:text-slate-400">Chưa có báo cáo nào gần đây</p>
                </div>
              ) : (
                recentReports.map(report => {
                  const author = users.find(u => u.id === report.authorId);
                  return (
                    <div key={report.id} onClick={() => setPopup({
                      title: report.title,
                      navPath: '/reports',
                      navLabel: 'Quản lý Báo cáo',
                      content: (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 mb-4">
                            {author && <Avatar src={author.avatar} alt={author.name} size={8} />}
                            <div><p className="font-bold text-gray-800 dark:text-slate-100">{author?.name || 'Unknown'}</p><p className="text-sm text-gray-400">{report.department}</p></div>
                            <div className="ml-auto">{getReportStatusBadge(report.status)}</div>
                          </div>
                          <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Ngày tạo</span><span className="font-medium">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</span></div>
                          <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Trạng thái</span><span className="font-medium">{report.status}</span></div>
                          {report.content && <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 line-clamp-4">{report.content}</p>}
                        </div>
                      )
                    })} className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {author && <Avatar src={author.avatar} alt={author.name} size={6} />}
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{author?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">{report.department}</p>
                          </div>
                        </div>
                        {getReportStatusBadge(report.status)}
                      </div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200 truncate mb-1">{report.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                        <Clock size={12} /> {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Recent Contracts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileSignature size={20} className="text-blue-500" />
                Hợp đồng gần đây
              </h2>
              <button onClick={() => navigate('/contracts')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Quản lý Hợp đồng <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentContracts.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-8 text-center bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                  <p className="text-gray-500 dark:text-slate-400">Chưa có hợp đồng nào</p>
                </div>
              ) : (
                recentContracts.map(contract => (
                  <div key={contract.id} onClick={() => setPopup({
                    title: contract.clientName,
                    navPath: '/contracts',
                    navLabel: 'Quản lý Hợp đồng',
                    content: (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Số HĐ</span><span className="font-bold">{contract.contractNumber}</span></div>
                        <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Trạng thái</span><span className={`font-bold ${contract.status === 'completed' ? 'text-emerald-600' : contract.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'}`}>{contract.status === 'completed' ? 'Hoàn thành' : contract.status === 'in_progress' ? 'Đang thực hiện' : contract.status === 'pending' ? 'Chờ duyệt' : 'Nhiếu trạng thái'}</span></div>
                        <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Doanh thu</span><span className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.postTaxValue || 0)}</span></div>
                        <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Đã thu</span><span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.paidAmount || 0)}</span></div>
                        <div className="flex justify-between text-sm py-2"><span className="text-gray-500">Công nợ</span><span className="font-bold text-rose-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.max(0, (contract.postTaxValue || 0) - (contract.paidAmount || 0)))}</span></div>
                      </div>
                    )
                  })} className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                          {contract.contractNumber.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate w-32 md:w-48">{contract.clientName}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">Số: {contract.contractNumber}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${contract.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          contract.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            contract.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              contract.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {contract.status === 'completed' ? 'Hoàn thành' :
                          contract.status === 'in_progress' ? 'Đang thực hiện' :
                            contract.status === 'pending' ? 'Chờ duyệt' :
                              contract.status === 'cancelled' ? 'Đã hủy' : 'Nháp'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-3 pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Giá trị</p>
                        <p className="text-sm font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.postTaxValue || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Công nợ</p>
                        <p className="text-sm font-bold text-rose-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.max(0, (contract.postTaxValue || 0) - (contract.paidAmount || 0)))}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>



          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-500" />
                Dự án gần đây
              </h2>
              <button onClick={() => navigate('/projects')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Quản lý DA <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-8 text-center bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                  <p className="text-gray-500 dark:text-slate-400">Chưa có dự án nào</p>
                </div>
              ) : (
                [...projects]
                  .sort((a: any, b: any) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime())
                  .slice(0, 4)
                  .map((project: any) => {
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = project.endDate && project.endDate < today && project.status !== 'completed';
                    const isNear = project.endDate && project.endDate >= today && project.endDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] && project.status !== 'completed';
                    const sColor = project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : project.status === 'on_hold' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
                    const sLabel = project.status === 'completed' ? 'Hoàn thành' : project.status === 'in_progress' ? 'Đang chạy' : project.status === 'on_hold' ? 'Tạm dừng' : project.status === 'planning' ? 'Lên kế hoạch' : 'Nháp';
                    return (
                      <div
                        key={project.id}
                        onClick={() => setPopup({
                          title: project.name,
                          navPath: '/projects',
                          navLabel: 'Quản lý Dự án',
                          content: (
                            <div className="space-y-2">
                              {project.description && <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{project.description}</p>}
                              <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Trạng thái</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${sColor}`}>{sLabel}</span></div>
                              {project.department && <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Phòng ban</span><span className="font-medium">{project.department}</span></div>}
                              {project.startDate && <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Bắt đầu</span><span className="font-medium">{new Date(project.startDate).toLocaleDateString('vi-VN')}</span></div>}
                              {project.endDate && <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Kết thúc</span><span className={`font-bold ${isOverdue ? 'text-rose-600' : isNear ? 'text-amber-600' : ''}`}>{new Date(project.endDate).toLocaleDateString('vi-VN')}{isOverdue ? ' ⚠ Quá hạn' : isNear ? ' ⏰ Sắp hết hạn' : ''}</span></div>}
                              {typeof project.progress === 'number' && <div className="py-2"><div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Tiến độ</span><span className="font-bold text-brand-600">{project.progress}%</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-brand-500 h-2 rounded-full" style={{ width: `${project.progress}%` }} /></div></div>}
                            </div>
                          )
                        })}
                        className={`bg-white dark:bg-slate-800/80 p-4 rounded-xl border hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? 'border-red-200 bg-red-50/20' : isNear ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100 dark:border-slate-700/60'}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100' : isNear ? 'bg-amber-100' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                              <Briefcase size={15} className={isOverdue ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-indigo-600'} />
                            </div>
                            <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{project.name}</p>
                          </div>
                          <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${sColor}`}>{sLabel}</span>
                        </div>
                        {project.description && <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-1 mb-2">{project.description}</p>}
                        <div className="flex items-center justify-between text-xs mt-1">
                          {project.department ? <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded font-medium text-gray-500 dark:text-slate-400">{project.department}</span> : <span />}
                          {project.endDate && <span className={isOverdue ? 'text-rose-600 font-medium' : isNear ? 'text-amber-600 font-medium' : 'text-gray-400'}>Hạn: {new Date(project.endDate).toLocaleDateString('vi-VN')}</span>}
                        </div>
                        {typeof project.progress === 'number' && (
                          <div className="mt-3 w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${project.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${project.progress}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </section>

          {/* Notes Preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={20} className="text-emerald-500" />
                {t('quickNotes')}
              </h2>
              <button onClick={() => navigate('/notes')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Ghi chú <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.slice(0, 3).map((note: Note) => (
                <div key={note.id} onClick={() => setPopup({ title: note.title || 'Ghi chú', navPath: '/notes', navLabel: 'Xem tất cả ghi chú', content: <div><p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap">{note.content}</p></div> })} className={`${note.color} dark:opacity-90 p-4 rounded-xl border border-black/5 dark:border-white/10 cursor-pointer hover:shadow-md transition-all h-32 flex flex-col`}>
                  <h4 className="font-bold text-gray-800 mb-2 truncate">{note.title || 'Untitled Note'}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3 flex-1">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && !searchQuery && (
                <div onClick={() => navigate('/notes')} className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-800/60 p-6 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-center text-sm text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Plus size={20} className="mx-auto mb-2 text-gray-400 dark:text-slate-500" />
                  {t('createNote')}
                </div>
              )}
            </div>
          </section>

          {/* Projects Summary Widget */}
          {projects.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase size={20} className="text-indigo-500" />
                  Dự án ({projects.length})
                </h2>
                <button onClick={() => navigate('/projects')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  Quản lý DA <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const active = projects.filter(p => p.status === 'in_progress');
                  const overdue = projects.filter(p => p.endDate && p.endDate < today && p.status !== 'completed');
                  const nearDeadline = projects.filter(p => p.endDate && p.endDate >= today && p.endDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] && p.status !== 'completed');
                  return (
                    <>
                      <div onClick={() => setPopup({ title: 'Dự án đang chạy', navPath: '/projects', navLabel: 'Quản lý Dự án', content: <div className="space-y-2"><div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Tổng dự án</span><span className="font-bold">{projects.length}</span></div><div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700"><span className="text-gray-500">Đang chạy</span><span className="font-bold text-indigo-600">{active.length}</span></div>{active.slice(0, 3).map(p => <div key={p.id} className="py-2 border-b border-gray-50 last:border-0"><p className="text-sm font-medium text-gray-700 truncate">{p.name}</p><p className="text-xs text-gray-400">{p.department || ''}</p></div>)}</div> })} className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center"><Briefcase size={20} className="text-indigo-600" /></div>
                          <div><p className="text-2xl font-black text-gray-800 dark:text-slate-100">{active.length}</p><p className="text-[10px] text-gray-500 font-bold uppercase">Đang chạy</p></div>
                        </div>
                        <div className="text-xs text-gray-400">Tổng: {projects.length} dự án</div>
                      </div>
                      <div onClick={() => setPopup({ title: 'Sắp hết hạn (7 ngày)', navPath: '/projects', navLabel: 'Quản lý Dự án', content: <div className="space-y-2">{nearDeadline.length === 0 ? <p className="text-sm text-gray-400 text-center py-2">Không có dự án sắp hết hạn</p> : nearDeadline.map(p => <div key={p.id} className="py-2 border-b border-gray-100 last:border-0"><p className="text-sm font-medium text-gray-700 truncate">{p.name}</p><p className="text-xs text-amber-600 font-medium">Hạn: {p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : ''}</p></div>)}</div> })} className={`bg-white dark:bg-slate-800/80 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer group ${nearDeadline.length > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 dark:border-slate-700/60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${nearDeadline.length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}><Clock size={20} className={nearDeadline.length > 0 ? 'text-amber-600' : 'text-gray-400'} /></div>
                          <div><p className="text-2xl font-black text-gray-800 dark:text-slate-100">{nearDeadline.length}</p><p className="text-[10px] text-gray-500 font-bold uppercase">Sắp hết hạn</p></div>
                        </div>
                        {nearDeadline.length > 0 && <div className="text-[11px] text-amber-600 font-medium truncate">{nearDeadline[0].name}</div>}
                      </div>
                      <div onClick={() => setPopup({ title: 'Dự án quá hạn', navPath: '/projects', navLabel: 'Quản lý Dự án', content: <div className="space-y-2">{overdue.length === 0 ? <p className="text-sm text-gray-400 text-center py-2">Không có dự án quá hạn</p> : overdue.map(p => <div key={p.id} className="py-2 border-b border-gray-100 last:border-0"><p className="text-sm font-medium text-gray-700 truncate">{p.name}</p><p className="text-xs text-rose-600 font-medium">Hạn: {p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : ''}</p></div>)}</div> })} className={`bg-white dark:bg-slate-800/80 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer group ${overdue.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100 dark:border-slate-700/60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overdue.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}><AlertTriangle size={20} className={overdue.length > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'} /></div>
                          <div><p className="text-2xl font-black text-gray-800 dark:text-slate-100">{overdue.length}</p><p className="text-[10px] text-gray-500 font-bold uppercase">Quá hạn</p></div>
                        </div>
                        {overdue.length > 0 && <div className="text-[11px] text-red-600 font-medium truncate">{overdue[0].name}</div>}
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>
          )}

        </div>

        {/* Side Column */}
        <div className="space-y-6">

          {/* Upcoming Meetings Widget */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Video size={18} className="text-brand-500" /> Lịch họp hôm nay
              </h3>
            </div>
            <div className="space-y-3">
              {todayUpcomingMeetings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">Không có cuộc họp nào sắp tới trong hôm nay.</p>
              ) : (
                todayUpcomingMeetings.slice(0, 3).map(meeting => (
                  <div key={meeting.id} className="p-3 bg-brand-50 dark:bg-blue-900/30 rounded-xl border border-brand-100 dark:border-blue-700/40 flex items-start gap-3">
                    <div className="mt-0.5 bg-white dark:bg-slate-700 p-2 rounded-lg text-brand-600 shadow-sm">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate mb-0.5">{meeting.title}</h4>
                      <p className="text-xs text-brand-600 font-medium mb-2">
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </p>
                      <Button size="sm" onClick={() => navigate('/meetings')} className="w-full text-xs h-7 shadow-none">
                        Vào phòng họp
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Weekly Progress */}
          <Card className="p-6 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setPopup({ title: t('weeklyProgress'), navPath: '/tasks', navLabel: 'Xem tất cả công việc', content: <div className="space-y-3">{chartData.map((d, i) => <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: d.color }}></div><span className="text-sm text-gray-600">{d.name}</span></div><span className="font-bold text-gray-800">{d.value}</span></div>)}</div> })}>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4">{t('weeklyProgress')}</h3>
            <div className="relative" style={{ height: 192 }}>
              {stats.total === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Chưa có công việc nào
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={192} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-gray-800 dark:text-slate-100">{Math.round((stats.done / (stats.total || 1)) * 100)}%</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{t('done')}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Priority Distribution */}
          <Card className="p-6 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setPopup({ title: 'Mức độ ưu tiên', navPath: '/tasks', navLabel: 'Xem công việc', content: <div className="space-y-3">{priorityChartData.map((d, i) => <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: d.fill }}></div><span className="text-sm text-gray-600">{d.name}</span></div><span className="font-bold text-gray-800">{d.value}</span></div>)}</div> })}>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4">Mức độ ưu tiên</h3>
            <div className="relative" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Finance Analytics */}
          <Card className="p-6 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setPopup({ title: 'Tình hình tài chính', navPath: '/contracts', navLabel: 'Xem hợp đồng', content: <div className="space-y-2">{financeChartData.map((d, i) => <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: d.fill }}></div><span className="text-sm text-gray-600">{d.name}</span></div><span className="font-bold" style={{ color: d.fill }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.value)}</span></div>)}</div> })}>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-500" /> Tình hình tài chính
            </h3>
            <div className="relative" style={{ height: 200 }}>
              {stats.totalPostTax === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Chưa có dữ liệu tài chính
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}tr`} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value))}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Team Widget */}
          <Card className="p-6 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setPopup({ title: 'Đội ngũ - ' + (user.department || 'Phòng ban'), navPath: '/team', navLabel: 'Xem đội ngũ', content: <div className="space-y-3">{(() => { const deptUsers = users.filter(u => u.department === user.department); return <div className="space-y-1">{deptUsers.map(u => <div key={u.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"><div className="flex items-center gap-2"><Avatar src={u.avatar} alt={u.name} size={6} /><span className="text-sm font-medium text-gray-700">{u.name}</span></div><span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{u.role}</span></div>)}</div>; })()}</div> })}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-100">{t('team')}</h3>
              <span className="text-xs font-bold text-brand-600 dark:text-blue-400 bg-brand-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">{users.filter(u => u.department === user.department).length} thành viên</span>
            </div>
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {(() => {
                const myDeptUsers = users.filter(u => u.department === user.department);
                if (myDeptUsers.length === 0) return <p className="text-sm text-gray-500 text-center py-4">Chưa có thành viên</p>;
                return (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-slate-700 pb-1">
                      {user.department || 'Phòng ban'}
                    </p>
                    <div className="flex flex-col gap-2">
                      {myDeptUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2">
                            <Avatar src={u.avatar} alt={u.name} size={7} />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-blue-400 transition-colors">{u.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={u.role}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
