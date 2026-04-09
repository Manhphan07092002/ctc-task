import React from 'react';
import { Mic, MicOff, Video, VideoOff, ChevronUp, Volume2, Calendar, Clock, Users, Settings } from 'lucide-react';
import { Meeting, User } from '../../types';
import { Avatar } from '../UI';

export interface PreJoinLobbyProps {
  meeting: Meeting;
  user: User | null | undefined;
  language: string;
  isLocalSpeaking: boolean;
  streamRef: React.MutableRefObject<MediaStream | null>;
  isMicOn: boolean;
  setIsMicOn: (val: boolean) => void;
  isCamOn: boolean;
  setIsCamOn: (val: boolean) => void;
  audioInputs: { deviceId: string; label: string; }[];
  videoInputs: { deviceId: string; label: string; }[];
  audioOutputs: { deviceId: string; label: string; }[];
  selectedAudioInput: string;
  setSelectedAudioInput: (val: string) => void;
  selectedVideoInput: string;
  setSelectedVideoInput: (val: string) => void;
  selectedAudioOutput: string;
  setSelectedAudioOutput: (val: string) => void;
  setHasJoined: (val: boolean) => void;
  setShowSettings: (val: boolean) => void;
  onLeave: () => void;
}

export const PreJoinLobby: React.FC<PreJoinLobbyProps> = ({
  meeting, user, language, isLocalSpeaking, streamRef,
  isMicOn, setIsMicOn, isCamOn, setIsCamOn,
  audioInputs, videoInputs, audioOutputs,
  selectedAudioInput, setSelectedAudioInput, selectedVideoInput, setSelectedVideoInput, selectedAudioOutput, setSelectedAudioOutput,
  setHasJoined, setShowSettings, onLeave
}) => {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short'
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-brand-50 via-white to-purple-50 text-gray-900 flex flex-col z-50 overflow-hidden font-sans items-center justify-center">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-400/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-6xl px-6 flex flex-col lg:flex-row gap-12 items-center lg:items-stretch z-10">
        
        <div className="w-full lg:w-3/5 max-w-[800px] flex flex-col gap-6">
          <div className={`relative aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md border transition-all duration-300 ${isLocalSpeaking ? 'border-brand-500 ring-4 ring-brand-500/30 shadow-[0_0_40px_rgba(139,92,246,0.3)]' : 'border-gray-200 shadow-gray-300/50'}`}>
             <video 
                ref={el => { if (el && el.srcObject !== streamRef.current) el.srcObject = streamRef.current; }}
                autoPlay muted playsInline className={`w-full h-full object-cover mirror ${!isCamOn ? 'hidden' : ''}`}
             />
             {!isCamOn && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/95 backdrop-blur-xl">
                  <Avatar src={user?.avatar} size="xl" className="border-4 border-white mb-6 scale-125 shadow-xl" />
                  <p className="text-gray-600 font-medium text-lg tracking-wide">{language === 'vi' ? 'Camera đang tắt' : 'Camera is off'}</p>
               </div>
             )}
             
             <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
               <button 
                 onClick={() => setIsMicOn(!isMicOn)}
                 className={`p-4 rounded-2xl transition-all duration-300 shadow-2xl flex items-center justify-center ${isMicOn ? 'bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 hover:border-white/40' : 'bg-red-500 hover:bg-red-600 text-white scale-95 border border-red-400'}`}
               >
                 {isMicOn ? <Mic size={26} /> : <MicOff size={26} />}
               </button>
               <button 
                 onClick={() => setIsCamOn(!isCamOn)}
                 className={`p-4 rounded-2xl transition-all duration-300 shadow-2xl flex items-center justify-center ${isCamOn ? 'bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 hover:border-white/40' : 'bg-red-500 hover:bg-red-600 text-white scale-95 border border-red-400'}`}
               >
                 {isCamOn ? <Video size={26} /> : <VideoOff size={26} />}
               </button>
             </div>
          </div>
          
          {/* Device Selection Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-gray-200/50 shadow-sm z-20">
            <div className="relative flex-1">
              <Mic size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select 
                value={selectedAudioInput} 
                onChange={e => setSelectedAudioInput(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-xl py-2.5 pl-10 pr-8 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer truncate"
              >
                {audioInputs.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId.substring(0,5)}`}</option>)}
              </select>
              <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="relative flex-1">
              <Volume2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select 
                value={selectedAudioOutput} 
                onChange={e => setSelectedAudioOutput(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-xl py-2.5 pl-10 pr-8 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer truncate"
              >
                {audioOutputs.length > 0 ? audioOutputs.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${device.deviceId.substring(0,5)}`}</option>) : <option value="default">Default Speaker</option>}
              </select>
              <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex-1">
              <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select 
                value={selectedVideoInput} 
                onChange={e => setSelectedVideoInput(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-xl py-2.5 pl-10 pr-8 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer truncate"
              >
                {videoInputs.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.substring(0,5)}`}</option>)}
              </select>
              <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
        </div>

        <div className="w-full lg:w-2/5 flex flex-col justify-center lg:py-12 px-2 2xl:px-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 tracking-tight leading-tight">{meeting.title}</h1>
            
            <div className="flex flex-col gap-3 mt-6 mb-8 lg:mx-0 mx-auto max-w-sm w-full bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-brand-500" />
                </div>
                <span className="font-medium text-[15px]">{formatDate(meeting.startTime)}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-brand-500" />
                </div>
                <span className="font-medium text-[15px]">{formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-brand-500" />
                </div>
                <span className="font-medium text-[15px]">
                  {meeting.participants.length}{' '}
                  {language === 'vi' ? 'Thành viên' : 'Participants'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 max-w-sm mx-auto lg:mx-0">
              <button 
                onClick={() => setHasJoined(true)} 
                className="group relative w-full py-4 bg-brand-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-brand-500/20 text-lg hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/30 flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-purple-500 opacity-100 transition-opacity duration-300 group-hover:opacity-90"></div>
                <div className="relative flex items-center gap-2">
                  <Video size={24} />
                  {language === 'vi' ? 'Tham gia ngay' : 'Join Now'}
                </div>
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-all border border-gray-200 shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  <Settings size={18} />
                  {language === 'vi' ? 'Cài đặt' : 'Settings'}
                </button>
                <button 
                  onClick={onLeave} 
                  className="w-full py-3.5 bg-white hover:bg-gray-50 text-red-600 font-semibold rounded-2xl transition-all border border-gray-200 shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  {language === 'vi' ? 'Thoát' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
