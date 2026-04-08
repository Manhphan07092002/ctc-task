
import React, { useState } from 'react';
import { X, Video, Calendar, Clock, Users, FileText } from 'lucide-react';
import { Meeting, User } from '../types';
import { saveMeeting } from '../services/meetingService';
import { Button, Modal, Input, TextArea } from './UI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose, allUsers }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [participants, setParticipants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    const newMeeting: Meeting = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      hostId: user.id,
      participants: [...new Set([user.id, ...participants])],
      meetingLink: Math.random().toString(36).substr(2, 12),
      status: 'scheduled'
    };

    try {
      await saveMeeting(newMeeting);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setStartTime(new Date().toISOString().slice(0, 16));
      setEndTime(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
      setParticipants([]);
    } catch (error) {
      console.error('Failed to save meeting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (uid: string) => {
    setParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('scheduleMeeting')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Video size={16} className="text-brand-500" />
              {t('meetingTitle')}
            </label>
            <Input 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder={t('meetingTitlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <FileText size={16} className="text-brand-500" />
              {t('description')}
            </label>
            <TextArea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder={t('meetingDescriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-brand-500" />
                {t('startTime')}
              </label>
              <Input 
                type="datetime-local" 
                required 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock size={16} className="text-brand-500" />
                {t('endTime')}
              </label>
              <Input 
                type="datetime-local" 
                required 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              {t('inviteParticipants')}
            </label>
            <div className="max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
              {allUsers.filter(u => u.id !== user?.id).map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={participants.includes(u.id)} 
                    onChange={() => toggleParticipant(u.id)}
                    className="rounded text-brand-500 focus:ring-brand-500"
                  />
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.department}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('scheduling') : t('schedule')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
