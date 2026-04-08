
import React, { useState, useEffect } from 'react';
import { Video, Plus, Calendar, Clock, Users, Trash2, ExternalLink, Zap } from 'lucide-react';
import { Meeting, User } from '../types';
import { subscribeToMeetings, deleteMeeting, saveMeeting } from '../services/meetingService';
import { Button, Card, Avatar } from './UI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingViewProps {
  onJoinMeeting: (meeting: Meeting) => void;
  onCreateMeeting: () => void;
  allUsers: User[];
}

export const MeetingView: React.FC<MeetingViewProps> = ({ onJoinMeeting, onCreateMeeting, allUsers }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const { user } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    const unsubscribe = subscribeToMeetings(setMeetings);
    return () => unsubscribe();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleQuickMeeting = async () => {
    if (!user) return;
    
    const meetingId = Math.random().toString(36).substring(2, 11);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const newMeeting: Meeting = {
      id: meetingId,
      title: `${t('quickMeeting')} - ${user.name}`,
      description: '',
      startTime: now.toISOString(),
      endTime: oneHourLater.toISOString(),
      hostId: user.id,
      participants: [user.id],
      meetingLink: `meet.orangetask.com/${meetingId}`,
      status: 'ongoing'
    };

    await saveMeeting(newMeeting);
    onJoinMeeting(newMeeting);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-lg shadow-gray-200/50">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{t('meetings')}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">{t('manageMeetingsDesc')}</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleQuickMeeting} className="flex items-center gap-2 border-brand-200 text-brand-600 hover:bg-brand-50">
            <Zap size={20} className="fill-brand-500 text-brand-500" />
            {t('quickMeeting')}
          </Button>
          <Button onClick={onCreateMeeting} className="flex items-center gap-2">
            <Plus size={20} />
            {t('scheduleMeeting')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white/50 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-gray-200">
            <Video size={48} className="mb-4 opacity-20" />
            <p>{t('noMeetings')}</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white/60 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 truncate pr-8">{meeting.title}</h3>
                {user?.id === meeting.hostId && (
                  <button 
                    onClick={() => deleteMeeting(meeting.id)}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                </div>
                
                <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10">
                  {meeting.description || t('noDescription')}
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} className="text-brand-400" />
                    <span>{formatDate(meeting.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} className="text-brand-400" />
                    <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} className="text-brand-400" />
                    <span>{meeting.participants.length} {t('participants')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex -space-x-2">
                    {meeting.participants.slice(0, 3).map((uid) => {
                      const u = allUsers.find(u => u.id === uid);
                      return u ? (
                        <Avatar key={uid} src={u.avatar} size="sm" className="border-2 border-white" />
                      ) : null;
                    })}
                    {meeting.participants.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                        +{meeting.participants.length - 3}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => onJoinMeeting(meeting)}
                  >
                    <ExternalLink size={14} />
                    {t('join')}
                  </Button>
                </div>
              </div>
          ))
        )}
      </div>
    </div>
  );
};
