import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Meeting } from '../../types';
import { getMeetingById } from '../../services/meetingService';
import { useLanguage } from '../../contexts/LanguageContext';

interface JoinMeetingPageProps {
  onJoinMeeting: (meeting: Meeting) => void;
}

export const JoinMeetingPage: React.FC<JoinMeetingPageProps> = ({ onJoinMeeting }) => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [error, setError] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!meetingId) {
      setError(true);
      return;
    }
    
    if (attempted.current) return;
    attempted.current = true;

    getMeetingById(meetingId).then((m) => {
      if (m) {
        onJoinMeeting(m);
        navigate('/meetings', { replace: true });
      } else {
        setError(true);
      }
    });
  }, [meetingId, navigate, onJoinMeeting]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
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
            onClick={() => navigate('/meetings', { replace: true })}
            className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
          >
            {language === 'vi' ? 'Quay lại' : 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#0f1015]">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-gray-400 font-medium">
        {language === 'vi' ? 'Đang kết nối phòng họp...' : 'Connecting to meeting room...'}
      </p>
    </div>
  );
};
