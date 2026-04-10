
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'vi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    tasks: 'My Tasks',
    notes: 'Notes',
    team: 'Team',
    settings: 'Settings',
    reports: 'Reports',
    admin: 'Admin Dashboard',
    // Header
    search: 'Search...',
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    // Stats
    totalTasks: 'Total Tasks',
    done: 'Done',
    inProgress: 'In Progress',
    highPriority: 'High Priority',
    // Dashboard
    todaysSchedule: "Today's Schedule",
    viewAll: 'View All',
    quickNotes: 'Quick Notes',
    viewNotes: 'View Notes',
    weeklyProgress: 'Weekly Progress',
    manageTeam: 'Manage Team',
    noTasksToday: 'No tasks scheduled for today.',
    noMatchingTasks: 'No matching tasks found.',
    addTask: 'Add Task',
    addNote: 'Add Note',
    createNote: 'Create New Note',
    // Task List
    priority: 'Priority',
    status: 'Status',
    taskDetails: 'Task Details',
    deleteTask: 'Delete Task',
    // Common
    cancel: 'Cancel',
    save: 'Save Changes',
    create: 'Create',
    delete: 'Delete',
    edit: 'Edit',
    filter: 'Filter:',
    clear: 'Clear',
    today: 'Today',
    // Team
    teamMembers: 'Team Members',
    inviteMember: 'Invite Member',
    inviteColleague: 'Invite Colleague',
    roleOwner: 'Owner',
    roleMember: 'Member',
    // Task Modal
    newTask: 'Create New Task',
    editTaskHeader: 'Edit Task',
    taskTitle: 'Task Title',
    taskPlaceholder: 'What needs to be done?',
    description: 'Description',
    descPlaceholder: 'Add details...',
    startDate: 'Start Date',
    dueDate: 'Due Date',
    estCompletion: 'Est. Completion',
    repeat: 'Repeat',
    assignees: 'Assign Team Members',
    checklist: 'Checklist',
    addSubtasks: 'Add Subtasks only',
    addTag: 'Add tag...',
    comments: 'Comments',
    writeComment: 'Write a comment... (use @ to mention)',
    aiAutoFill: 'AI Auto-fill',
    // Settings
    myProfile: 'My Profile',
    notifications: 'Notifications',
    appearance: 'Appearance',
    security: 'Security',
    darkMode: 'Dark Mode',
    // AI
    aiGreeting: "Hello! I'm OrangeBot 🍊, your productivity partner. I'm here to help you organize tasks, stay focused, and get more done. Let's make today productive! How can I help you?",
    askAi: 'Ask AI',
    aiSummary: 'AI Daily Summary',
    aiLoading: 'Thinking...',
    // Meetings
    meetings: 'Meetings',
    manageMeetingsDesc: 'Schedule and join online video meetings with your team.',
    newMeeting: 'New Meeting',
    scheduleMeeting: 'Schedule Meeting',
    noMeetings: 'No meetings scheduled yet.',
    participants: 'Participants',
    join: 'Join',
    noDescription: 'No description provided.',
    meetingTitle: 'Meeting Title',
    meetingTitlePlaceholder: 'e.g. Project Sync',
    meetingDescriptionPlaceholder: 'What is this meeting about?',
    startTime: 'Start Time',
    endTime: 'End Time',
    inviteParticipants: 'Invite Participants',
    schedule: 'Schedule',
    scheduling: 'Scheduling...',
    chat: 'Chat',
    sendAMessage: 'Send a message...',
    noMessagesYet: 'No messages yet. Start the conversation!',
    leave: 'Leave',
    you: 'You',
    quickMeeting: 'Quick Meeting',
    startNow: 'Start Now',
    confirmDelete: 'Confirm Delete',
    confirmDeleteTask: 'Are you sure you want to delete this task? This action cannot be undone.',
    confirmDeleteNote: 'Are you sure you want to delete this note?',
    confirmDeleteUser: 'Are you sure you want to remove this user from the team?',
    cannotDeleteSelf: 'You cannot delete your own account.',
    // Enums
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Todo': 'Todo',
    'In Progress': 'In Progress',
    'Done': 'Done',
    'None': 'None',
    'Daily': 'Daily',
    'Weekly': 'Weekly',
    'Monthly': 'Monthly',
    // Modal UI
    addAnItem: 'Add an item...',
    noEligibleUsers: 'No eligible users to assign.',
    noCommentsYet: 'No comments yet.',
    suggestedMembers: 'Suggested Members',
    createdBy: 'Created by',
  },
  vi: {
    // Navigation
    dashboard: 'Tổng quan',
    calendar: 'Lịch',
    tasks: 'Công việc',
    notes: 'Ghi chú',
    team: 'Đội ngũ',
    settings: 'Cài đặt',
    reports: 'Báo cáo',
    admin: 'Quản trị viên',
    // Header
    search: 'Tìm kiếm...',
    goodMorning: 'Chào buổi sáng',
    goodAfternoon: 'Chào buổi chiều',
    goodEvening: 'Chào buổi tối',
    // Stats
    totalTasks: 'Tổng công việc',
    done: 'Hoàn thành',
    inProgress: 'Đang làm',
    highPriority: 'Ưu tiên cao',
    // Dashboard
    todaysSchedule: "Lịch trình hôm nay",
    viewAll: 'Xem tất cả',
    quickNotes: 'Ghi chú nhanh',
    viewNotes: 'Xem ghi chú',
    weeklyProgress: 'Tiến độ tuần',
    manageTeam: 'Quản lý nhóm',
    noTasksToday: 'Không có công việc nào hôm nay.',
    noMatchingTasks: 'Không tìm thấy công việc phù hợp.',
    addTask: 'Thêm việc',
    addNote: 'Thêm ghi chú',
    createNote: 'Tạo ghi chú mới',
    // Task List
    priority: 'Độ ưu tiên',
    status: 'Trạng thái',
    taskDetails: 'Chi tiết công việc',
    deleteTask: 'Xóa công việc',
    // Common
    cancel: 'Hủy',
    save: 'Lưu thay đổi',
    create: 'Tạo mới',
    delete: 'Xóa',
    edit: 'Sửa',
    filter: 'Lọc:',
    clear: 'Xóa lọc',
    today: 'Hôm nay',
    // Team
    teamMembers: 'Thành viên nhóm',
    inviteMember: 'Mời thành viên',
    inviteColleague: 'Mời đồng nghiệp',
    roleOwner: 'Trưởng nhóm',
    roleMember: 'Thành viên',
    // Task Modal
    newTask: 'Tạo công việc mới',
    editTaskHeader: 'Chỉnh sửa công việc',
    taskTitle: 'Tiêu đề công việc',
    taskPlaceholder: 'Cần làm gì?',
    description: 'Mô tả',
    descPlaceholder: 'Thêm chi tiết...',
    startDate: 'Ngày bắt đầu',
    dueDate: 'Hạn chót',
    estCompletion: 'Dự kiến xong',
    repeat: 'Lặp lại',
    assignees: 'Phân công thành viên',
    checklist: 'Các bước thực hiện',
    addSubtasks: 'Thêm việc phụ',
    addTag: 'Thêm thẻ...',
    comments: 'Bình luận',
    writeComment: 'Viết bình luận... (dùng @ để nhắc tên)',
    aiAutoFill: 'AI Tự điền',
    // Settings
    myProfile: 'Hồ sơ của tôi',
    notifications: 'Thông báo',
    appearance: 'Giao diện',
    security: 'Bảo mật',
    darkMode: 'Chế độ tối',
    // AI
    aiGreeting: "Xin chào! Tôi là OrangeBot 🍊, trợ lý năng suất của bạn. Tôi ở đây để giúp bạn sắp xếp công việc, tập trung và hoàn thành mục tiêu. Hãy cùng làm việc thật hiệu quả nhé! Tôi có thể giúp gì cho bạn?",
    askAi: 'Hỏi AI',
    aiSummary: 'AI Tóm tắt ngày',
    aiLoading: 'Đang suy nghĩ...',
    // Meetings
    meetings: 'Cuộc họp',
    manageMeetingsDesc: 'Lên lịch và tham gia các cuộc họp video trực tuyến với nhóm của bạn.',
    newMeeting: 'Cuộc họp mới',
    scheduleMeeting: 'Lên lịch cuộc họp',
    noMeetings: 'Chưa có cuộc họp nào được lên lịch.',
    participants: 'Thành viên',
    join: 'Tham gia',
    noDescription: 'Không có mô tả.',
    meetingTitle: 'Tiêu đề cuộc họp',
    meetingTitlePlaceholder: 'VD: Họp tiến độ dự án',
    meetingDescriptionPlaceholder: 'Cuộc họp này về vấn đề gì?',
    startTime: 'Thời gian bắt đầu',
    endTime: 'Thời gian kết thúc',
    inviteParticipants: 'Mời thành viên tham gia',
    schedule: 'Lên lịch',
    scheduling: 'Đang lên lịch...',
    chat: 'Trò chuyện',
    sendAMessage: 'Gửi tin nhắn...',
    noMessagesYet: 'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!',
    leave: 'Rời khỏi',
    you: 'Bạn',
    quickMeeting: 'Họp nhanh',
    startNow: 'Bắt đầu ngay',
    confirmDelete: 'Xác nhận xóa',
    confirmDeleteTask: 'Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác.',
    confirmDeleteNote: 'Bạn có chắc chắn muốn xóa ghi chú này?',
    confirmDeleteUser: 'Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?',
    cannotDeleteSelf: 'Bạn không thể xóa tài khoản của chính mình.',
    // Enums
    'Low': 'Thấp',
    'Medium': 'Trung bình',
    'High': 'Cao',
    'Todo': 'Cần làm',
    'In Progress': 'Đang làm',
    'Done': 'Hoàn thành',
    'None': 'Không lặp lại',
    'Daily': 'Hằng ngày',
    'Weekly': 'Hằng tuần',
    'Monthly': 'Hằng tháng',
    // Modal UI
    addAnItem: 'Thêm mục mới...',
    noEligibleUsers: 'Không có người dùng phù hợp để giao việc.',
    noCommentsYet: 'Chưa có bình luận nào.',
    suggestedMembers: 'Thành viên đề xuất',
    createdBy: 'Tạo bởi',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to Vietnamese ('vi')
  const [language, setLanguage] = useState<Language>('vi');

  const t = (key: string): string => {
    const dict = translations[language] as Record<string, string>;
    return dict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
