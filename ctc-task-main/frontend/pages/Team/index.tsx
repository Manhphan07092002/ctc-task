import React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Card, Avatar } from '../../components/UI';
import { PlusCircle, Shield, Edit, Trash2 } from 'lucide-react';
import { User } from '../../types';

interface TeamPageProps {
  t: (key: string) => string;
  user: User;
  users: User[];
  openCreateUserModal: () => void;
  openEditUserModal: (u: User) => void;
  handleDeleteUser: (userId: string) => void;
}

export default function TeamPage({
  t, user, users, openCreateUserModal, openEditUserModal, handleDeleteUser
}: TeamPageProps) {
  if (user.role === 'Employee') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t('teamMembers')}</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your team and permissions</p>
        </div>
        {user.role === 'Admin' && (
          <Button onClick={() => openCreateUserModal()}>
            <PlusCircle size={18} className="mr-2" /> Add Member
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.filter(u => user.role === 'Admin' ? true : u.department === user.department).map(u => (
          <Card key={u.id} className="p-6 flex items-center gap-4 relative group">
            <Avatar src={u.avatar} alt={u.name} size={16} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-lg truncate">{u.name}</h4>
              <p className="text-gray-500 text-sm mb-2">{u.department} • {u.email}</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'Admin' ? 'bg-brand-100 text-brand-700' : u.role === 'Manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {u.role === 'Admin' && <Shield size={10} />}
                {u.role}
              </span>
            </div>
            {user.role === 'Admin' && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg p-1">
                <button 
                  onClick={() => openEditUserModal(u)} 
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md hover:text-blue-600"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteUser(u.id)} 
                  className="p-1.5 text-gray-500 hover:bg-red-50 rounded-md hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
