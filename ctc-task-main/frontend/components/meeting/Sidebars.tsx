import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, MessageSquare, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { User } from '../../types';
import { Avatar } from '../UI';
import { AudioSpeakerWrapper } from './AudioSpeakerWrapper';

export interface SidebarsProps {
  showChat: boolean; setShowChat: (val: boolean) => void;
  showParticipants: boolean; setShowParticipants: (val: boolean) => void;
  messages: any[]; newMessage: string; setNewMessage: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  streamRef: React.MutableRefObject<MediaStream | null>;
  isMicOn: boolean;
  user: User | null | undefined;
  isHost: boolean;
  allUsers: User[];
  remoteStatuses: Record<string, { isMicOn: boolean; isCamOn: boolean; isHandRaised?: boolean; isSharingScreen?: boolean }>;
  activeHostId: string;
  remoteStreams: Record<string, MediaStream>;
  handleForceMute: (targetUserId: string, tool: 'mic' | 'cam' | 'kick') => void;
  t: (key: string) => string;
}

export const Sidebars: React.FC<SidebarsProps> = ({
  showChat, setShowChat, showParticipants, setShowParticipants,
  messages, newMessage, setNewMessage, handleSendMessage,
  streamRef, isMicOn, user, isHost, allUsers, remoteStatuses, activeHostId,
  remoteStreams, handleForceMute, t
}) => {
  return (
    <AnimatePresence>
      {(showChat || showParticipants) && (
        <motion.div 
          initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
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
              <AudioSpeakerWrapper stream={streamRef.current} isMuted={!isMicOn} containerClass={(isSpeaking) => `flex items-center justify-between p-2 rounded-lg transition-colors ${isSpeaking ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                     <Avatar src={user?.avatar} size="sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user?.name} ({t('you')})</p>
                    <p className="text-[10px] text-brand-500 font-medium">{isHost ? 'Host' : 'Participant'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {isMicOn ? <Mic size={16} className="text-brand-500" /> : <MicOff size={16} className="text-red-500/80" />}
                </div>
              </AudioSpeakerWrapper>
              
              {allUsers.filter(u => !!remoteStatuses[u.id] && u.id !== user?.id).map(u => {
                const status = remoteStatuses[u.id] || { isMicOn: false, isCamOn: false };
                const isTargetHost = u.id === activeHostId;
                return (
                  <AudioSpeakerWrapper key={u.id} stream={remoteStreams[u.id]} isMuted={!status.isMicOn} containerClass={(isSpeaking) => `flex items-center justify-between p-2 rounded-lg transition-colors ${isSpeaking ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar src={u.avatar} size="sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        <p className="text-[10px] text-gray-400">{isTargetHost ? 'Host' : u.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status.isMicOn ? (
                        isHost ? (
                          <button onClick={() => handleForceMute(u.id, 'mic')} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded group" title="Tắt Mic của người này">
                            <Mic size={16} className="group-hover:hidden" />
                            <MicOff size={16} className="hidden group-hover:block" />
                          </button>
                        ) : (
                          <div className="p-1"><Mic size={16} className="text-brand-500" /></div>
                        )
                      ) : (
                        <div className="p-1"><MicOff size={16} className="text-red-500/80" /></div>
                      )}

                      {status.isCamOn ? (
                        isHost ? (
                          <button onClick={() => handleForceMute(u.id, 'cam')} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded group" title="Tắt Camera của người này">
                            <Video size={16} className="group-hover:hidden" />
                            <VideoOff size={16} className="hidden group-hover:block" />
                          </button>
                        ) : (
                          <div className="p-1"><Video size={16} className="text-brand-500" /></div>
                        )
                      ) : (
                        <div className="p-1"><VideoOff size={16} className="text-red-500/80" /></div>
                      )}
                      
                      {isHost && (
                        <button onClick={() => handleForceMute(u.id, 'kick')} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded group ml-1" title="Mời ra khỏi phòng">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </AudioSpeakerWrapper>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
