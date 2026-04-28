import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task } from '../../types';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  X, CheckCircle2, Clock, CircleDot, Plus,
  BarChart2, Flame, ListChecks, AlarmClock, FileText
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Recurring Friday reminder
const FRIDAY_REMINDER = { title: 'Nộp báo cáo công việc', time: '16:00', icon: <FileText size={10}/> };

interface CalendarViewProps {
  tasks: Task[];
  onDateClick: (date: string) => void;
  onTaskClick: (task: Task) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'Done':        { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  icon: <CheckCircle2 size={13} className="text-green-500 flex-shrink-0"/> },
  'In Progress': { bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-700',   icon: <CircleDot size={13} className="text-blue-500 flex-shrink-0"/> },
  'Todo':        { bg: 'bg-gray-50 border-gray-200',    text: 'text-gray-600',   icon: <Clock size={13} className="text-gray-400 flex-shrink-0"/> },
};

const PRIORITY_DOT: Record<string, string> = { 'High': 'bg-red-500', 'Medium': 'bg-amber-400', 'Low': 'bg-green-400' };
const PRIORITY_BAR: Record<string, string> = {
  'High':   'bg-red-50 text-red-700 border-l-red-500',
  'Medium': 'bg-amber-50 text-amber-700 border-l-amber-400',
  'Low':    'bg-green-50 text-green-700 border-l-green-400',
};

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const popupRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const getLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = getLocalDateString(new Date());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedDate(null); setPopupPos(null);
      }
    };
    if (selectedDate) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedDate]);

  const { monthLabel, monthDays, weekDayHeaders, firstDayOfWeek } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dow = date.getDay(); // 0=Sun,6=Sat
      return { date, dateStr: getLocalDateString(date), isWeekend: dow === 0 || dow === 6 };
    });

    const monthStr = firstDay.toLocaleString(locale, { month: 'long', year: 'numeric' });
    const capitalizedLabel = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

    const refMonday = new Date(2024, 0, 1);
    const headers = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(refMonday);
      d.setDate(refMonday.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
    // Last 2 (Sat, Sun) are weekend
    return { monthLabel: capitalizedLabel, monthDays: days, weekDayHeaders: headers, firstDayOfWeek: startWeekday };
  }, [currentDate, locale]);

  const changeMonth = (delta: number) =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));

  const filteredTasks = useMemo(() =>
    filterPriority === 'all' ? tasks : tasks.filter(t => t.priority === filterPriority),
  [tasks, filterPriority]);

  const getTasksForDate = (dateStr: string) => filteredTasks.filter(t => t.startDate === dateStr);

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthStart = getLocalDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const monthEnd   = getLocalDateString(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
    const monthTasks = tasks.filter(t => t.startDate >= monthStart && t.startDate <= monthEnd);
    return {
      total: monthTasks.length,
      done: monthTasks.filter(t => t.status === 'Done').length,
      inProgress: monthTasks.filter(t => t.status === 'In Progress').length,
      high: monthTasks.filter(t => t.priority === 'High').length,
    };
  }, [tasks, currentDate]);

  // Upcoming tasks (next 7 days from today)
  const upcomingTasks = useMemo(() => {
    const from = today;
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 7);
    const to = getLocalDateString(toDate);
    return tasks
      .filter(t => t.startDate >= from && t.startDate <= to && t.status !== 'Done')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
  }, [tasks, today]);

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const handleDayClick = (dateStr: string, e: React.MouseEvent<HTMLElement>) => {
    if (selectedDate === dateStr) { setSelectedDate(null); setPopupPos(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const calendarEl = (e.currentTarget as HTMLElement).closest('.calendar-root') as HTMLElement;
    const calRect = calendarEl?.getBoundingClientRect() || { top: 0, left: 0, width: 800, height: 600 };
    const popupW = 288, popupH = 380;
    let left = rect.left - calRect.left + rect.width / 2 - popupW / 2;
    let top  = rect.bottom - calRect.top + 8;
    if (left + popupW > calRect.width - 8) left = calRect.width - popupW - 8;
    if (left < 8) left = 8;
    if (top + popupH > calRect.height - 8) top = rect.top - calRect.top - popupH - 8;
    setSelectedDate(dateStr); setPopupPos({ top, left });
  };

  const gridCells: ({ date: Date; dateStr: string; isWeekend: boolean } | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...monthDays,
  ];
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  // Map column index (0=Mon..6=Sun) to weekend: 5=Sat, 6=Sun
  const colIsWeekend = (idx: number) => (idx % 7 === 5 || idx % 7 === 6);

  return (
    <div className="relative h-full flex flex-col gap-3 animate-in fade-in duration-300 calendar-root min-h-0">

      {/* ===== MAIN CARD ===== */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CalendarIcon size={18} className="text-brand-500" />
            <h2 className="text-lg font-bold text-gray-800 capitalize">{monthLabel}</h2>
            <button
              onClick={() => { setCurrentDate(new Date()); }}
              className="px-3 py-1 text-xs font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-full border border-brand-100 transition-colors"
            >
              Hôm nay
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-400 transition-all"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="High">🔴 Cao</option>
              <option value="Medium">🟡 Trung bình</option>
              <option value="Low">🟢 Thấp</option>
            </select>
            <div className="flex gap-0.5">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={17}/></button>
              <button onClick={() => changeMonth(1)}  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight size={17}/></button>
            </div>
          </div>
        </div>

        {/* Monthly stats strip */}
        <div className="flex items-center gap-4 px-5 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <BarChart2 size={13} className="text-brand-400"/>
            <span className="font-bold text-gray-700">{monthStats.total}</span> việc trong tháng
          </div>
          <div className="w-px h-4 bg-gray-200"/>
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
            <span className="font-bold text-green-600">{monthStats.done}</span>
            <span className="text-gray-400">hoàn thành</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>
            <span className="font-bold text-blue-600">{monthStats.inProgress}</span>
            <span className="text-gray-400">đang làm</span>
          </div>
          {monthStats.high > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Flame size={12} className="text-red-500"/>
              <span className="font-bold text-red-600">{monthStats.high}</span>
              <span className="text-gray-400">ưu tiên cao</span>
            </div>
          )}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
          {weekDayHeaders.map((d, i) => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr flex-grow bg-gray-100 gap-px overflow-hidden">
          {gridCells.map((day, idx) => {
            if (!day) return (
              <div key={`e-${idx}`} className="bg-gray-50/30" />
            );

            const dayTasks = getTasksForDate(day.dateStr);
            const isToday = day.dateStr === today;
            const isSelected = day.dateStr === selectedDate;
            const hasHighPriority = dayTasks.some(t => t.priority === 'High');
            const isFriday = day.date.getDay() === 5; // 5 = Friday

            return (
              <div
                key={day.dateStr}
                onClick={(e) => handleDayClick(day.dateStr, e)}
                className={`min-h-[90px] p-1.5 transition-all cursor-pointer flex flex-col gap-0.5 relative group
                  ${isToday ? 'bg-brand-50 border-t-[3px] border-t-brand-500' : 'bg-white'}
                  ${isSelected ? 'ring-2 ring-inset ring-brand-400' : 'hover:bg-brand-50/20'}
                `}
              >
                {/* Date number row */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors flex-shrink-0 text-[13px]
                    ${isToday ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                      : isSelected ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-700 group-hover:bg-gray-100'}`}
                  >
                    {day.date.getDate()}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Task count badge */}
                    {dayTasks.length > 0 && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${hasHighPriority ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {dayTasks.length}
                      </span>
                    )}
                    {/* Add button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDateClick(day.dateStr); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-brand-100 rounded text-brand-500 transition-all"
                      title="Thêm công việc"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Task bars */}
                <div className="flex flex-col gap-0.5 overflow-hidden flex-grow">
                  {/* Friday recurring reminder */}
                  {isFriday && (
                    <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border-l-2 font-semibold bg-violet-50 text-violet-700 border-l-violet-500 truncate">
                      <AlarmClock size={10} className="flex-shrink-0"/>
                      <span>Báo cáo 16:00</span>
                    </div>
                  )}
                  {dayTasks.slice(0, isFriday ? 2 : 3).map(task => (
                    <div
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); handleDayClick(day.dateStr, e); }}
                      className={`text-[10px] px-1.5 py-0.5 rounded border-l-2 font-medium truncate transition-all cursor-pointer hover:brightness-95 ${PRIORITY_BAR[task.priority] || 'bg-gray-50 text-gray-600 border-l-gray-400'}`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > (isFriday ? 2 : 3) && (
                    <div className="text-[10px] text-brand-500 px-1 font-semibold">
                      +{dayTasks.length - (isFriday ? 2 : 3)} khác
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== UPCOMING STRIP ===== */}
      {upcomingTasks.length > 0 && (
        <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <ListChecks size={15} className="text-brand-500"/>
            <span className="text-xs font-bold text-gray-700">Sắp đến hạn (7 ngày tới)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {upcomingTasks.map(task => {
              const isTaskToday = task.startDate === today;
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`flex-shrink-0 flex flex-col gap-1 px-3 py-2 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 min-w-[140px] max-w-[170px]
                    ${PRIORITY_BAR[task.priority] || 'bg-gray-50 text-gray-600 border-l-gray-400'}
                  `}
                >
                  <p className="text-[11px] font-bold truncate">{task.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`}/>
                    <span className={`text-[9px] font-bold ${isTaskToday ? 'text-brand-600' : 'text-gray-400'}`}>
                      {isTaskToday ? 'Hôm nay' : new Date(task.startDate + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== POPUP ===== */}
      {selectedDate && popupPos && (() => {
        const selDateObj = new Date(selectedDate + 'T12:00:00');
        const isSelFriday = selDateObj.getDay() === 5;
        return (
        <div
          ref={popupRef}
          className="absolute z-50 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {/* Popup Header */}
          <div className="px-4 py-3 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-200 mb-0.5">Công việc ngày</p>
                <h3 className="text-sm font-bold capitalize leading-snug">{selectedDateLabel}</h3>
                <p className="text-[11px] text-brand-200 mt-0.5">
                  {selectedTasks.length === 0 ? 'Chưa có công việc' : `${selectedTasks.length} công việc`}
                </p>
              </div>
              <div className="flex items-center gap-0.5 -mt-0.5">
                <button onClick={() => onDateClick(selectedDate)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Thêm">
                  <Plus size={14}/>
                </button>
                <button onClick={() => { setSelectedDate(null); setPopupPos(null); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={14}/>
                </button>
              </div>
            </div>
          </div>

          {/* Friday reminder banner */}
          {isSelFriday && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
              <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                <AlarmClock size={14} className="text-white"/>
              </div>
              <div>
                <p className="text-[11px] font-bold text-violet-800">Nộp báo cáo công việc</p>
                <p className="text-[10px] text-violet-500 flex items-center gap-1"><Clock size={9}/> 16:00 — Hàng tuần</p>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="max-h-60 overflow-y-auto p-3 space-y-1.5">
            {selectedTasks.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarIcon size={28} strokeWidth={1.2} className="text-gray-200 mx-auto mb-2"/>
                <p className="text-sm font-semibold text-gray-500 mb-3">Không có công việc</p>
                <button
                  onClick={() => onDateClick(selectedDate)}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  + Thêm việc
                </button>
              </div>
            ) : (
              selectedTasks.map(task => {
                const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES['Todo'];
                return (
                  <button
                    key={task.id}
                    onClick={() => { onTaskClick(task); setSelectedDate(null); setPopupPos(null); }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${statusStyle.bg}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">{statusStyle.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${statusStyle.text} ${task.status === 'Done' ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            task.priority === 'High' ? 'bg-red-100 text-red-600' :
                            task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-green-100 text-green-600'}`}
                          >
                            <span className={`w-1 h-1 rounded-full ${PRIORITY_DOT[task.priority]}`}/>
                            {task.priority === 'High' ? 'Cao' : task.priority === 'Medium' ? 'Trung bình' : 'Thấp'}
                          </span>
                          {task.dueDate && task.dueDate !== task.startDate && (
                            <span className="text-[9px] text-gray-400">→ {task.dueDate}</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};
