
import React, { useState, useMemo } from 'react';
import { Task, CalendarDay } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { PRIORITY_COLORS } from '../constants';
import { Button } from './UI';
import { useLanguage } from '../contexts/LanguageContext';

interface CalendarViewProps {
  tasks: Task[];
  onDateClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { t, language } = useLanguage();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const jumpToToday = () => setCurrentDate(new Date());

  const { monthLabel, days, weekDays } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays: CalendarDay[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDayOfWeek; i++) {
      const day = prevMonthLastDay - startingDayOfWeek + i + 1;
      calendarDays.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    // Next month padding
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Generate Month Label
    const monthStr = firstDayOfMonth.toLocaleString(locale, { month: 'long', year: 'numeric' });
    const capitalizedMonthLabel = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

    // Generate Weekday Headers (dynamic based on locale)
    const weekDayHeaders = [];
    const startOfWeek = new Date(2024, 0, 7); // Jan 7 2024 is a Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDayHeaders.push(d.toLocaleDateString(locale, { weekday: 'short' }));
    }

    return {
      monthLabel: capitalizedMonthLabel,
      days: calendarDays,
      weekDays: weekDayHeaders
    };
  }, [currentDate, locale]);

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  // Helper to get YYYY-MM-DD in local time to match visual calendar
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return tasks.filter(t => t.startDate === dateStr);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 capitalize">
                <CalendarIcon size={20} className="text-brand-500" />
                {monthLabel}
            </h2>
            <Button variant="outline" size="sm" onClick={jumpToToday}>{t('today')}</Button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {weekDays.map(d => (
          <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 auto-rows-fr flex-grow bg-gray-100 gap-px border-b border-gray-100">
        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day.date);
          const dateString = getLocalDateString(day.date);
          
          return (
            <div 
              key={idx} 
              onClick={() => onDateClick(dateString)}
              className={`bg-white min-h-[110px] p-1 md:p-2 transition-all hover:bg-brand-50/30 cursor-pointer flex flex-col gap-1 relative group
                ${!day.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-gray-800'}
                ${day.isToday ? 'bg-brand-50/10' : ''}
              `}
            >
              {/* Date Number */}
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors
                  ${day.isToday 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-200' 
                    : 'text-gray-700 group-hover:bg-gray-100'}
                `}>
                  {day.date.getDate()}
                </span>
                
                {/* Add Button (Visible on Hover) */}
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-brand-100 rounded text-brand-600 transition-all transform scale-90 hover:scale-100">
                  <Plus size={14} />
                </button>
              </div>

              {/* Task Bars */}
              <div className="flex flex-col gap-1 overflow-hidden flex-grow">
                {dayTasks.slice(0, 4).map(task => (
                  <div 
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className={`text-[10px] px-2 py-1 rounded-md border border-l-4 font-medium cursor-pointer hover:brightness-95 transition-all shadow-sm truncate
                      ${PRIORITY_COLORS[task.priority].replace('border-', 'border-l-')}
                    `}
                    style={{
                      // Fallback style tweak to ensure left border is thicker for priority indication
                      borderLeftColor: task.priority === 'High' ? '#ea580c' : task.priority === 'Medium' ? '#ca8a04' : '#9ca3af'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 4 && (
                  <div className="text-[10px] text-gray-400 px-1 font-medium hover:text-brand-600 mt-auto">
                    +{dayTasks.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
