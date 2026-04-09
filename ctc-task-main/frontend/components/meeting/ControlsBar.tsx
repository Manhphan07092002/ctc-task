import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Settings, Share, 
  MoreVertical, Hand, Smile, Grid, Layout as LayoutIcon,
  Maximize, Minimize, Info, X, CircleDot, Disc3, Wifi, Sparkles, ChevronUp, Check, AlertTriangle, Search, AppWindow
} from 'lucide-react';
import { Meeting } from '../../types';

export const PRESET_BGS = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1571624436279-b272aff752b5?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=640',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=640',
];

export interface ControlsBarProps {
  meeting: Meeting;
  language: string;
  isMicOn: boolean; setIsMicOn: (val: boolean) => void;
  showMicMenu: boolean; setShowMicMenu: (val: boolean) => void;
  audioInputs: { deviceId: string; label: string; }[];
  audioOutputs: { deviceId: string; label: string; }[];
  selectedAudioInput: string; setSelectedAudioInput: (val: string) => void;
  selectedAudioOutput: string; setSelectedAudioOutput: (val: string) => void;
  isCamOn: boolean; setIsCamOn: (val: boolean) => void;
  showCamMenu: boolean; setShowCamMenu: (val: boolean) => void;
  videoInputs: { deviceId: string; label: string; }[];
  selectedVideoInput: string; setSelectedVideoInput: (val: string) => void;
  bgMode: string; setBgMode: (val: any) => void;
  bgImageUrl: string; setBgImageUrl: (val: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isHandRaised: boolean; setIsHandRaised: (val: boolean) => void;
  isSharingScreen: boolean; toggleScreenShare: () => void;
  isRecording: boolean; toggleRecording: () => void;
  showReactions: boolean; setShowReactions: (val: boolean) => void;
  handleReaction: (emoji: string) => void;
  showOptionsMenu: boolean; setShowOptionsMenu: (val: boolean) => void;
  setShowLivestream: (val: boolean) => void;
  setShowRecordingModal: (val: boolean) => void;
  setShowLayoutSettings: (val: boolean) => void;
  setShowReportIssue: (val: boolean) => void;
  setShowReportAbuse: (val: boolean) => void;
  setShowHelp: (val: boolean) => void;
  setShowSettings: (val: boolean) => void;
  onLeave: () => void;
  showParticipants: boolean; setShowParticipants: (val: boolean) => void;
  showChat: boolean; setShowChat: (val: boolean) => void;
  isFullScreen: boolean; toggleFullScreen: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  meeting, language,
  isMicOn, setIsMicOn, showMicMenu, setShowMicMenu,
  audioInputs, audioOutputs, selectedAudioInput, setSelectedAudioInput, selectedAudioOutput, setSelectedAudioOutput,
  isCamOn, setIsCamOn, showCamMenu, setShowCamMenu,
  videoInputs, selectedVideoInput, setSelectedVideoInput,
  bgMode, setBgMode, bgImageUrl, setBgImageUrl, handleImageUpload,
  isHandRaised, setIsHandRaised, isSharingScreen, toggleScreenShare,
  isRecording, toggleRecording, showReactions, setShowReactions, handleReaction,
  showOptionsMenu, setShowOptionsMenu, setShowLivestream, setShowRecordingModal, setShowLayoutSettings,
  setShowReportIssue, setShowReportAbuse, setShowHelp, setShowSettings, onLeave,
  showParticipants, setShowParticipants, showChat, setShowChat, isFullScreen, toggleFullScreen
}) => {
  return (
    <div className="h-24 px-8 flex items-center justify-between bg-[#202124] border-t border-white/5 shrink-0 z-40 relative">
      <div className="flex items-center gap-4 w-1/3">
        <div className="text-sm font-medium hidden md:block text-white">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {meeting.meetingLink}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-l-full transition-all border-r border-[#202124] ${isMicOn ? 'bg-gray-700 hover:bg-gray-600 focus:outline-none' : 'bg-red-500 hover:bg-red-600 focus:outline-none'}`}
          >
            {isMicOn ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-white" />}
          </button>
          <button
            onClick={() => setShowMicMenu(!showMicMenu)}
            className={`py-5 px-2 rounded-r-full transition-all focus:outline-none ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            <ChevronUp size={16} className="text-white" />
          </button>
          <AnimatePresence>
            {showMicMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full mb-4 left-0 bg-gray-800 p-2 rounded-xl shadow-xl border border-gray-700 min-w-48 z-50 text-white flex flex-col gap-1"
              >
                <p className="text-xs text-gray-400 px-2 py-1 uppercase tracking-wider font-semibold">Microphone</p>
                {audioInputs.map(device => (
                  <button key={device.deviceId} onClick={() => { setSelectedAudioInput(device.deviceId); setShowMicMenu(false) }} className={`flex items-center justify-between text-left px-2 py-2 text-sm hover:bg-gray-700 rounded truncate max-w-xs ${selectedAudioInput === device.deviceId ? 'bg-brand-500 hover:bg-brand-600' : ''}`}>
                      <span className="truncate pr-4">{device.label || 'Microphone'}</span>
                      {selectedAudioInput === device.deviceId && <Check size={14}/>}
                  </button>
                ))}
                <p className="text-xs text-gray-400 px-2 py-1 mt-2 uppercase tracking-wider font-semibold">Loa (Speaker)</p>
                {audioOutputs.map(device => (
                  <button key={device.deviceId} onClick={() => { setSelectedAudioOutput(device.deviceId); setShowMicMenu(false) }} className={`flex items-center justify-between text-left px-2 py-2 text-sm hover:bg-gray-700 rounded truncate max-w-xs ${selectedAudioOutput === device.deviceId ? 'bg-brand-500 hover:bg-brand-600' : ''}`}>
                      <span className="truncate pr-4">{device.label || 'Speaker'}</span>
                      {selectedAudioOutput === device.deviceId && <Check size={14}/>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="relative flex items-center">
          <button 
            onClick={() => setIsCamOn(!isCamOn)}
            className={`p-4 rounded-l-full transition-all border-r border-[#202124] focus:outline-none ${isCamOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isCamOn ? <Video size={24} className="text-white" /> : <VideoOff size={24} className="text-white" />}
          </button>
          <button
            onClick={() => setShowCamMenu(!showCamMenu)}
            className={`py-5 px-2 rounded-r-full transition-all focus:outline-none ${isCamOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            <ChevronUp size={16} className="text-white" />
          </button>
          <AnimatePresence>
            {showCamMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-[calc(100%+1rem)] left-0 bg-[#28292c] p-3 rounded-2xl shadow-2xl ring-1 ring-white/10 min-w-[280px] z-[100] text-white flex flex-col gap-3 origin-bottom-left"
              >
                <div>
                  <p className="text-[11px] text-gray-400 px-2 pb-2 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Video size={12}/> Camera</p>
                  <div className="flex flex-col gap-1">
                    {videoInputs.map(device => (
                      <button key={device.deviceId} onClick={() => { setSelectedVideoInput(device.deviceId); setShowCamMenu(false) }} className={`flex items-center justify-between text-left px-3 py-2.5 text-sm rounded-xl truncate transition-all ${selectedVideoInput === device.deviceId ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50' : 'hover:bg-white/5 text-gray-200'}`}>
                          <span className="truncate pr-4">{device.label || 'Camera'}</span>
                          {selectedVideoInput === device.deviceId && <Check size={16}/>}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-px bg-white/10 mx-2"></div>
                
                <div>
                  <p className="text-[11px] text-gray-400 px-2 pb-2 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Sparkles size={12}/> Phông nền & Hiệu ứng</p>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => { setBgMode('none'); setShowCamMenu(false); }} className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${bgMode === 'none' ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50' : 'hover:bg-white/5 text-gray-200'}`}>
                      <div className={`p-1.5 rounded-lg flex items-center justify-center ${bgMode === 'none' ? 'bg-brand-500/20' : 'bg-gray-700'}`}><X size={14} /></div>
                      Tắt (Mặc định)
                    </button>
                    <button onClick={() => { setBgMode('blur'); setShowCamMenu(false); }} className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${bgMode === 'blur' ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50' : 'hover:bg-white/5 text-gray-200'}`}>
                      <div className={`p-1.5 rounded-lg flex items-center justify-center ${bgMode === 'blur' ? 'bg-brand-500/20' : 'bg-gray-700'}`}><Grid size={14} /></div>
                      Làm mờ nền
                    </button>
                    <button onClick={() => setBgMode('image')} className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${bgMode === 'image' ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50' : 'hover:bg-white/5 text-gray-200'}`}>
                      <div className={`p-1.5 rounded-lg flex items-center justify-center ${bgMode === 'image' ? 'bg-brand-500/20' : 'bg-gray-700'}`}><LayoutIcon size={14} /></div>
                      Sử dụng ảnh nền
                    </button>
                    
                    {/* Sub-menu for images */}
                    <AnimatePresence>
                      {bgMode === 'image' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-4 gap-2 px-3 pt-1 pb-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                            {PRESET_BGS.map((bg) => (
                              <button 
                                key={bg} 
                                onClick={() => setBgImageUrl(bg)} 
                                className={`w-full aspect-video rounded-md overflow-hidden border-2 transition-all ${bgImageUrl === bg ? 'border-brand-500 scale-105' : 'border-transparent hover:scale-105 grayscale-[50%]'}`}
                              >
                                <img src={bg} alt="preset" className="w-full h-full object-cover" />
                              </button>
                            ))}
                            
                            <label className="w-full aspect-video rounded-md border-2 border-dashed border-gray-600 hover:border-brand-500 flex items-center justify-center cursor-pointer transition-colors bg-gray-800">
                              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleImageUpload} />
                              <span className="text-xl font-light text-gray-400">+</span>
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setIsHandRaised(!isHandRaised)}
          className={`p-4 rounded-full transition-all focus:outline-none ${isHandRaised ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
        >
          <Hand size={24} />
        </button>
        <button 
          onClick={toggleScreenShare}
          className={`p-4 rounded-full transition-all focus:outline-none ${isSharingScreen ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
        >
          <Share size={24} />
        </button>
        
        <button 
          onClick={toggleRecording}
          className={`p-4 rounded-full transition-all focus:outline-none ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-500/30' : 'bg-gray-700 hover:bg-gray-600'}`}
          title={language === 'vi' ? 'Ghi hình cuộc họp' : 'Record meeting'}
        >
          {isRecording ? <Disc3 size={24} className="animate-spin-slow text-white" /> : <CircleDot size={24} className="text-red-400" />}
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowReactions(!showReactions)}
            className={`p-4 rounded-full transition-all focus:outline-none ${showReactions ? 'bg-gray-500 flex items-center justify-center text-white' : 'bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white'}`}
          >
            <Smile size={24} />
          </button>
          <AnimatePresence>
            {showReactions && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-gray-800 p-2 rounded-2xl flex gap-2 shadow-xl border border-gray-700"
              >
                {['👍', '❤️', '😂', '😮', '👏', '🎉'].map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="p-2 text-2xl hover:bg-gray-600 rounded-lg transition-transform hover:scale-125 focus:outline-none">
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className={`p-4 rounded-full transition-all flex items-center justify-center focus:outline-none text-white ${showOptionsMenu ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Tuỳ chọn khác"
          >
            <MoreVertical size={24} />
          </button>
          <AnimatePresence>
            {showOptionsMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-[calc(100%+1rem)] left-1/2 -translate-x-1/2 bg-[#28292c] py-2 rounded-2xl shadow-2xl ring-1 ring-white/10 w-[300px] z-[100] text-white flex flex-col origin-bottom"
              >
                <button onClick={() => { setShowOptionsMenu(false); setShowLivestream(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <Wifi size={20} className="text-gray-300" /> Quản lý phát trực tuyến
                </button>
                <button onClick={() => { setShowOptionsMenu(false); setShowRecordingModal(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <CircleDot size={20} className="text-gray-300" /> Quản lý bản ghi
                </button>
                <div className="h-px bg-white/10 my-1"></div>
                <button onClick={() => { setShowOptionsMenu(false); setShowLayoutSettings(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <Grid size={20} className="text-gray-300" /> Điều chỉnh chế độ xem
                </button>
                <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); setShowOptionsMenu(false); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <Maximize size={20} className="text-gray-300" /> Toàn màn hình
                </button>
                <button onClick={() => {
                    const videoObj = document.querySelector('video');
                    if (videoObj && document.pictureInPictureEnabled) {
                      if (document.pictureInPictureElement) {
                            document.exitPictureInPicture().catch(() => {});
                      } else {
                            videoObj.requestPictureInPicture().catch(() => alert('Khởi tạo Hình trong hình thất bại.'));
                      }
                    } else {
                      alert('Không tìm thấy luồng video để phát Hình trong hình.');
                    }
                    setShowOptionsMenu(false);
                }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left w-full">
                    <AppWindow size={20} className="text-gray-300" /> Mở hình trong hình
                </button>
                <button onClick={() => { setShowOptionsMenu(false); setShowCamMenu(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <Sparkles size={20} className="text-gray-300" /> Hình nền và hiệu ứng
                </button>
                <div className="h-px bg-white/10 my-1"></div>
                <button onClick={() => { setShowOptionsMenu(false); setShowReportIssue(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <MessageSquare size={20} className="text-gray-300" /> Báo cáo sự cố
                </button>
                <button onClick={() => { setShowOptionsMenu(false); setShowReportAbuse(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <AlertTriangle size={20} className="text-gray-300" /> Báo cáo lạm dụng
                </button>
                <button onClick={() => { setShowOptionsMenu(false); setShowHelp(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left">
                    <Search size={20} className="text-gray-300" /> Khắc phục sự cố và trợ giúp
                </button>
                <button onClick={() => { setShowOptionsMenu(false); setShowSettings(true); }} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-[15px] font-medium text-left w-full">
                    <Settings size={20} className="text-gray-300" /> Cài đặt
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={onLeave}
          className="p-4 px-8 rounded-full bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2 focus:outline-none"
        >
          <PhoneOff size={24} className="text-white" />
          <span className="font-bold whitespace-nowrap text-white">{language === 'vi' ? 'Rời khỏi' : 'Leave Call'}</span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 w-1/3 text-white">
        <button 
          onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
          className={`p-3 rounded-full transition-colors focus:outline-none ${showParticipants ? 'bg-brand-500/20 text-brand-400' : 'hover:bg-white/10'}`}
        >
          <Users size={20} />
        </button>
        <button 
          onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
          className={`p-3 rounded-full transition-colors focus:outline-none ${showChat ? 'bg-brand-500/20 text-brand-400' : 'hover:bg-white/10'}`}
        >
          <MessageSquare size={20} />
        </button>
        <button 
          onClick={toggleFullScreen}
          className="p-3 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
        >
          {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors focus:outline-none text-white">
          <Info size={20} />
        </button>
      </div>
    </div>
  );
};
