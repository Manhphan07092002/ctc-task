import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Users, Calendar, Clock, LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { Meeting } from '../types';
import { getMeetingById } from '../services/meetingService';
import { useLanguage } from '../contexts/LanguageContext';

interface JoinMeetingPageProps {
  onJoinMeeting: (meeting: Meeting) => void;
}

export const JoinMeetingPage: React.FC<JoinMeetingPageProps> = ({ onJoinMeeting }) => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading');

  useEffect(() => {
    if (!meetingId) { setStatus('not_found'); return; }
    getMeetingById(meetingId).then((m) => {
      if (m) { setMeeting(m); setStatus('found'); }
      else setStatus('not_found');
    });
  }, [meetingId]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

  const handleJoin = () => {
    if (meeting) {
      onJoinMeeting(meeting);
      navigate('/meetings');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-10 flex flex-col items-center gap-4 border border-white/60">
            <Loader2 size={48} className="text-brand-500 animate-spin" />
            <p className="text-gray-500 font-medium">
              {language === 'vi' ? 'Đang tìm phòng họp...' : 'Looking up meeting room...'}
            </p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-10 flex flex-col items-center gap-4 border border-white/60 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <AlertTriangle size={36} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {language === 'vi' ? 'Không tìm thấy phòng' : 'Meeting not found'}
            </h2>
            <p className="text-gray-500 text-sm">
              {language === 'vi'
                ? 'Phòng họp này không tồn tại hoặc đã bị xóa.'
                : 'This meeting room does not exist or has been deleted.'}
            </p>
            <button
              onClick={() => navigate('/meetings')}
              className="mt-4 px-6 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
            >
              {language === 'vi' ? 'Quay lại danh sách' : 'Back to meetings'}
            </button>
          </div>
        )}

        {status === 'found' && meeting && (
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/60">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-brand-500 to-purple-500 p-8 flex flex-col items-center text-white text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                <Video size={32} className="text-white" />
              </div>
              <p className="text-white/70 text-sm font-medium mb-1 uppercase tracking-widest">
                {language === 'vi' ? 'Bạn được mời vào phòng họp' : "You've been invited to"}
              </p>
              <h1 className="text-2xl font-extrabold leading-tight">{meeting.title}</h1>
            </div>

            {/* Details */}
            <div className="p-8 space-y-4">
              {meeting.description && (
                <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-3 leading-relaxed">
                  {meeting.description}
                </p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-brand-500" />
                  </div>
                  <span>{formatDate(meeting.startTime)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={15} className="text-brand-500" />
                  </div>
                  <span>{formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Users size={15} className="text-brand-500" />
                  </div>
                  <span>
                    {meeting.participants.length}{' '}
                    {language === 'vi' ? 'thành viên đã tham gia' : 'participants joined'}
                  </span>
                </div>
              </div>

              <button
                id="join-meeting-btn"
                onClick={handleJoin}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-brand-500 to-purple-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:from-brand-600 hover:to-purple-600 transition-all shadow-lg shadow-brand-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <LogIn size={20} />
                {language === 'vi' ? 'Tham gia ngay' : 'Join Now'}
              </button>

              <button
                onClick={() => navigate('/meetings')}
                className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 font-medium transition-colors"
              >
                {language === 'vi' ? 'Xem tất cả cuộc họp' : 'View all meetings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
