
import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskStatus, RecurrenceType, Comment, User, Subtask } from '../types';
import { X, Calendar as CalendarIcon, User as UserIcon, Repeat, Send, MessageSquare, CheckSquare, Plus, Trash2, Tag, Sparkles, Loader2, Clock, Lock } from 'lucide-react';
import { Button, Avatar } from './UI';
import { generateSubtasksFromTitle, generateTaskDetails } from '../services/aiService';
import { useLanguage } from '../contexts/LanguageContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
  initialDate?: string;
  user: User;
  readOnly?: boolean;
  allUsers: User[]; // Pass full user list for lookups
}

// Helper to format relative time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask, initialDate, user, readOnly = false, allUsers }) => {
  const { t } = useLanguage();
  
  // Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedEndAt, setEstimatedEndAt] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(RecurrenceType.NONE);
  
  // Enhanced Features State
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  
  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Determine assignable users based on Role
  const assignableUsers = allUsers.filter(u => {
    if (user.role === 'Admin') return true; // Admin sees all
    if (user.role === 'Manager') return u.department === user.department; // Manager sees dept
    // Employee can assign to anyone in department (collaboration) or strict self? 
    // Let's allow department collaboration
    return u.department === user.department;
  });

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description);
        setStartDate(initialTask.startDate);
        setDueDate(initialTask.dueDate || '');
        setEstimatedEndAt(initialTask.estimatedEndAt || '');
        setPriority(initialTask.priority);
        setStatus(initialTask.status);
        setAssignees(initialTask.assignees);
        setRecurrence(initialTask.recurrence || RecurrenceType.NONE);
        setComments(initialTask.comments || []);
        setTags(initialTask.tags || []);
        setSubtasks(initialTask.subtasks || []);
      } else {
        resetForm();
        if (initialDate) setStartDate(initialDate);
        // Auto-assign creator
        setAssignees([user.id]);
      }
    }
  }, [isOpen, initialTask, initialDate, user.id]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setEstimatedEndAt('');
    setPriority(TaskPriority.MEDIUM);
    setStatus(TaskStatus.TODO);
    setAssignees([]);
    setRecurrence(RecurrenceType.NONE);
    setComments([]);
    setTags([]);
    setSubtasks([]);
    setNewComment('');
    setNewTag('');
    setNewSubtaskTitle('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const task: Task = {
      id: initialTask ? initialTask.id : Math.random().toString(36).substr(2, 9),
      title,
      description,
      startDate,
      dueDate: dueDate || undefined,
      estimatedEndAt: estimatedEndAt || undefined,
      priority,
      status,
      assignees,
      recurrence,
      comments,
      tags,
      subtasks,
      // Preserve creation info if editing, else set new
      createdBy: initialTask ? initialTask.createdBy : user.id,
      department: initialTask ? initialTask.department : user.department,
    };
    onSave(task);
    onClose();
  };

  const toggleAssignee = (userId: string) => {
    if (readOnly) return;
    setAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // --- Subtasks Logic ---
  const addSubtask = () => {
    if (readOnly || !newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle.trim(),
      isCompleted: false
    }]);
    setNewSubtaskTitle('');
  };

  const handleAIGenerateSubtasks = async () => {
    if (readOnly || !title) return;
    setIsGeneratingSubtasks(true);
    try {
      const generatedItems = await generateSubtasksFromTitle(title);
      const newSubtasks: Subtask[] = generatedItems.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        title: item,
        isCompleted: false
      }));
      setSubtasks(prev => [...prev, ...newSubtasks]);
    } catch (error) {
      console.error("Failed to generate subtasks", error);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleAIAutoFill = async () => {
    if (readOnly || !title) return;
    setIsGeneratingDetails(true);
    try {
      const result = await generateTaskDetails(title);
      if (result) {
        setDescription(result.description);
        
        const newSubtasks: Subtask[] = result.subtasks.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          title: item,
          isCompleted: false
        }));
        setSubtasks(prev => [...prev, ...newSubtasks]);
      }
    } catch (error) {
      console.error("Failed to auto-fill details", error);
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const toggleSubtask = (id: string) => {
    if (readOnly) return;
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, isCompleted: !st.isCompleted } : st
    ));
  };

  const deleteSubtask = (id: string) => {
    if (readOnly) return;
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  // --- Tags Logic ---
  const addTag = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (readOnly) return;
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // --- Comment Logic ---

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    // Simple mention detection
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const textAfterAt = val.slice(lastAt + 1);
      // If there's no space after @, we are searching
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        return;
      }
    }
    setMentionQuery(null);
  };

  const addMention = (u: User) => {
    if (!mentionQuery && mentionQuery !== '') return;
    
    const lastAt = newComment.lastIndexOf('@');
    const before = newComment.substring(0, lastAt);
    const after = newComment.substring(lastAt + 1 + mentionQuery!.length);
    
    const text = `${before}@${u.name} ${after}`;
    setNewComment(text);
    setMentionQuery(null);
    commentInputRef.current?.focus();
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      content: newComment,
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    setNewComment('');
  };

  const filteredUsers = mentionQuery !== null 
    ? allUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];
  
  const creator = initialTask ? allUsers.find(u => u.id === initialTask.createdBy) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-3xl border border-white/50 rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100/50 relative z-10">
          <h3 className="text-2xl font-extrabold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            {initialTask ? t('editTaskHeader') : t('newTask')}
            {readOnly && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1 font-normal"><Lock size={10} /> Read Only</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[60vh]">
          
          {/* LEFT COLUMN: Task Details */}
          <form id="taskForm" onSubmit={handleSubmit} className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            
            {/* Title & Tags */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">{t('taskTitle')}</label>
              <input 
                type="text" 
                required
                disabled={readOnly}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none transition-all font-medium text-lg disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={t('taskPlaceholder')}
              />
              
              {/* Tags Input */}
              <div className="flex flex-wrap items-center gap-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                    {tag}
                    {!readOnly && (
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)} 
                        className="ml-1.5 text-brand-400 hover:text-brand-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {!readOnly && (
                  <div className="relative">
                    <Tag className="absolute left-2 top-1.5 text-gray-400" size={14} />
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={addTag}
                      placeholder={t('addTag')}
                      className="pl-7 pr-3 py-1 text-sm border border-transparent hover:border-gray-300 focus:border-brand-300 rounded-full outline-none w-32 transition-colors bg-gray-50 focus:bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Meta Row 1: Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="date"
                    required
                    disabled={readOnly}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dueDate')}</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="date"
                    disabled={readOnly}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('estCompletion')}</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                    type="datetime-local"
                    disabled={readOnly}
                    value={estimatedEndAt}
                    onChange={(e) => setEstimatedEndAt(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Meta Row 2: Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority')}</label>
                <select 
                  value={priority}
                  disabled={readOnly}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {Object.values(TaskPriority).map(p => <option key={p} value={p}>{t(p)}</option>)}
                </select>
              </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
                  <select 
                    value={status}
                    disabled={readOnly}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
               </div>
            </div>

            {/* Meta Row 3: Repeat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('repeat')}</label>
              <div className="relative">
                <Repeat className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <select 
                  value={recurrence}
                  disabled={readOnly}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none bg-white appearance-none disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {Object.values(RecurrenceType).map(r => <option key={r} value={r}>{t(r)}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAIAutoFill}
                    disabled={isGeneratingDetails || !title.trim()}
                    className={`text-xs flex items-center gap-1 font-medium px-2 py-1 rounded-lg transition-colors ${
                      !title.trim() 
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                        : 'text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100'
                    } disabled:opacity-70`}
                    title={!title.trim() ? "Enter a title to use AI" : "Auto-fill description and subtasks"}
                  >
                    {isGeneratingDetails ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {t('aiAutoFill')}
                  </button>
                )}
              </div>
              <textarea 
                value={description}
                disabled={readOnly}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={t('descPlaceholder')}
              />
            </div>

            {/* Checklist / Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckSquare size={16}/> {t('checklist')}
                </label>
                {!readOnly && !isGeneratingDetails && (
                  <button
                    type="button"
                    onClick={handleAIGenerateSubtasks}
                    disabled={isGeneratingSubtasks || !title.trim()}
                    className={`text-xs flex items-center gap-1 font-medium transition-colors disabled:opacity-50 ${
                      !title.trim() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-600'
                    }`}
                  >
                    {isGeneratingSubtasks ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    {t('addSubtasks')}
                  </button>
                )}
              </div>
              
              <div className="space-y-2 mb-3">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3 group animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                      type="button" 
                      onClick={() => toggleSubtask(st.id)}
                      disabled={readOnly}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${st.isCompleted ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 hover:border-brand-400 disabled:opacity-50'}`}
                    >
                      {st.isCompleted && <X size={14} className="rotate-45" />}
                    </button>
                    <span className={`flex-1 text-sm ${st.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {st.title}
                    </span>
                    {!readOnly && (
                      <button type="button" onClick={() => deleteSubtask(st.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    placeholder={t('addAnItem')}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                    <Plus size={16} />
                  </Button>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <UserIcon size={16}/> {t('assignees')}
              </label>
              <div className="flex gap-3 flex-wrap">
                {assignableUsers.map(u => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => toggleAssignee(u.id)}
                    disabled={readOnly}
                    className={`relative group rounded-full p-0.5 transition-all ${
                      assignees.includes(u.id) 
                        ? 'ring-2 ring-brand-500 ring-offset-2' 
                        : 'opacity-60 hover:opacity-100'
                    } ${readOnly ? 'cursor-default' : ''}`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full" />
                    {assignees.includes(u.id) && (
                      <div className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-0.5 border border-white">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    )}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-10">
                      {u.name} ({u.role})
                    </div>
                  </button>
                ))}
              </div>
              {assignableUsers.length === 0 && (
                <p className="text-xs text-gray-400 italic">{t('noEligibleUsers')}</p>
              )}
            </div>
          </form>

          {/* RIGHT COLUMN: Comments & Activity */}
          <div className="w-full md:w-[28rem] bg-gray-50/50 backdrop-blur-sm border-l border-gray-100/50 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-100/50">
               <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                 <MessageSquare size={16}/> {t('comments')} ({comments.length})
               </h4>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8 italic">
                  {t('noCommentsYet')}
                </div>
              ) : (
                comments.map(comment => {
                  const cUser = allUsers.find(u => u.id === comment.userId) || allUsers[0];
                  return (
                    <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <Avatar src={cUser.avatar} alt={cUser.name} size={8} />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-bold text-gray-800">{cUser.name}</span>
                          <span className="text-[10px] text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-r-xl rounded-bl-xl border border-gray-200 mt-1 shadow-sm text-sm text-gray-600 break-words">
                          {comment.content.split(' ').map((word, i) => (
                            word.startsWith('@') ? <span key={i} className="text-brand-600 font-medium">{word} </span> : <span key={i}>{word} </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-white border-t border-gray-200 relative">
              {/* Mention Suggestion Popover */}
              {mentionQuery !== null && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">{t('suggestedMembers')}</div>
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addMention(u)}
                      className="w-full text-left px-4 py-2.5 hover:bg-brand-50 flex items-center gap-3 transition-colors"
                    >
                      <Avatar src={u.avatar} alt={u.name} size={6} />
                      <span className="text-sm text-gray-700">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea 
                  ref={commentInputRef}
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none scrollbar-hide"
                  placeholder={t('writeComment')}
                  rows={2}
                />
                <button 
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="absolute right-2 bottom-2 p-1.5 bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center px-8 py-5 border-t border-gray-100/50 bg-transparent">
          <div className="text-xs text-gray-400 pl-2">
            {creator && (
              <span>{t('createdBy')} <span className="font-medium text-gray-600">{creator.name}</span> ({initialTask?.department})</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            {!readOnly && (
              <Button 
                type="button" 
                onClick={(e) => {
                  // Trigger form submission from outside the form tag
                  const form = document.getElementById('taskForm') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }} 
                variant="primary"
              >
                {initialTask ? t('save') : t('create')}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
