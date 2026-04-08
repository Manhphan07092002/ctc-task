import React from 'react';
import { X } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-0 active:scale-95";
  
  const variants = {
    primary: "bg-gradient-to-r from-brand-500 to-brand-400 text-white hover:from-brand-600 hover:to-brand-500 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 focus:ring-brand-500/30 border border-brand-400/50 hover:-translate-y-0.5",
    secondary: "bg-brand-50/80 backdrop-blur-sm text-brand-700 hover:bg-brand-100 shadow-sm border border-brand-200/50 focus:ring-brand-200",
    outline: "border-2 border-gray-200 text-gray-700 bg-white/50 backdrop-blur-sm hover:bg-gray-50 focus:ring-gray-200 hover:border-gray-300",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs rounded-xl",
    md: "px-6 py-2.5 text-sm rounded-xl",
    lg: "px-8 py-3.5 text-base rounded-2xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white/70 backdrop-blur-2xl rounded-[1.5rem] border border-white/60 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-brand-500/10 transition-shadow ${className}`}>
    {children}
  </div>
);

export const Avatar: React.FC<{ src?: string; alt?: string; size?: number | string; className?: string }> = ({ src, alt = '', size = 8, className = '' }) => {
  const numericSize = typeof size === 'string' ? (size === 'xl' ? 24 : size === 'lg' ? 16 : size === 'sm' ? 6 : 8) : size;
  return (
    <img 
      src={src || 'https://api.dicebear.com/8.x/avataaars/svg?seed=fallback'} 
      alt={alt} 
      className={`rounded-full object-cover ring-4 ring-white/80 shadow-md shadow-gray-200 bg-gray-100 transition-transform hover:scale-105 ${className}`}
      style={{ width: `${numericSize * 4}px`, height: `${numericSize * 4}px` }}
    />
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
    <input 
      className={`w-full px-4 py-3 bg-white/60 backdrop-blur-md border border-gray-200/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm shadow-gray-100 ${className}`}
      {...props}
    />
  </div>
);

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => (
  <button 
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-500/30 ${
      checked ? 'bg-gradient-to-r from-brand-500 to-brand-400 shadow-inner' : 'bg-gray-200'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ease-spring ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl' }> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white/85 backdrop-blur-3xl border border-white/50 rounded-[2rem] shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col`}>
        <div className="px-6 py-5 border-b border-gray-100/50 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 hover:rotate-90 rounded-xl text-gray-400 hover:text-gray-700 transition-all duration-300">
            <X size={20} className="stroke-[2.5]" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
    <textarea 
      className={`w-full px-4 py-3 bg-white/60 backdrop-blur-md border border-gray-200/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm shadow-gray-100 min-h-[120px] resize-y ${className}`}
      {...props}
    />
  </div>
);
