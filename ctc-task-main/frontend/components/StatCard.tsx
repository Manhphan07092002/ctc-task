import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  subtitle?: string;
  alert?: boolean;
  delay?: number;
}

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (target === 0) { setCount(0); return; }
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.round(eased * target);
        setCount(current);
        if (progress < 1) ref.current = requestAnimationFrame(step);
      };
      ref.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(ref.current); };
  }, [target, duration, delay]);
  return count;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, onClick, subtitle, alert, delay = 0 }) => {
  const displayValue = useCountUp(value, 1200, delay);
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden group
        bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl 
        p-5 rounded-2xl 
        shadow-lg shadow-gray-200/30 dark:shadow-slate-900/50 
        border border-white/60 dark:border-slate-700/60 
        transition-all duration-300 ease-out
        ${isClickable ? 'cursor-pointer hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1.5 active:scale-[0.98]' : ''}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${color} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      {/* Background glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} opacity-[0.06] rounded-full blur-2xl group-hover:opacity-[0.12] transition-opacity duration-500`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold tracking-wider uppercase mb-2">{label}</p>
          <p className="text-3xl font-black text-gray-900 dark:text-slate-100 tabular-nums leading-none mb-1">
            {displayValue.toLocaleString('vi-VN')}
          </p>
          {subtitle && (
            <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium mt-1.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg shadow-gray-300/30 dark:shadow-slate-900/40 transition-transform duration-300 group-hover:scale-110 ${alert && value > 0 ? 'animate-pulse' : ''}`}>
            <Icon size={20} className="drop-shadow-sm" />
          </div>
          {isClickable && (
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
              <span>Xem</span>
              <ChevronRight size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
