import React, { useState } from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { Button, Input } from './UI';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('sending');
    // Simulate API call
    setTimeout(() => {
      setStatus('sent');
      setTimeout(() => {
        setStatus('idle');
        setEmail('');
        onClose();
      }, 2000);
    }, 1000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://orangetask.com/join/workspace-id-123");
    // Could add a toast here, but for now alert is simple or just rely on UI feedback
    const btn = document.getElementById('copy-btn');
    if(btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied</span>';
        setTimeout(() => btn.innerHTML = original, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Invite Team Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Check size={32} />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Invitation Sent!</h4>
            <p className="text-gray-500">We've sent an email to <span className="font-medium text-gray-900">{email}</span> with instructions to join.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <form onSubmit={handleSend}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="flex gap-3">
                <Input 
                  placeholder="colleague@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                  type="email"
                />
                <Button type="submit" disabled={status === 'sending'}>
                   {status === 'sending' ? 'Sending...' : 'Invite'}
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or share invite link</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-white rounded border border-gray-100 text-brand-500">
                 <Mail size={16} />
              </div>
              <div className="flex-1 text-xs text-gray-600 truncate font-mono">
                https://orangetask.com/join/workspace-id-123
              </div>
              <button 
                id="copy-btn"
                onClick={copyLink} 
                className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1 px-2 py-1 hover:bg-brand-50 rounded transition-colors"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};