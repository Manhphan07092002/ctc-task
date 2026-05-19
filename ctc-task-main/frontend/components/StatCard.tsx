import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, X, ExternalLink } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  subtitle?: string;
  alert?: boolean;
  delay?: number;
  details?: { label: string; value: string | number; color?: string }[];
  navigateTo?: string;
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
        const eased = 1 - Math.pow(1 - progress, 3);
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

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, color, onClick, subtitle, alert, delay = 0, details
}) => {
  const displayValue = useCountUp(value, 1200, delay);
  const isClickable = !!onClick;
  const [showPopup, setShowPopup] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClickable) setShowPopup(true);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
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
                <span>Chi tiết</span>
                <ChevronRight size={12} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Popup Modal */}
      {showPopup && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${color} p-5 relative`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-white text-3xl font-black tabular-nums">{value.toLocaleString('vi-VN')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Details body */}
            <div className="p-5">
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{subtitle}</p>
              )}
              {details && details.length > 0 ? (
                <div className="space-y-3">
                  {details.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                      <span className="text-sm text-gray-500 dark:text-slate-400">{d.label}</span>
                      <span className={`text-sm font-bold ${d.color || 'text-gray-800 dark:text-slate-100'}`}>{d.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-2">Không có thông tin chi tiết</p>
              )}

              {onClick && (
                <button
                  onClick={() => { setShowPopup(false); onClick(); }}
                  className={`mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r ${color} text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg`}
                >
                  <ExternalLink size={15} /> Mở trang quản lý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
