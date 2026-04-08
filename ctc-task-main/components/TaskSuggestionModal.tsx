
import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from './UI';
import { generateTasksFromGoal, SuggestedTask } from '../services/aiService';
import { TaskPriority, TaskStatus, User, Task, RecurrenceType } from '../types';

interface TaskSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: Task[]) => void;
  currentUser: User;
}

export const TaskSuggestionModal: React.FC<TaskSuggestionModalProps> = ({ isOpen, onClose, onAddTasks, currentUser }) => {
  const [goal, setGoal] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setIsLoading(true);
    setSuggestions([]);
    setSelectedIndices([]);

    try {
      const results = await generateTasksFromGoal(goal);
      setSuggestions(results);
      // Auto-select all by default
      setSelectedIndices(results.map((_, i) => i));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleAddSelected = () => {
    const tasksToAdd: Task[] = selectedIndices.map(index => {
      const s = suggestions[index];
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: s.title,
        description: s.description,
        startDate: new Date().toISOString().split('T')[0], // Default to today
        priority: s.priority as TaskPriority,
        status: TaskStatus.TODO,
        assignees: [currentUser.id],
        recurrence: RecurrenceType.NONE,
        comments: [],
        subtasks: [],
        tags: ['AI Generated'],
        createdBy: currentUser.id,
        department: currentUser.department
      };
    });

    onAddTasks(tasksToAdd);
    resetAndClose();
  };

  const resetAndClose = () => {
    setGoal('');
    setSuggestions([]);
    setSelectedIndices([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-yellow-300" /> AI Plan Generator
            </h3>
            <p className="text-brand-100 text-sm mt-1">Describe a goal, and I'll suggest a list of tasks.</p>
          </div>
          <button onClick={resetAndClose} className="text-brand-100 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {suggestions.length === 0 ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What is your goal?</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Plan a marketing campaign for Q4 launch, Organize a team building event, Launch a new product feature..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-400 outline-none resize-none h-32"
                  autoFocus
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!goal.trim() || isLoading} className="w-full sm:w-auto" size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" /> Generating Plan...
                    </>
                  ) : (
                    <>
                      Generate Tasks <ArrowRight size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800">Suggested Tasks ({suggestions.length})</h4>
                <button 
                  onClick={() => setSuggestions([])} 
                  className="text-sm text-brand-600 hover:underline"
                >
                  Start Over
                </button>
              </div>
              
              <div className="space-y-3">
                {suggestions.map((item, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleSelection(idx)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex gap-4 hover:shadow-sm ${
                        isSelected 
                          ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' 
                          : 'bg-white border-gray-200 hover:border-brand-200'
                      }`}
                    >
                      <div className={`mt-1 ${isSelected ? 'text-brand-500' : 'text-gray-300'}`}>
                        {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{item.title}</h5>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            item.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' :
                            item.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                            'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
            <div className="text-sm text-gray-500">
              {selectedIndices.length} tasks selected
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={handleAddSelected} disabled={selectedIndices.length === 0}>
                Add Selected Tasks
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
