
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './UI';
import { createChatSession } from '../services/aiService';
import { GenerateContentResponse } from "@google/genai";
import { Task } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

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
    if (isOpen && !chatSessionRef.current) {
      chatSessionRef.current = createChatSession();
    }
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
        chatSessionRef.current = createChatSession();
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

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I'm having trouble analyzing your tasks right now." }]);
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
        chatSessionRef.current = createChatSession();
      }

      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
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

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again." }]);
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
          <span className="font-bold">OrangeBot AI</span>
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
                placeholder="Ask me anything..."
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
