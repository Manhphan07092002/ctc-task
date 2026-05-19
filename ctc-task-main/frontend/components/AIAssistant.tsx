
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2, Trash2, Calendar, CheckSquare, FileText, ChevronRight, Mic, MicOff } from 'lucide-react';
import { Button } from './UI';
import { createChatSession } from '../services/aiService';
import { GenerateContentResponse } from "@google/genai";
import { Task } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { apiFetch } from '../services/api';
import { getMeetings, saveMeeting, deleteMeeting } from '../services/meetingService';
interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  uiContent?: {
    type: 'task' | 'meeting' | 'note' | 'contract';
    data: any;
  };
}

export interface AIAssistantHandle {
  summarizeTasks: (tasks: Task[]) => void;
}

export const AIAssistant = forwardRef<AIAssistantHandle, {}>((_, ref) => {
  const { t } = useLanguage();
  const { tasks, notes, revenueReports, saveTask, saveReport, saveContract, deleteTask, saveNote, deleteNote, users } = useData();
  const { notifications, markRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
  }, [messages]);
  
  // Initial greeting effect - handles language switch for the welcome message too
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ id: 'welcome', role: 'model', text: t('aiGreeting') }];
      }
      // Optional: Update the welcome message if language changes and conversation hasn't started
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{ ...prev[0], text: t('aiGreeting') }];
      }
      return prev;
    });
  }, [t]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev ? prev + ' ' + transcript : transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Khuyên dùng Google Chrome).');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getSuggestions = () => {
    switch (location.pathname) {
      case '/':
        return ["Tóm tắt công việc hôm nay", "Có thông báo nào mới không?"];
      case '/tasks':
        return ["Tôi có công việc nào quá hạn không?", "Tạo một công việc mới"];
      case '/calendar':
      case '/meetings':
        return ["Hôm nay có cuộc họp nào không?", "Lên lịch một cuộc họp nhanh"];
      case '/revenue':
      case '/reports':
        return ["Tổng doanh thu gần đây là bao nhiêu?", "Phân tích các báo cáo"];
      default:
        return ["Tôi có thể giúp gì cho bạn?", "Tóm tắt thông báo mới"];
    }
  };

  const buildContextString = async () => {
    let events: any[] = [];
    try {
      const res = await apiFetch('/api/events');
      events = await res.json();
    } catch (e) {}

    let recentEmails: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await apiFetch('/api/mail/inbox?folder=inbox&page=1&limit=5', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        recentEmails = await res.json();
      }
    } catch (e) {}

    let meetings: any[] = [];
    try {
      meetings = await getMeetings();
    } catch (e) {}

    const today = new Date();
    const todayStr = today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayIso = today.toISOString().split('T')[0];
    
    const upcomingEvents = events.filter((e: any) => e.date >= todayIso).slice(0, 5);
    const eventsContext = upcomingEvents.length > 0 
      ? upcomingEvents.map(e => `- ${e.title} (${e.date})`).join('\n')
      : "Không có sự kiện sắp tới.";

    const activeTasks = tasks.filter(t => t.status !== 'Done' && t.assignees.includes(user?.id || ''));
    const tasksContext = activeTasks.length > 0
      ? activeTasks.map(t => `- [ID: ${t.id}] ${t.title} (Hạn: ${t.dueDate || t.startDate}, Ưu tiên: ${t.priority})`).join('\n')
      : "Không có công việc nào đang chờ xử lý.";

    const emailsContext = recentEmails.length > 0
      ? recentEmails.map(e => `- Từ: ${e.fromName || e.from} - Chủ đề: "${e.subject || '(Không có tiêu đề)'}" (${e.isRead ? 'Đã đọc' : 'Chưa đọc'})`).join('\n')
      : "Không tải được thư hoặc hộp thư trống.";

    const unreadNotifications = notifications.filter(n => !n.isRead).slice(0, 5);
    const notificationsContext = unreadNotifications.length > 0
      ? unreadNotifications.map(n => `- [ID: ${n.id}] [${n.type}] ${n.title}: ${n.message}`).join('\n')
      : "Không có thông báo mới.";

    const topNotes = notes.slice(0, 3);
    const notesContext = topNotes.length > 0
      ? topNotes.map(n => `- [ID: ${n.id}] ${n.title}`).join('\n')
      : "Không có ghi chú nào.";

    const upcomingMeetings = meetings.filter(m => m.startTime >= todayIso).slice(0, 3);
    const meetingsContext = upcomingMeetings.length > 0
      ? upcomingMeetings.map(m => `- [ID: ${m.id}] ${m.title} (Lúc: ${new Date(m.startTime).toLocaleString('vi-VN')})`).join('\n')
      : "Không có lịch họp sắp tới.";

    const topRevenue = revenueReports.slice(0, 2);
    const revenueContext = topRevenue.length > 0
      ? topRevenue.map(r => `- Báo cáo "${r.title}": Tổng doanh thu trước thuế ${r.totalPreTax.toLocaleString('vi-VN')} VNĐ`).join('\n')
      : "Không có báo cáo doanh thu gần đây.";

    const usersContext = users?.length > 0 
      ? users.map(u => `- ${u.name} (Phòng: ${u.department})`).join('\n')
      : "Không có nhân sự nào.";

    return `DỮ LIỆU NGỮ CẢNH CỦA NGƯỜI DÙNG:\n- Hôm nay là: ${todayStr}\n- Tên người dùng: ${user?.name || 'Khách'}\n- Danh sách nhân sự trong công ty:\n${usersContext}\n- Danh sách sự kiện:\n${eventsContext}\n- Danh sách công việc chưa hoàn thành:\n${tasksContext}\n- Thông báo mới:\n${notificationsContext}\n- Lịch họp:\n${meetingsContext}\n- Ghi chú gần đây:\n${notesContext}\n- Doanh thu gần đây:\n${revenueContext}\n- Danh sách 5 email mới nhất:\n${emailsContext}`;
  };

  useImperativeHandle(ref, () => ({
    summarizeTasks: (tasks: Task[]) => {
      setIsOpen(true);
      setIsMinimized(false);
      triggerSummary(tasks);
    }
  }));

  useEffect(() => {
    const initChat = async () => {
      if (isOpen && !chatSessionRef.current) {
        try {
          const contextString = await buildContextString();
          chatSessionRef.current = await createChatSession(contextString);
        } catch (e) {
          // AI not configured, silently skip
        }
      }
    };
    initChat();
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const triggerSummary = async (tasks: Task[]) => {
    if (isLoading) return;

    const taskListStr = tasks.length > 0 
      ? tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Status: ${t.status})`).join('\n')
      : "No tasks scheduled.";

    const displayPrompt = t('aiSummary') + " 📋";
    // The prompt sent to the model includes the data context
    const hiddenSystemPrompt = `Here is my task list for today:\n${taskListStr}\n\nPlease provide a concise, energetic summary of my workload. Identify the highest priority items I should focus on first, and end with a short motivational boost.`;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: displayPrompt };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        const contextString = await buildContextString();
        const history = messages.filter(m => m.id !== 'welcome' && !m.text.includes('✅') && !m.text.includes('❌'));
        chatSessionRef.current = await createChatSession(contextString, history);
      }

      const result = await chatSessionRef.current.sendMessageStream({ message: hiddenSystemPrompt });
      
      let fullResponse = "";
      const modelMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
            fullResponse += c.text;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMsgId ? { ...msg, text: fullResponse } : msg
            ));
        }
      }

    } catch (error: any) {
      const isNoKey = error?.message?.includes('No Gemini API keys');
      const is429 = error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (!isNoKey && !is429) console.error("Chat error:", error);
      const errText = isNoKey
        ? '⚠️ Tính năng AI chưa được cấu hình. Vui lòng thêm Gemini API Key trong phần Cài đặt Admin.'
        : is429
        ? '⏳ API Key đã vượt giới hạn miễn phí. Vui lòng thử lại sau ít phút hoặc nâng cấp quota tại ai.google.dev.'
        : 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại.';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errText }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const textToSubmit = textOverride || inputValue;
    if (!textToSubmit.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSubmit };
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInputValue('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        const contextString = await buildContextString();
        const history = messages.filter(m => m.id !== 'welcome' && !m.text.includes('✅') && !m.text.includes('❌'));
        chatSessionRef.current = await createChatSession(contextString, history);
      }

      const result = await chatSessionRef.current.sendMessageStream({ message: textToSubmit });
      
      let fullResponse = "";
      const modelMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        
        if (c.functionCalls && c.functionCalls.length > 0) {
          for (const call of c.functionCalls) {
            const args = call.args as any;
            
            if (call.name === 'createTask') {
              const newTask: any = {
                id: crypto.randomUUID(),
                title: args.title,
                description: args.description || '',
                priority: args.priority || 'Medium',
                status: 'Todo',
                startDate: new Date().toISOString(),
                assignees: [user?.id || ''],
                createdBy: user?.id || '',
                department: user?.department || '',
              };
              await saveTask(newTask);
              setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                text: `✅ Đã tạo công việc: **${args.title}**`,
                uiContent: { type: 'task', data: newTask }
              }]);
            } else if (call.name === 'createReport') {
              const newReport: any = {
                id: crypto.randomUUID(),
                title: args.title,
                content: args.content,
                authorId: user?.id || '',
                department: user?.department || '',
                status: 'Draft',
                createdAt: new Date().toISOString(),
              };
              await saveReport(newReport);
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo báo cáo (Nháp): **${args.title}**. [Xem báo cáo](/reports)` }]);
            } else if (call.name === 'createContract') {
              const newContract: any = {
                id: crypto.randomUUID(),
                contractNumber: args.contractNumber,
                clientName: args.clientName,
                contractName: args.contractName,
                department: user?.department || '',
                status: 'Draft',
                createdBy: user?.id || '',
                createdAt: new Date().toISOString(),
                _isNew: true
              };
              await saveContract(newContract);
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo hợp đồng: **${args.contractNumber} - ${args.contractName}**. [Xem hợp đồng](/contracts)` }]);
            } else if (call.name === 'deleteTask') {
              const id = args.id?.replace(/\[?ID:\s*/g, '').replace(/\]/g, '').trim();
              if (window.confirm(`⚠️ AI đang yêu cầu XÓA công việc có ID: ${id}.\nBạn có chắc chắn muốn xóa không?`)) {
                await deleteTask(id);
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã xóa công việc.` }]);
              } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `❌ Lệnh xóa công việc bị hủy.` }]);
              }
            } else if (call.name === 'createNote') {
              const newNote: any = {
                id: crypto.randomUUID(),
                title: args.title,
                content: args.content || '',
                color: 'bg-yellow-200',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId: user?.id || ''
              };
              await saveNote(newNote);
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo ghi chú: **${args.title}**. [Xem ghi chú](/notes)` }]);
            } else if (call.name === 'deleteNote') {
              const id = args.id?.replace(/\[?ID:\s*/g, '').replace(/\]/g, '').trim();
              if (window.confirm(`⚠️ AI đang yêu cầu XÓA ghi chú có ID: ${id}.\nBạn có chắc chắn muốn xóa không?`)) {
                await deleteNote(id);
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã xóa ghi chú.` }]);
              } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `❌ Lệnh xóa ghi chú bị hủy.` }]);
              }
            } else if (call.name === 'createMeeting') {
              let meetingParticipants = [user?.id || ''];
              if (args.participantNames && Array.isArray(args.participantNames)) {
                args.participantNames.forEach((name: string) => {
                  const matchedUser = users.find(u => u.name.toLowerCase().includes(name.toLowerCase()));
                  if (matchedUser && !meetingParticipants.includes(matchedUser.id)) {
                    meetingParticipants.push(matchedUser.id);
                  }
                });
              }

              const newMeeting: any = {
                id: crypto.randomUUID(),
                title: args.title,
                description: args.description || '',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                hostId: user?.id || '',
                participants: meetingParticipants,
                meetingLink: `meet.orangetask.com/${crypto.randomUUID().substring(0,8)}`,
                status: 'scheduled'
              };
              await saveMeeting(newMeeting);
              setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                text: `✅ Đã tạo cuộc họp: **${args.title}**`,
                uiContent: { type: 'meeting', data: newMeeting }
              }]);
            } else if (call.name === 'deleteMeeting') {
              const id = args.id?.replace(/\[?ID:\s*/g, '').replace(/\]/g, '').trim();
              if (window.confirm(`⚠️ AI đang yêu cầu XÓA cuộc họp có ID: ${id}.\nBạn có chắc chắn muốn xóa không?`)) {
                await deleteMeeting(id);
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã xóa cuộc họp.` }]);
              } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `❌ Lệnh xóa cuộc họp bị hủy.` }]);
              }
            } else if (call.name === 'markNotificationRead') {
              const id = args.id?.replace(/\[?ID:\s*/g, '').replace(/\]/g, '').trim();
              await markRead(id);
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã đánh dấu thông báo là đã đọc.` }]);
            } else if (call.name === 'navigateToPage') {
              let path = args.path;
              if (path && !path.startsWith('/')) path = '/' + path;
              navigate(path);
              setIsMinimized(true);
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đang mở trang: **${path}**` }]);
            }
          }
          continue;
        }

        if (c.text) {
            fullResponse += c.text;
            setMessages(prev => prev.map(msg => 
                msg.id === modelMsgId ? { ...msg, text: fullResponse } : msg
            ));
        }
      }

    } catch (error: any) {
      console.error("Chat error details:", error);
      const errorMsg = error?.message || '';
      
      const isNoKey = errorMsg.includes('No Gemini API keys');
      const isInvalidKey = error?.status === 400 || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid');
      const is429 = error?.status === 429 || error?.code === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      let errText = 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại.';
      
      if (isNoKey) {
        errText = '⚠️ Tính năng AI chưa được cấu hình. Vui lòng thêm Gemini API Key trong phần Cài đặt Admin.';
      } else if (isInvalidKey) {
        errText = '❌ API Key của bạn không hợp lệ hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại trong phần Cài đặt Admin.';
      } else if (is429) {
        errText = '⏳ API Key đã vượt giới hạn miễn phí. Vui lòng thử lại sau ít phút hoặc nâng cấp quota tại ai.google.dev.';
      } else {
        // Fallback to showing a part of the real error so user knows what's up
        errText = `❌ Lỗi API: ${errorMsg.substring(0, 100)}... Vui lòng kiểm tra lại.`;
      }
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errText }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 text-white rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] z-40 group border border-white/20"
      >
        <Bot size={26} className="animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-500 border-2 border-white"></span>
        </span>
        <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {t('askAi')}
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-brand-100 z-40 transition-all duration-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in
        ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px]'}
      `}
    >
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 text-white">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Bot size={18} />
          </div>
          <span className="font-bold">Bot CTC Tasks</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if(window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
                setMessages([]);
                chatSessionRef.current = null;
                localStorage.removeItem('ai_chat_history');
              }
            }} 
            className="hover:text-red-300 mr-1"
            title="Xóa lịch sử chat"
          >
            <Trash2 size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:text-white" title="Thu nhỏ/Mở rộng">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:text-white" title="Đóng">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                    ${msg.role === 'user' ? 'bg-gray-200' : 'bg-brand-100 text-brand-600'}
                  `}
                >
                  {msg.role === 'user' ? <span className="text-xs font-bold text-gray-600">ME</span> : <Bot size={16} />}
                </div>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-brand-500 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}
                  `}
                >
                  {/* Simple Markdown-like rendering for lists and links */}
                  {msg.text.split('\n').map((line, i) => {
                    const parts = line.split(/(\[.*?\]\(.*?\))/g);
                    return (
                      <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'pl-2' : 'min-h-[1rem]'}>
                        {parts.map((part, j) => {
                          const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
                          if (linkMatch) {
                            return (
                              <button 
                                key={j}
                                onClick={() => {
                                  navigate(linkMatch[2]);
                                  setIsMinimized(true);
                                }}
                                className={`underline font-semibold ml-1 ${msg.role === 'user' ? 'text-white hover:text-gray-200' : 'text-brand-600 hover:text-brand-800'}`}
                              >
                                {linkMatch[1]}
                              </button>
                            );
                          }
                          
                          // Simple bold parsing **text**
                          const boldParts = part.split(/(\*\*.*?\*\*)/g);
                          return boldParts.map((bp, k) => {
                            if (bp.startsWith('**') && bp.endsWith('**')) {
                              return <strong key={k}>{bp.slice(2, -2)}</strong>;
                            }
                            return <span key={k}>{bp}</span>;
                          });
                        })}
                      </p>
                    );
                  })}

                  {/* Generative UI Cards */}
                  {msg.uiContent && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden select-none text-left">
                      {msg.uiContent.type === 'task' && (
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2 text-brand-600 font-medium text-xs">
                            <CheckSquare size={14} /> <span>Công việc mới</span>
                          </div>
                          <h4 className="font-bold text-gray-800 text-[15px] mb-1">{msg.uiContent.data.title}</h4>
                          {msg.uiContent.data.description && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{msg.uiContent.data.description}</p>}
                          
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                            <button onClick={() => { navigate('/tasks'); setIsMinimized(true); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors">
                              Chi tiết <ChevronRight size={14} />
                            </button>
                            <button onClick={async () => {
                              if(msg.uiContent && window.confirm('Xóa công việc này?')) {
                                await deleteTask(msg.uiContent.data.id);
                                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: '✅ Đã xóa công việc.' }]);
                              }
                            }} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.uiContent.type === 'meeting' && (
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2 text-blue-600 font-medium text-xs">
                            <Calendar size={14} /> <span>Cuộc họp mới</span>
                          </div>
                          <h4 className="font-bold text-gray-800 text-[15px] mb-1">{msg.uiContent.data.title}</h4>
                          {msg.uiContent.data.description && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{msg.uiContent.data.description}</p>}
                          
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-50 mt-3">
                            <button onClick={() => { navigate('/meetings'); setIsMinimized(true); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                              Chi tiết <ChevronRight size={14} />
                            </button>
                            <button onClick={async () => {
                              if(msg.uiContent && window.confirm('Xóa cuộc họp này?')) {
                                await deleteMeeting(msg.uiContent.data.id);
                                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: '✅ Đã xóa cuộc họp.' }]);
                              }
                            }} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                 <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                   <Bot size={16} />
                 </div>
                 <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                   <div className="flex gap-1">
                     <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                   </div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2">
            {!isLoading && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {getSuggestions().map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(undefined, suggestion)}
                    className="whitespace-nowrap px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[13px] font-medium rounded-full transition-colors border border-brand-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Đang lắng nghe..." : t('askAiPlaceholder')}
                className={`w-full pl-4 pr-20 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-brand-300 rounded-xl text-sm outline-none transition-all ${isListening ? 'ring-2 ring-red-100 border-red-300 bg-red-50' : ''}`}
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'}`}
                  title="Nhập bằng giọng nói"
                >
                  {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
});
