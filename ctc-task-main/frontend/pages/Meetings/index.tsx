import React, { useState, useEffect } from 'react';
import { Video, Plus, Calendar, Keyboard, Link2, Check, Copy, X, MoreVertical, Trash2 } from 'lucide-react';
import { Meeting, User } from '../../types';
import { subscribeToMeetings, deleteMeeting, saveMeeting, sendSignal } from '../../services/meetingService';
import { Button, Avatar } from "../../components/UI";
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface MeetingViewProps {
  onJoinMeeting: (meeting: Meeting) => void;
  onCreateMeeting: () => void;
  allUsers: User[];
}

export const MeetingView: React.FC<MeetingViewProps> = ({ onJoinMeeting, onCreateMeeting, allUsers }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  
  const { user } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    const unsubscribe = subscribeToMeetings(setMeetings);
    return () => unsubscribe();
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const createMeetingData = (isInstant: boolean) => {
    if (!user) return null;
    const meetingId = Math.random().toString(36).substring(2, 11);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    return {
      id: meetingId,
      title: `${isInstant ? t('quickMeeting') : t('scheduleMeeting')} - ${user.name}`,
      description: '',
      startTime: now.toISOString(),
      endTime: oneHourLater.toISOString(),
      hostId: user.id,
      participants: [user.id],
      meetingLink: `meet.orangetask.com/${meetingId}`,
      status: 'ongoing' as const
    };
  };

  const handleInstantMeeting = async () => {
    const newMeeting = createMeetingData(true);
    if (newMeeting) {
      await saveMeeting(newMeeting);
      onJoinMeeting(newMeeting);
    }
  };

  const handleCreateForLater = async () => {
    const newMeeting = createMeetingData(false);
    if (newMeeting) {
      await saveMeeting(newMeeting);
      setCreatedMeeting(newMeeting);
    }
  };

  const handleJoinByLink = () => {
    if (!joinLink.trim()) return;
    const segments = joinLink.split('/');
    const code = segments[segments.length - 1];
    const meeting = meetings.find((m: any) => m.id === code || m.meetingLink.includes(code));
    if (meeting) {
      onJoinMeeting(meeting);
    } else {
      alert(language === 'vi' ? 'Không tìm thấy cuộc họp!' : 'Meeting not found!');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const todayUpcoming = meetings.filter(m => {
    const date = new Date(m.startTime);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)] lg:min-h-[calc(100vh-8rem)] bg-white rounded-3xl relative shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Left Side: Call to Action (like Google Meet) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left px-8 lg:px-16 py-12 border-b lg:border-b-0 lg:border-r border-gray-100">
          <h1 className="text-[2.5rem] lg:text-[2.75rem] font-normal text-gray-800 leading-tight mb-4 max-w-[500px]">
            {language === 'vi' ? 'Cuộc gọi video và cuộc họp cho tất cả mọi người' : 'Video calls and meetings for everyone'}
          </h1>
          <p className="text-[1.15rem] text-gray-500 mb-10 max-w-[480px]">
            {language === 'vi' ? 'Kết nối, cộng tác và ăn mừng từ mọi nơi bằng hệ thống của chúng tôi' : 'Connect, collaborate, and celebrate from anywhere with our system'}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto z-50">
              <Button onClick={() => setShowDropdown(!showDropdown)} className="bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md px-5 py-3 font-medium text-[15px] flex items-center justify-center gap-2 shadow-none h-12 w-full sm:w-auto">
                <Video size={20} /> {language === 'vi' ? 'Cuộc họp mới' : 'New meeting'}
              </Button>
              
              {showDropdown && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-[280px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] py-2 border border-gray-100 z-[100] animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => { handleCreateForLater(); setShowDropdown(false); }} className="w-full text-left px-5 py-3 hover:bg-[#f3f4f6] flex items-center gap-4 text-[15px] font-medium text-[#3c4043] transition-colors">
                     <Link2 size={20} className="text-[#5f6368]" /> {language === 'vi' ? 'Tạo một cuộc họp để sử dụng sau' : 'Create a meeting for later'}
                  </button>
                  <button onClick={() => { handleInstantMeeting(); setShowDropdown(false); }} className="w-full text-left px-5 py-3 hover:bg-[#f3f4f6] flex items-center gap-4 text-[15px] font-medium text-[#3c4043] transition-colors">
                     <Plus size={20} className="text-[#5f6368]" /> {language === 'vi' ? 'Bắt đầu một cuộc họp tức thì' : 'Start an instant meeting'}
                  </button>
                  <button onClick={() => { onCreateMeeting(); setShowDropdown(false); }} className="w-full text-left px-5 py-3 hover:bg-[#f3f4f6] flex items-center gap-4 text-[15px] font-medium text-[#3c4043] transition-colors">
                     <Calendar size={20} className="text-[#5f6368]" /> {language === 'vi' ? 'Lên lịch cuộc họp' : 'Schedule meeting'}
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex-1 max-w-[280px] w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2"><Keyboard size={20} className="text-gray-500" /></div>
              <input 
                type="text" 
                value={joinLink} 
                onChange={(e: any) => setJoinLink(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleJoinByLink()}
                placeholder={language === 'vi' ? 'Nhập một mã hoặc đường link' : 'Enter a code or link'} 
                className="w-full pl-10 pr-4 h-12 rounded-md border border-gray-400 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none text-[16px] placeholder-gray-600" 
              />
            </div>

            <button 
              disabled={!joinLink.trim()}
              onClick={handleJoinByLink}
              className={`px-4 h-12 font-medium text-[15px] rounded-md transition-colors ${joinLink.trim() ? 'text-[#1a73e8] hover:bg-[#e8f0fe] hover:text-[#174ea6]' : 'text-gray-400 cursor-not-allowed'}`}
            >
              {language === 'vi' ? 'Tham gia' : 'Join'}
            </button>
          </div>
        </div>

        {/* Right Side: Upcoming Meetings */}
        <div className="w-full lg:w-1/2 bg-slate-50/50 flex flex-col p-8 lg:p-16 h-full rounded-r-3xl">
          <h2 className="text-[1.25rem] font-medium text-gray-800 mb-6">{language === 'vi' ? 'Cuộc họp sắp tới hôm nay' : 'Upcoming meetings today'}</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {todayUpcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-10">
                 <img src="https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg" alt="Meet" className="w-48 mb-6 pointer-events-none select-none" />
                 <h3 className="text-[18px] font-medium text-gray-800 mb-2">{language === 'vi' ? 'Nhận đường liên kết để chia sẻ' : 'Get a link you can share'}</h3>
                 <p className="text-[14px] text-gray-600 max-w-[280px] leading-relaxed">
                   {language === 'vi' ? 'Nhấp vào Cuộc họp mới để nhận đường liên kết mà bạn có thể gửi cho những người mình muốn họp cùng' : 'Click New meeting to get a link you can send to people you want to meet with'}
                 </p>
              </div>
            ) : (
              todayUpcoming.map((meeting) => (
                <div key={meeting.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                  <div className="w-[4px] h-10 bg-[#1a73e8] rounded-full mt-1"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-gray-800 text-[15px] truncate pr-2">{meeting.title}</h4>
                      {user?.id === meeting.hostId && (
                        <button onClick={async () => {
                           if(window.confirm('Delete?')) {
                              await sendSignal(meeting.id, { id: 'sys', from: user?.id, to: 'all', type: 'meeting_deleted', data: {} });
                              deleteMeeting(meeting.id);
                           }
                        }} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"><Trash2 size={16}/></button>
                      )}
                    </div>
                    <div className="text-[13px] text-gray-500 flex items-center gap-2 mb-3">
                      <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[12px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md max-w-[120px] truncate">{meeting.meetingLink}</span>
                       <Button size="sm" onClick={() => onJoinMeeting(meeting)} className="h-8 text-xs bg-white text-[#1a73e8] hover:bg-[#e8f0fe] border border-gray-200 shadow-none">Join</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Joining Info Modal */}
      {createdMeeting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-[380px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setCreatedMeeting(null)} 
              className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Trash2 size={20} className="opacity-0" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-2 left-2 stroke-current"><path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            
            <h3 className="text-[22px] text-gray-800 font-normal mb-3 pr-6 leading-tight">
              {language === 'vi' ? "Đây là thông tin tham gia của bạn" : "Here's your joining info"}
            </h3>
            
            <p className="text-gray-600 text-[15px] mb-8 leading-relaxed">
              {language === 'vi' 
                ? "Gửi thông tin này cho những người bạn muốn họp cùng. Hãy nhớ lưu lại để bạn cũng có thể sử dụng sau." 
                : "Send this to people you want to meet with. Be sure to save it so you can use it later, too."}
            </p>

            <div 
              className="bg-[#f1f3f4] hover:bg-[#e8eaed] rounded-md px-4 py-3 flex items-center justify-between cursor-pointer transition-colors group" 
              onClick={() => {
                navigator.clipboard.writeText(createdMeeting.meetingLink);
                setCopiedId('modal-link');
                setTimeout(() => setCopiedId(null), 2000);
              }}
            >
              <span className="text-gray-800 text-[15px] font-medium truncate mr-4">{createdMeeting.meetingLink}</span>
              <button className="text-gray-600 group-hover:text-gray-800 p-2 rounded-full transition-colors flex-shrink-0">
                {copiedId === 'modal-link' ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
