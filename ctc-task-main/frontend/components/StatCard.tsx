import React from 'react';

export const StatCard: React.FC<{ label: string; value: number; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-white/60 flex items-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
      <Icon size={28} className="drop-shadow-sm" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{value}</p>
    </div>
  </div>
);
