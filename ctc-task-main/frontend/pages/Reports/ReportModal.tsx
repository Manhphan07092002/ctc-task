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
  
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        setTitle(initialReport.title);
        setContent(initialReport.content);
      } else {
        const d = new Date();
        const weekNum = Math.ceil(d.getDate() / 7);
        const monthNum = d.getMonth() + 1;
        setTitle(`Báo cáo tuần ${weekNum} tháng ${monthNum} - ${currentUser.name}`);
        setContent('');
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

  if (!isOpen) return null;

  const isReadOnly = !!(initialReport && initialReport.status !== 'Draft' && initialReport.authorId !== currentUser.id);
  const isManagerReview = !!(initialReport && initialReport.status === 'Pending' && currentUser.role === 'Manager' && currentUser.department === initialReport.department);

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
                  onClick={autoGenerateContent}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded"
                >
                  <Wand2 size={12} /> Tự động trích xuất công việc tuần này
                </button>
              )}
            </div>
            <textarea
              className="w-full flex-1 min-h-[250px] p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nhập chi tiết công việc, tiến độ và đề xuất..."
              disabled={isReadOnly}
            />
          </div>
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
        </div>
      </div>
    </div>
  );
};
