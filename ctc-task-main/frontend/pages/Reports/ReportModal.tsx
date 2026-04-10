import React, { useState, useEffect } from 'react';
import { X, Wand2, FileText, Send, Save, CheckCircle, XCircle } from 'lucide-react';
import { Button, Input } from '../../components/UI';
import { Report, ReportStatus, Task, TaskStatus, User } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (r: Report) => void;
  initialReport: Report | null;
  currentUser: User;
  tasks: Task[];
  t: (key: string) => string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialReport,
  currentUser,
  tasks,
  t
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [directorFeedback, setDirectorFeedback] = useState('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const myTasks = React.useMemo(() => {
    return tasks.filter(t => t.assignees.includes(currentUser.id));
  }, [tasks, currentUser.id]);
  
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        setTitle(initialReport.title);
        setContent(initialReport.content);
        setDirectorFeedback(initialReport.directorFeedback || '');
      } else {
        const d = new Date();
        const weekNum = Math.ceil(d.getDate() / 7);
        const monthNum = d.getMonth() + 1;
        setTitle(`Báo cáo tuần ${weekNum} tháng ${monthNum} - ${currentUser.name}`);
        setContent('');
        setDirectorFeedback('');
        setShowTaskSelector(false);
        setSelectedTaskIds(new Set());
      }
    }
  }, [isOpen, initialReport, currentUser.name]);

  const autoGenerateContent = () => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    const myTasks = tasks.filter(task => 
      task.assignees.includes(currentUser.id) &&
      new Date(task.startDate) >= oneWeekAgo &&
      new Date(task.startDate) <= today
    );
    
    const doneTasks = myTasks.filter(t => t.status === TaskStatus.DONE);
    const inProgressTasks = myTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    
    let generated = `### Công việc đã hoàn thành trong tuần:\n`;
    if (doneTasks.length === 0) generated += `- Không có công việc hoàn thành.\n`;
    doneTasks.forEach(task => {
      generated += `- [x] ${task.title}\n`;
    });
    
    generated += `\n### Công việc đang thực hiện:\n`;
    if (inProgressTasks.length === 0) generated += `- Không có công việc đang thực hiện.\n`;
    inProgressTasks.forEach(task => {
      generated += `- [ ] ${task.title}\n`;
    });
    
    generated += `\n### Đề xuất / Khó khăn:\n- \n`;
    
    setContent(generated);
  };

  const handleToggleTaskSelection = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
  };

  const handleAppendSelectedTasks = () => {
    const selectedTasks = myTasks.filter(t => selectedTaskIds.has(t.id));
    if (selectedTasks.length === 0) return;
    
    const doneTasks = selectedTasks.filter(t => t.status === TaskStatus.DONE);
    const inProgressTasks = selectedTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    
    let generated = content + (content ? '\n\n' : '');
    generated += `### Công việc đã chọn:\n`;
    doneTasks.forEach(t => generated += `- [x] ${t.title}\n`);
    inProgressTasks.forEach(t => generated += `- [ ] ${t.title}\n`);
    
    setContent(generated);
    setShowTaskSelector(false);
    setSelectedTaskIds(new Set());
  };

  if (!isOpen) return null;

  const isReadOnly = !!(initialReport && initialReport.status !== 'Draft' && initialReport.authorId !== currentUser.id);
  const isManagerReview = !!(initialReport && initialReport.status === 'Pending' && currentUser.role === 'Manager' && currentUser.department === initialReport.department);
  const isDirectorReview = !!(initialReport && initialReport.authorId !== currentUser.id && (currentUser.role === 'Director' || currentUser.role === 'Admin'));

  const handleSave = (statusToSet: ReportStatus) => {
    const report: Report = {
      id: initialReport?.id || Math.random().toString(36).substring(2, 9),
      title,
      content,
      authorId: currentUser.id,
      department: currentUser.department,
      status: statusToSet,
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      submittedAt: statusToSet === 'Pending' ? new Date().toISOString() : initialReport?.submittedAt,
      directorFeedback,
    };
    onSave(report);
    onClose();
  };

  const handleManagerAction = (statusToSet: ReportStatus) => {
    if (!initialReport) return;
    const updated: Report = {
      ...initialReport,
      status: statusToSet,
      approvedAt: statusToSet === 'Approved' ? new Date().toISOString() : undefined,
      approvedBy: statusToSet === 'Approved' ? currentUser.id : undefined,
      directorFeedback,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <FileText className="text-brand-500" size={20} />
            <h2 className="text-xl font-bold">{initialReport ? 'Chi tiết Báo Cáo' : 'Tạo Báo Cáo Mới'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề báo cáo</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Nhập tiêu đề..." 
              required 
              disabled={isReadOnly}
            />
          </div>
          
          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Nội dung công việc</label>
              {!isReadOnly && (
                <button 
                  type="button" 
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded"
                >
                  <Wand2 size={12} /> Lấy công việc từ danh sách
                </button>
              )}
            </div>

            {showTaskSelector && !isReadOnly && (
              <div className="mb-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-48">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  Chọn công việc để đưa vào báo cáo
                </div>
                <div className="overflow-y-auto p-2 flex-1">
                  {myTasks.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2 text-center">Không có công việc nào.</div>
                  ) : (
                    myTasks.map(task => (
                      <label key={task.id} className="flex items-center gap-3 p-2 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedTaskIds.has(task.id)} 
                          onChange={() => handleToggleTaskSelection(task.id)}
                          className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{task.title}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === TaskStatus.DONE ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {task.status === TaskStatus.DONE ? 'Đã xong' : 'Đang làm'}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowTaskSelector(false)}>Đóng</Button>
                  <Button size="sm" onClick={handleAppendSelectedTasks}>Đưa vào văn bản</Button>
                </div>
              </div>
            )}

            <textarea
              className="w-full flex-1 min-h-[250px] p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nhập chi tiết công việc, tiến độ và đề xuất..."
              disabled={isReadOnly}
            />
          </div>

          {(initialReport?.directorFeedback || isDirectorReview) && (
            <div className="flex-1 flex flex-col min-h-[150px] mb-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <label className="block text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                Ý kiến Giám đốc (Feedback)
              </label>
              <textarea
                className="w-full flex-1 min-h-[100px] p-3 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-blue-900"
                value={directorFeedback}
                onChange={e => setDirectorFeedback(e.target.value)}
                placeholder="Nhập nhận xét của Giám đốc..."
                disabled={!isDirectorReview}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Huỷ bỏ</Button>
          
          {!isReadOnly && !isManagerReview && (
            <>
              <Button variant="secondary" onClick={() => handleSave('Draft')}>
                <Save size={16} className="mr-2" /> Lưu Nháp
              </Button>
              <Button onClick={() => handleSave(currentUser.role === 'Manager' ? 'Approved' : 'Pending')}>
                <Send size={16} className="mr-2" /> Gửi Báo Cáo
              </Button>
            </>
          )}

          {isManagerReview && (
            <>
              <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleManagerAction('Rejected')}>
                <XCircle size={16} className="mr-2" /> Từ chối
              </Button>
              <Button onClick={() => handleManagerAction('Approved')} className="bg-success-500 hover:bg-success-600 text-white border-0">
                <CheckCircle size={16} className="mr-2" /> Duyệt & Gửi Giám Đốc
              </Button>
            </>
          )}

          {isDirectorReview && (
            <Button onClick={() => handleManagerAction(initialReport.status)} className="bg-brand-600 hover:bg-brand-700 text-white border-0">
              <Save size={16} className="mr-2" /> Lưu Nhận Xét
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
