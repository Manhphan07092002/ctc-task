import React from 'react';
import { Clock, CheckSquare, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus, User } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface TaskListItemProps {
  task: Task;
  onClick: () => void;
  onCheck: () => void;
  onDelete?: () => void;
  canToggle: boolean;
  isReadOnly: boolean;
  showDepartment: boolean;
  allUsers: User[];
}

export const TaskListItem: React.FC<TaskListItemProps> = ({
  task, onClick, onCheck, onDelete, canToggle, isReadOnly, showDepartment, allUsers
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group cursor-pointer flex items-center lg:gap-4" onClick={onClick}>
      <button
        onClick={(e) => { e.stopPropagation(); if (canToggle) onCheck(); }}
        disabled={!canToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
          ${task.status === TaskStatus.DONE
            ? 'bg-success-500 border-success-500 text-white'
            : canToggle ? 'border-gray-300 text-transparent hover:border-brand-400' : 'border-gray-200 bg-gray-50 cursor-not-allowed'}
        `}
      >
        <CheckCircle2 size={14} fill="currentColor" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {isReadOnly && <Lock size={12} className="text-gray-400" />}
          <h3 className={`font-bold text-gray-800 truncate ${task.status === TaskStatus.DONE ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {showDepartment && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100 uppercase font-medium">
              {task.department}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 line-clamp-1 mb-2">{task.description}</p>
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-gray-600">
            <Clock size={12} className="text-brand-500" />
            {task.startDate}
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <CheckSquare size={12} />
              {task.subtasks.filter(t => t.isCompleted).length}/{task.subtasks.length}
            </div>
          )}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {task.assignees.map(id => {
                const assignee = allUsers.find(u => u.id === id);
                if (!assignee) return null;
                return (
                  <img
                    key={id}
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="w-5 h-5 rounded-full border border-white"
                    title={assignee.name}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
          title="Delete Task"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};
