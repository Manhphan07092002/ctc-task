
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './UI';
import { createChatSession } from '../services/aiService';
import { GenerateContentResponse } from "@google/genai";
import { Task } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface AIAssistantHandle {
  summarizeTasks: (tasks: Task[]) => void;
}

export const AIAssistant = forwardRef<AIAssistantHandle, {}>((_, ref) => {
  const { t } = useLanguage();
  const { saveTask, saveReport, saveContract } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
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
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          chatSessionRef.current = await createChatSession();
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
        chatSessionRef.current = await createChatSession();
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = await createChatSession();
      }

      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
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
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo công việc: **${args.title}**` }]);
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
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo báo cáo (Nháp): **${args.title}**` }]);
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
              setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `✅ Đã tạo hợp đồng: **${args.contractNumber} - ${args.contractName}**` }]);
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg shadow-brand-200 flex items-center justify-center transition-all hover:scale-110 z-40 group"
      >
        <Sparkles size={24} className="animate-pulse" />
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
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:text-white">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:text-white">
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
                  {/* Simple Markdown-like rendering for lists */}
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'pl-2' : 'min-h-[1rem]'}>
                        {line}
                    </p>
                  ))}
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
          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('askAiPlaceholder')}
                className="w-full pl-4 pr-12 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-brand-300 rounded-xl text-sm outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-2 p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
});
