
import React, { useState, useEffect } from 'react';
import { User, Bell, Moon, Globe, Lock, Shield, Mail } from 'lucide-react';
import { Button, Card, Input, Switch, Avatar } from "../../components/UI";
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { saveUser } from '../../services/userService';

export const SettingsView: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateUserSession } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // Mock States
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio("Passionate about building great user experiences."); // Mock bio
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = () => {
    if (user) {
       const updatedUser = { ...user, name };
       saveUser(updatedUser); // Save to local storage
       updateUserSession(updatedUser); // Update context/session
       // Could add a toast notification here
    }
  };

  const TABS = [
    { id: 'profile', label: t('myProfile'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'appearance', label: t('appearance'), icon: Moon },
    { id: 'security', label: t('security'), icon: Lock },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
              <Avatar src={user.avatar} alt={user.name} size={24} />
              <div>
                <Button variant="secondary" size="sm" className="mb-2">Change Avatar</Button>
                <p className="text-xs text-gray-500">JPG, GIF or PNG. Max size of 800K</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)} 
              />
              <Input label="Department" defaultValue={user.department} disabled className="bg-gray-50 text-gray-500" />
              <Input label="Email Address" defaultValue={user.email} disabled className="bg-gray-50 text-gray-500" />
              <Input label="Role" defaultValue={user.role} disabled className="bg-gray-50 text-gray-500" />
            </div>
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-400 outline-none h-32 resize-none"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfile}>{t('save')}</Button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-800 font-medium">Daily Digest</p>
                  <p className="text-xs text-gray-500">Get a summary of your tasks every morning.</p>
                </div>
                <Switch checked={emailNotifs} onChange={setEmailNotifs} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-800 font-medium">Marketing Emails</p>
                  <p className="text-xs text-gray-500">Receive updates about new features.</p>
                </div>
                <Switch checked={marketingEmails} onChange={setMarketingEmails} />
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <h3 className="font-medium text-gray-900">Push Notifications</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-800 font-medium">Task Assignments</p>
                  <p className="text-xs text-gray-500">Notify when someone assigns you a task.</p>
                </div>
                <Switch checked={pushNotifs} onChange={setPushNotifs} />
              </div>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-gray-100 rounded-lg">
                   <Moon size={20} className="text-gray-600"/>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-900">{t('darkMode')}</p>
                   <p className="text-xs text-gray-500">Switch between light and dark themes.</p>
                 </div>
               </div>
               <Switch checked={darkMode} onChange={setDarkMode} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
               <div className="flex gap-3">
                  {['bg-brand-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'].map(c => (
                    <button key={c} className={`w-8 h-8 rounded-full ${c} ring-2 ring-offset-2 ${c === 'bg-brand-500' ? 'ring-gray-400' : 'ring-transparent'}`} />
                  ))}
               </div>
               <p className="text-xs text-gray-500 mt-2">This will change the primary color of the application.</p>
            </div>
          </div>
        );
      default:
        return <div className="text-center py-10 text-gray-500">Section under construction</div>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('settings')}</h2>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <Card className="w-full lg:w-64 h-fit p-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all mb-1
                ${activeTab === tab.id 
                  ? 'bg-brand-50 text-brand-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </Card>

        {/* Main Content */}
        <Card className="flex-1 p-8 min-h-[500px]">
           <div className="mb-6">
             <h3 className="text-lg font-bold text-gray-900">{TABS.find(t => t.id === activeTab)?.label}</h3>
             <p className="text-sm text-gray-500">Manage your {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} settings here.</p>
           </div>
           {renderContent()}
        </Card>
      </div>
    </div>
  );
};
