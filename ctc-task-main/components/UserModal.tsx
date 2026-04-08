
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { X, User as UserIcon, Mail, Shield, Briefcase } from 'lucide-react';
import { Button, Input } from './UI';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  initialUser?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, initialUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [department, setDepartment] = useState('General');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialUser) {
        setName(initialUser.name);
        setEmail(initialUser.email);
        setRole(initialUser.role);
        setDepartment(initialUser.department);
        setAvatarUrl(initialUser.avatar);
      } else {
        setName('');
        setEmail('');
        setRole('Employee');
        setDepartment('Product'); // Default
        setAvatarUrl(`https://picsum.photos/id/${Math.floor(Math.random() * 100)}/50/50`);
      }
    }
  }, [isOpen, initialUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: initialUser ? initialUser.id : Math.random().toString(36).substr(2, 9),
      name,
      email,
      role,
      department,
      avatar: avatarUrl || 'https://via.placeholder.com/50'
    };
    onSave(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">
            {initialUser ? 'Edit User' : 'Add Team Member'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
             <div className="relative">
               <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
               <input 
                 type="email" 
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none"
                 placeholder="john@company.com"
               />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="relative">
                 <Shield className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <select 
                   value={role}
                   onChange={(e) => setRole(e.target.value as UserRole)}
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none bg-white"
                 >
                   <option value="Admin">Admin</option>
                   <option value="Manager">Manager</option>
                   <option value="Employee">Employee</option>
                 </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <div className="relative">
                 <Briefcase className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <select 
                   value={department}
                   onChange={(e) => setDepartment(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none bg-white"
                 >
                   <option value="Board">Board</option>
                   <option value="Product">Product</option>
                   <option value="Marketing">Marketing</option>
                   <option value="Sales">Sales</option>
                   <option value="IT">IT</option>
                 </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">{initialUser ? 'Save Changes' : 'Add Member'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
