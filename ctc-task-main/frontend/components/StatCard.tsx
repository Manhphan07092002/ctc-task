import React from 'react';

export const StatCard: React.FC<{ label: string; value: number; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-slate-900/50 border border-white/60 dark:border-slate-700/60 flex items-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
      <Icon size={28} className="drop-shadow-sm" />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-slate-100 dark:to-slate-300">{value}</p>
    </div>
  </div>
);
