
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Settings, Share, 
  MoreVertical, Hand, Smile, Grid, Layout as LayoutIcon,
  Maximize, Minimize, Shield, Info, X
} from 'lucide-react';
import { Meeting, User } from '../types';
import { Button, Avatar, Card } from './UI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToSignals, sendSignal } from '../services/meetingService';

interface MeetingRoomProps {
  meeting: Meeting;
  onLeave: () => void;
  allUsers: User[];
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, onLeave, allUsers }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<{id: string, user: string, text: string, time: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [remoteStatuses, setRemoteStatuses] = useState<Record<string, {isMicOn: boolean, isCamOn: boolean}>>({});
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    startStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = isMicOn);
      streamRef.current.getVideoTracks().forEach(track => track.enabled = isCamOn);
    }
    
    // Broadcast status change
    if (user) {
      sendSignal(meeting.id, {
        id: Math.random().toString(36).substr(2, 9),
        from: user.id,
        to: 'all',
        type: 'status_update',
        data: { isMicOn, isCamOn }
      });
    }
  }, [isMicOn, isCamOn, user, meeting.id]);

  // Subscribe to signals
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToSignals(meeting.id, (signals) => {
      signals.forEach(signal => {
        if (signal.from === user.id) return; // Ignore own signals

        if (signal.type === 'chat_message') {
          setMessages(prev => {
            if (prev.some(m => m.id === signal.id)) return prev;
            return [...prev, signal.data];
          });
        } else if (signal.type === 'status_update') {
          setRemoteStatuses(prev => ({
            ...prev,
            [signal.from]: signal.data
          }));
        }
      });
    });

    return () => unsubscribe();
  }, [meeting.id, user]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    const msg = {
      id: Date.now().toString(),
      user: user.name,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');

    // Broadcast message
    sendSignal(meeting.id, {
      id: msg.id,
      from: user.id,
      to: 'all',
      type: 'chat_message',
      data: msg
    });
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className="fixed inset-0 bg-[#202124] text-white flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between bg-transparent pointer-events-none absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="bg-brand-500 p-2 rounded-lg">
            <Video size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-medium text-lg">{meeting.title}</h2>
            <p className="text-xs text-gray-400">{meeting.meetingLink}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Shield size={20} className="text-brand-400" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex relative overflow-hidden p-4 pt-20 pb-24">
        <div className={`flex-grow grid gap-4 transition-all duration-300 ${showChat || showParticipants ? 'mr-80' : ''}`}
             style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          {/* Local Video */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border border-white/5 aspect-video">
            {isCamOn ? (
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Avatar src={user?.avatar} size="xl" className="border-4 border-brand-500/30" />
                <p className="text-xl font-medium text-gray-400">{user?.name} ({t('you')})</p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
              {!isMicOn && <MicOff size={14} className="text-red-500" />}
              <span>{user?.name} ({t('you')})</span>
            </div>
          </div>

          {/* Mock Participants */}
          {allUsers.filter(u => meeting.participants.includes(u.id) && u.id !== user?.id).map((u, idx) => {
            const status = remoteStatuses[u.id] || { isMicOn: false, isCamOn: false };
            return (
              <div key={u.id} className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border border-white/5 aspect-video">
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900">
                  <Avatar src={u.avatar} size="xl" className="border-4 border-white/10" />
                  <p className="text-xl font-medium text-gray-400">{u.name}</p>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                  {!status.isMicOn && <MicOff size={14} className="text-red-500" />}
                  <span>{u.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar (Chat/Participants) */}
        <AnimatePresence>
          {(showChat || showParticipants) && (
            <motion.div 
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              className="absolute right-4 top-20 bottom-24 w-80 bg-white rounded-2xl shadow-2xl flex flex-col text-gray-900 z-20"
            >
              <div className="p-4 border-bottom border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  {showChat ? t('chat') : t('participants')}
                </h3>
                <button 
                  onClick={() => { setShowChat(false); setShowParticipants(false); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {showChat && (
                <>
                  <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs">{msg.user}</span>
                          <span className="text-[10px] text-gray-400">{msg.time}</span>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg text-sm max-w-[90%] break-words">
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-6">
                        <MessageSquare size={48} className="mb-4 opacity-10" />
                        <p className="text-sm">{t('noMessagesYet')}</p>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('sendAMessage')}
                        className="flex-grow bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                      />
                      <button type="submit" className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors">
                        <Share size={18} />
                      </button>
                    </div>
                  </form>
                </>
              )}

              {showParticipants && (
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar src={user?.avatar} size="sm" />
                      <div>
                        <p className="text-sm font-bold">{user?.name} ({t('you')})</p>
                        <p className="text-[10px] text-brand-500 font-medium">Host</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMicOn ? <Mic size={16} className="text-gray-400" /> : <MicOff size={16} className="text-red-500" />}
                    </div>
                  </div>
                  {allUsers.filter(u => meeting.participants.includes(u.id) && u.id !== user?.id).map(u => {
                    const status = remoteStatuses[u.id] || { isMicOn: false, isCamOn: false };
                    return (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar} size="sm" />
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-[10px] text-gray-400">{u.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.isMicOn ? <Mic size={16} className="text-gray-400" /> : <MicOff size={16} className="text-red-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Bar */}
      <div className="h-24 px-8 flex items-center justify-between bg-[#202124] border-t border-white/5">
        <div className="flex items-center gap-4 w-1/3">
          <div className="text-sm font-medium hidden md:block">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {meeting.meetingLink}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button 
            onClick={() => setIsCamOn(!isCamOn)}
            className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all">
            <Hand size={24} />
          </button>
          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all">
            <Share size={24} />
          </button>
          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all">
            <Smile size={24} />
          </button>
          <button 
            onClick={onLeave}
            className="p-4 px-8 rounded-full bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2"
          >
            <PhoneOff size={24} />
            <span className="font-bold hidden sm:inline">{t('leave')}</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 w-1/3">
          <button 
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            className={`p-3 rounded-full transition-colors ${showParticipants ? 'bg-brand-500/20 text-brand-400' : 'hover:bg-white/10'}`}
          >
            <Users size={20} />
          </button>
          <button 
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            className={`p-3 rounded-full transition-colors ${showChat ? 'bg-brand-500/20 text-brand-400' : 'hover:bg-white/10'}`}
          >
            <MessageSquare size={20} />
          </button>
          <button 
            onClick={toggleFullScreen}
            className="p-3 hover:bg-white/10 rounded-full transition-colors"
          >
            {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};
