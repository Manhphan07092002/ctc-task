import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layout, ClipboardCheck, ArrowRight, AlertCircle, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Button, Input } from './UI';
import { MOCK_USERS } from '../constants';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(async () => {
      const success = await login(email);
      if (!success) {
        setError('Invalid email or password');
        setIsLoading(false);
      }
    }, 800);
  };

  const fillCredentials = (email: string) => {
    setEmail(email);
    setPassword('password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-transparent relative overflow-hidden">
      {/* Decorative Orbs for Glassmorphism Background */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-brand-300/40 to-rose-300/40 blur-[100px] -z-10 mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-brand-400/30 to-orange-400/30 blur-[100px] -z-10 mix-blend-multiply pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

        {/* Left Welcome Content (Hidden on small screens) */}
        <div className="hidden lg:flex flex-col justify-center animate-in slide-in-from-left-8 duration-700">
          <img src="/logo.png" alt="CTC Task Logo" className="h-20 w-auto object-contain mb-8 drop-shadow-md transform -rotate-2 hover:rotate-0 transition-transform duration-500 mix-blend-multiply" />
          <h1 className="text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Manage your day, <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">the bright way.</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium mb-10 max-w-md leading-relaxed">
            CTC Task is the next-generation workspace combining intelligent AI logic with unparalleled aesthetics.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-gray-100">
                <Sparkles size={24} className="text-brand-500" />
              </div>
              <p className="font-semibold text-gray-700">AI-Powered Task Generation</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-gray-100">
                <Zap size={24} className="text-brand-500" />
              </div>
              <p className="font-semibold text-gray-700">Lightning Fast WebRTC Meetings</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-gray-100">
                <ShieldCheck size={24} className="text-brand-500" />
              </div>
              <p className="font-semibold text-gray-700">Role-based Secure Access</p>
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="w-full max-w-md mx-auto relative animate-in slide-in-from-right-8 fade-in duration-700">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="CTC Task Logo" className="h-16 w-auto object-contain mx-auto mb-4 drop-shadow-md mix-blend-multiply" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CTC Task</h1>
          </div>

          <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sm:p-10 relative overflow-hidden">
            {/* Glass shine effect */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 relative">Welcome Back</h2>
            <p className="text-sm text-gray-500 mb-8 relative">Please sign in to access your workspace.</p>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              {error && (
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3 animate-in shake">
                  <AlertCircle size={18} />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full py-4 text-base font-extrabold tracking-wide"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'} {!isLoading && <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </div>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-200/50 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/70 backdrop-blur-xl px-4 text-xs font-bold text-gray-400 uppercase tracking-widest rounded-full border border-gray-100">
                Quick Access
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {MOCK_USERS.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => fillCredentials(u.email)}
                    className="flex items-center gap-4 p-3 bg-white/40 hover:bg-white/80 border border-white/50 backdrop-blur-sm shadow-sm rounded-2xl transition-all duration-300 text-left group hover:shadow-md hover:-translate-y-0.5"
                  >
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{u.name}</p>
                      <p className="text-xs font-medium text-gray-500 group-hover:text-brand-600 transition-colors">{u.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={14} className="text-brand-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
