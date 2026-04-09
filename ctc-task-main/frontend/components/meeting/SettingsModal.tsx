import React, { useState } from 'react';
import { Volume2, Video, Settings, Subtitles, Smile, X, Mic, ChevronUp, Info, Globe, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <div onClick={onChange} className={`w-11 h-6 rounded-full relative cursor-pointer shadow-inner shrink-0 mt-1 transition-colors ${checked ? 'bg-[#1a73e8]' : 'bg-gray-300'}`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full flex items-center justify-center transition-all ${checked ? 'right-1' : 'left-1 text-gray-400'}`}>
      {checked ? <Check size={12} className="text-[#1a73e8]"/> : <X size={10}/>}
    </div>
  </div>
);

export interface SettingsModalProps {
  onClose: () => void;
  audioInputs: { deviceId: string; label: string; }[];
  videoInputs: { deviceId: string; label: string; }[];
  audioOutputs: { deviceId: string; label: string; }[];
  selectedAudioInput: string;
  setSelectedAudioInput: (val: string) => void;
  selectedVideoInput: string;
  setSelectedVideoInput: (val: string) => void;
  selectedAudioOutput: string;
  setSelectedAudioOutput: (val: string) => void;
  rawStreamRef: React.MutableRefObject<MediaStream | null>;
  openBackgroundsMenu: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  audioInputs, videoInputs, audioOutputs,
  selectedAudioInput, setSelectedAudioInput,
  selectedVideoInput, setSelectedVideoInput,
  selectedAudioOutput, setSelectedAudioOutput,
  rawStreamRef, openBackgroundsMenu
}) => {
  const [settingsTab, setSettingsTab] = useState<'audio' | 'video' | 'general' | 'captions' | 'reactions'>('audio');

  const [isStudioSoundOn, setIsStudioSoundOn] = useState(false);
  const [isPushToTalkOn, setIsPushToTalkOn] = useState(false);
  const [sendResolution, setSendResolution] = useState('Auto');
  const [receiveResolution, setReceiveResolution] = useState('Auto');
  
  const [sendDiagnostics, setSendDiagnostics] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [leaveEmptyCalls, setLeaveEmptyCalls] = useState(true);
  const [raiseHandAuto, setRaiseHandAuto] = useState(false);
  const [onlyContactsCall, setOnlyContactsCall] = useState(false);
  const [shareCameraContent, setShareCameraContent] = useState(false);
  const [speechTranslation, setSpeechTranslation] = useState(false);

  const [captionsMode, setCaptionsMode] = useState<'none'|'live'>('none');
  const [captionsLang, setCaptionsLang] = useState('English');
  const [captionFontSize, setCaptionFontSize] = useState('Default');
  const [captionFont, setCaptionFont] = useState('Default');
  const [captionFontColor, setCaptionFontColor] = useState('Default');
  const [captionBgColor, setCaptionBgColor] = useState('Default');

  const [showReactionsFromOthers, setShowReactionsFromOthers] = useState(true);
  const [animateReactions, setAnimateReactions] = useState(true);
  const [soundReactions, setSoundReactions] = useState(false);
  const [reactionAccessibility, setReactionAccessibility] = useState("Don't announce reactions");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 shadow-2xl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl max-h-[85vh] h-[750px] flex rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col py-4">
          <div className="px-6 pb-4">
            <h2 className="text-[22px] font-normal text-gray-800">Settings</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 space-y-1 mt-2">
            <button onClick={() => setSettingsTab('audio')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-[14px] font-medium transition-colors ${settingsTab === 'audio' ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Volume2 size={20} className={settingsTab === 'audio' ? 'text-[#1967d2]' : 'text-gray-500'} /> Audio
            </button>
            <button onClick={() => setSettingsTab('video')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-[14px] font-medium transition-colors ${settingsTab === 'video' ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Video size={20} className={settingsTab === 'video' ? 'text-[#1967d2]' : 'text-gray-500'} /> Video
            </button>
            <button onClick={() => setSettingsTab('general')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-[14px] font-medium transition-colors ${settingsTab === 'general' ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Settings size={20} className={settingsTab === 'general' ? 'text-[#1967d2]' : 'text-gray-500'} /> General
            </button>
            <button onClick={() => setSettingsTab('captions')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-[14px] font-medium transition-colors ${settingsTab === 'captions' ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Subtitles size={20} className={settingsTab === 'captions' ? 'text-[#1967d2]' : 'text-gray-500'} /> Captions
            </button>
            <button onClick={() => setSettingsTab('reactions')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-[14px] font-medium transition-colors ${settingsTab === 'reactions' ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Smile size={20} className={settingsTab === 'reactions' ? 'text-[#1967d2]' : 'text-gray-500'} /> Reactions
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 bg-white flex flex-col h-full overflow-hidden relative">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 pl-10 pr-12 pt-16">
             {settingsTab === 'audio' && (
               <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                 {/* Microphone */}
                 <div>
                   <h3 className="text-[#1967d2] font-medium text-sm mb-3">Microphone</h3>
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"><Mic size={18} /></div>
                       <select value={selectedAudioInput} onChange={e => setSelectedAudioInput(e.target.value)} className="w-full border border-gray-400 rounded outline-none px-10 py-3 text-gray-800 focus:border-[#1a73e8] appearance-none cursor-pointer">
                         {audioInputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>)}
                       </select>
                       <ChevronUp className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                     </div>
                     <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center shrink-0"><div className="w-4 flex justify-between items-center h-4"><div className="w-1 bg-white h-2 rounded-full animate-pulse"></div><div className="w-1 bg-white h-4 rounded-full animate-pulse delay-75"></div><div className="w-1 bg-white h-2 rounded-full animate-pulse delay-150"></div></div></div>
                   </div>
                 </div>
                 
                 {/* Studio Sound */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-medium text-[15px] mb-1">Studio sound</h4>
                     <p className="text-gray-600 text-sm">Filters out sound from your mic that isn't speech</p>
                   </div>
                   <ToggleSwitch checked={isStudioSoundOn} onChange={() => setIsStudioSoundOn(!isStudioSoundOn)} />
                 </div>

                 {/* Push to talk */}
                 <div className="flex items-start justify-between gap-6 py-2 border-b border-gray-300 pb-8">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <h4 className="text-gray-800 font-medium text-[15px]">Push to talk</h4>
                       <Info size={16} className="text-gray-500"/>
                     </div>
                     <p className="text-gray-600 text-sm">Press and hold spacebar to unmute your mic</p>
                   </div>
                   <ToggleSwitch checked={isPushToTalkOn} onChange={() => setIsPushToTalkOn(!isPushToTalkOn)} />
                 </div>

                 {/* Speaker */}
                 <div className="pt-2">
                   <h3 className="text-[#1967d2] font-medium text-sm mb-3">Speaker</h3>
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1 w-[350px]">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"><Volume2 size={18} /></div>
                       <select value={selectedAudioOutput} onChange={e => setSelectedAudioOutput(e.target.value)} className="w-full border border-gray-400 rounded outline-none px-10 py-3 text-gray-800 focus:border-[#1a73e8] appearance-none cursor-pointer">
                         {audioOutputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Speaker'}</option>)}
                       </select>
                       <ChevronUp className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                     </div>
                     <button onClick={() => { const a = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'); if((a as any).setSinkId) (a as any).setSinkId(selectedAudioOutput).catch(()=>{}); a.play(); setTimeout(()=>a.pause(), 3000); }} className="text-gray-700 font-medium px-4 hover:bg-gray-100 rounded-md py-2 transition-colors text-sm ml-6">Test</button>
                   </div>
                 </div>

                 {/* Call Control */}
                 <div className="pt-8 flex justify-between items-center text-[#1967d2] font-normal text-sm cursor-pointer w-[350px]">
                   <span>Call control</span>
                   <ChevronUp className="rotate-180" size={20} />
                 </div>
               </div>
             )}

             {settingsTab === 'video' && (
               <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                  <div className="bg-[#e8f0fe] rounded-lg p-5 flex justify-between items-center text-[15px]">
                     <span className="text-gray-800">Video enhancement has moved</span>
                     <button onClick={() => { onClose(); openBackgroundsMenu(); }} className="text-[#1967d2] font-medium hover:underline">Backgrounds and effects</button>
                  </div>
                  
                  <div>
                   <h3 className="text-[#1967d2] font-medium text-sm mb-3">Camera</h3>
                   <div className="flex gap-6 items-start">
                     <div className="relative flex-1">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"><Video size={18} /></div>
                       <select value={selectedVideoInput} onChange={e => setSelectedVideoInput(e.target.value)} className="w-full border border-gray-400 rounded outline-none px-10 py-3 text-gray-800 focus:border-[#1a73e8] appearance-none cursor-pointer">
                         {videoInputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Camera'}</option>)}
                       </select>
                       <ChevronUp className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                     </div>
                     <div className="w-[120px] h-[68px] bg-gray-200 rounded shrink-0 overflow-hidden relative border border-gray-300 shadow-sm">
                       {/* Mini View */}
                       <video autoPlay playsInline muted className="w-full h-full object-cover mirror" ref={e => {
                          if(e && rawStreamRef.current) e.srcObject = rawStreamRef.current;
                       }} />
                     </div>
                   </div>
                 </div>

                 <div>
                   <h3 className="text-[#1967d2] font-medium text-sm mb-3 mt-4">Send resolution (maximum)</h3>
                   <div className="relative w-full max-w-[400px]">
                     <select value={sendResolution} onChange={e => setSendResolution(e.target.value)} className="w-full border border-gray-400 rounded outline-none px-4 py-3 text-gray-800 focus:border-[#1a73e8] appearance-none cursor-pointer">
                       <option>Auto</option>
                       <option>High definition (720p)</option>
                       <option>Standard definition (360p)</option>
                     </select>
                     <ChevronUp className="absolute right-4 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                   </div>
                 </div>
                 
                 <div>
                   <h3 className="text-[#1967d2] font-medium text-sm mb-3">Receive resolution (maximum)</h3>
                   <div className="relative w-full max-w-[400px]">
                     <select value={receiveResolution} onChange={e => setReceiveResolution(e.target.value)} className="w-full border border-gray-400 rounded outline-none px-4 py-3 text-gray-800 focus:border-[#1a73e8] appearance-none cursor-pointer">
                       <option>Auto</option>
                       <option>High definition (720p)</option>
                       <option>Standard definition (360p)</option>
                       <option>Standard definition (360p), one video at a time</option>
                       <option>Audio only</option>
                     </select>
                     <ChevronUp className="absolute right-4 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                   </div>
                 </div>
               </div>
             )}

             {settingsTab === 'general' && (
               <div className="max-w-2xl space-y-7 animate-in fade-in duration-300">
                  {/* Option 1 */}
                  <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Send additional diagnostic info to Google</h4>
                     <p className="text-gray-600 text-[14px]">Google uses these system logs to make Meet better for everyone</p>
                   </div>
                   <ToggleSwitch checked={sendDiagnostics} onChange={() => setSendDiagnostics(!sendDiagnostics)} />
                 </div>
                 
                 {/* Option 2 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Desktop notifications</h4>
                     <p className="text-gray-600 text-[14px]">Meet can show desktop notifications to let you answer incoming video calls and take other actions in Meet</p>
                   </div>
                   <ToggleSwitch checked={desktopNotifications} onChange={() => setDesktopNotifications(!desktopNotifications)} />
                 </div>

                 {/* Option 3 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Leave empty calls</h4>
                     <p className="text-gray-600 text-[14px]">Removes you from a call after a few minutes if no one else joins</p>
                   </div>
                   <ToggleSwitch checked={leaveEmptyCalls} onChange={() => setLeaveEmptyCalls(!leaveEmptyCalls)} />
                 </div>
                 
                 {/* Option 4 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Raise your hand automatically</h4>
                     <p className="text-gray-600 text-[14px]">Show your palm to the camera instead of using the "Raise hand" button</p>
                   </div>
                   <ToggleSwitch checked={raiseHandAuto} onChange={() => setRaiseHandAuto(!raiseHandAuto)} />
                 </div>

                 {/* Option 5 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Only contacts can call me</h4>
                     <p className="text-gray-600 text-[14px]">Google Contacts and people you've interacted with in Google services</p>
                     <a className="text-[#1a73e8] hover:underline text-[14px] mt-2 block cursor-pointer">Learn more about saved contacts</a>
                   </div>
                   <ToggleSwitch checked={onlyContactsCall} onChange={() => setOnlyContactsCall(!onlyContactsCall)} />
                 </div>
                 
                 {/* Option 6 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Share content from camera</h4>
                     <p className="text-gray-600 text-[14px] flex items-center gap-2">Enable option to share content from a second camera <Info size={16} className="text-gray-500"/></p>
                     
                     <label className="flex items-start gap-4 mt-4 cursor-pointer">
                        <div className="w-5 h-5 border border-gray-400 rounded flex items-center justify-center mt-0.5 overflow-hidden">
                           <input type="checkbox" checked={shareCameraContent} onChange={() => setShareCameraContent(!shareCameraContent)} className="w-full h-full accent-[#1a73e8]" />
                        </div>
                        <span className="text-gray-600 text-[14px] leading-relaxed max-w-sm">Use Meet's audio signal processing for the audio associated with the camera content</span>
                     </label>
                   </div>
                   <ToggleSwitch checked={shareCameraContent} onChange={() => setShareCameraContent(!shareCameraContent)} />
                 </div>

                 {/* Option 7 */}
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Speech translation</h4>
                     <p className="text-gray-600 text-[14px]">Translate what you say for others</p>
                     <a className="text-[#1a73e8] hover:underline text-[14px] mt-2 block cursor-pointer">Learn more about speech translation</a>
                   </div>
                   <button onClick={() => setSpeechTranslation(!speechTranslation)} className={`border rounded-full px-5 py-2 font-medium transition-colors text-[14px] ${speechTranslation ? 'bg-[#e8f0fe] text-[#1967d2] border-transparent' : 'border-gray-400 text-gray-700 hover:bg-gray-50'}`}>{speechTranslation ? 'Translating...' : "Don't translate me"}</button>
                 </div>
                 
               </div>
             )}
             
             {settingsTab === 'captions' && (
               <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
                  <div className="relative border border-gray-400 rounded outline-none p-3 text-gray-800 focus-within:border-[#1a73e8] flex items-center justify-between group">
                    <span className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-gray-600 group-focus-within:text-[#1a73e8]">Language of the meeting</span>
                    <div className="flex items-center gap-3 w-full">
                      <Globe size={18} className="text-gray-600" />
                      <select value={captionsLang} onChange={e => setCaptionsLang(e.target.value)} className="w-full text-[15px] outline-none appearance-none cursor-pointer bg-transparent">
                         <option>English</option>
                         <option>Vietnamese</option>
                         <option>French</option>
                      </select>
                    </div>
                    <ChevronUp className="rotate-180 text-gray-500 pointer-events-none" size={16} />
                  </div>

                  <div className="space-y-4 pt-2">
                     <label className="flex items-start gap-4 cursor-pointer" onClick={() => setCaptionsMode('none')}>
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${captionsMode === 'none' ? 'border-[#1a73e8]' : 'border-gray-400'}`}>
                           {captionsMode === 'none' && <div className="w-2.5 h-2.5 bg-[#1a73e8] rounded-full"></div>}
                        </div>
                        <span className={`${captionsMode === 'none' ? 'text-[#1a73e8]' : 'text-gray-700'} text-[15px] transition-colors`}>No captions</span>
                     </label>
                     <label className="flex items-start gap-4 cursor-pointer" onClick={() => setCaptionsMode('live')}>
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 transition-colors ${captionsMode === 'live' ? 'border-[#1a73e8]' : 'border-gray-400 hover:border-gray-500 flex items-center justify-center'}`}>
                           {captionsMode === 'live' && <div className="w-2.5 h-2.5 bg-[#1a73e8] rounded-full mx-auto mt-0.5"></div>}
                        </div>
                        <div>
                          <span className={`${captionsMode === 'live' ? 'text-[#1a73e8]' : 'text-[#1a73e8]'} text-[15px] hover:underline`}>Live captions</span>
                          <p className="text-gray-600 text-[14px] mt-1.5">Shows you captions for speech in the language of the meeting.</p>
                        </div>
                     </label>
                  </div>
                  
                  <div className={`pt-8 w-full max-w-xl transition-opacity ${captionsMode === 'none' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                     <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-widest mb-4">Customize your captions</h3>
                     <p className="text-gray-700 text-[14px] mb-6">Choose your preferred settings to set how captions will appear during your calls</p>

                     <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="relative border border-gray-400 rounded outline-none p-3.5 text-gray-800 flex items-center justify-between">
                          <span className="absolute -top-2.5 left-2 bg-white px-1 text-[13px] text-gray-600">Font size</span>
                          <select value={captionFontSize} onChange={e => setCaptionFontSize(e.target.value)} className="w-full text-[15px] appearance-none outline-none cursor-pointer bg-transparent"><option>Small</option><option>Default</option><option>Large</option><option>Extra Large</option></select>
                          <ChevronUp className="rotate-180 text-gray-500 pointer-events-none" size={16} />
                        </div>
                        <div className="relative border border-gray-400 rounded outline-none p-3.5 text-gray-800 flex items-center justify-between">
                          <span className="absolute -top-2.5 left-2 bg-white px-1 text-[13px] text-gray-600">Font</span>
                          <select value={captionFont} onChange={e => setCaptionFont(e.target.value)} className="w-full text-[15px] appearance-none outline-none cursor-pointer bg-transparent"><option>Default</option><option>Serif</option><option>Monospace</option></select>
                          <ChevronUp className="rotate-180 text-gray-500 pointer-events-none" size={16} />
                        </div>
                        <div className="relative border border-gray-400 rounded outline-none p-3.5 text-gray-800 flex items-center justify-between mt-2">
                          <span className="absolute -top-2.5 left-2 bg-white px-1 text-[13px] text-gray-600">Font color</span>
                          <select value={captionFontColor} onChange={e => setCaptionFontColor(e.target.value)} className="w-full text-[15px] appearance-none outline-none cursor-pointer bg-transparent"><option>Default</option><option>Yellow</option><option>Cyan</option></select>
                          <ChevronUp className="rotate-180 text-gray-500 pointer-events-none" size={16} />
                        </div>
                        <div className="relative border border-gray-400 rounded outline-none p-3.5 text-gray-800 flex items-center justify-between mt-2">
                          <span className="absolute -top-2.5 left-2 bg-white px-1 text-[13px] text-gray-600">Background color</span>
                          <select value={captionBgColor} onChange={e => setCaptionBgColor(e.target.value)} className="w-full text-[15px] appearance-none outline-none cursor-pointer bg-transparent"><option>Default</option><option>Black</option><option>Blue</option></select>
                          <ChevronUp className="rotate-180 text-gray-500 pointer-events-none" size={16} />
                        </div>
                     </div>

                     <div className="flex justify-end pr-2">
                        <button onClick={() => { setCaptionFontSize('Default'); setCaptionFont('Default'); setCaptionFontColor('Default'); setCaptionBgColor('Default'); }} className="bg-[#f1f3f4] hover:bg-[#e8eaed] text-gray-500 px-6 py-2 rounded-full text-sm font-medium transition-colors">Reset</button>
                     </div>
                  </div>
               </div>
             )}
             
             {settingsTab === 'reactions' && (
               <div className="max-w-2xl space-y-7 animate-in fade-in duration-300">
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Show reactions from others</h4>
                     <p className="text-gray-600 text-[14px]">When off, your own reactions still appear</p>
                   </div>
                   <ToggleSwitch checked={showReactionsFromOthers} onChange={() => setShowReactionsFromOthers(!showReactionsFromOthers)} />
                 </div>
                 
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Animation</h4>
                     <p className="text-gray-600 text-[14px]">Reactions move on the screen</p>
                   </div>
                   <ToggleSwitch checked={animateReactions} onChange={() => setAnimateReactions(!animateReactions)} />
                 </div>
                 
                 <div className="flex items-start justify-between gap-6 py-2">
                   <div>
                     <h4 className="text-gray-800 font-normal text-[15px] mb-2">Sound</h4>
                     <p className="text-gray-600 text-[14px]">Sound can accompany reactions</p>
                   </div>
                   <ToggleSwitch checked={soundReactions} onChange={() => setSoundReactions(!soundReactions)} />
                 </div>
                 
                 <div className="pt-2">
                   <h4 className="text-gray-800 font-normal text-[15px] mb-2">Accessibility</h4>
                   <p className="text-gray-600 text-[14px] mb-4">Select how you want to hear reactions if you are using a screen reader</p>
                   
                   <div className="relative border border-gray-400 rounded outline-none px-4 py-3.5 text-gray-800 flex items-center justify-between w-full max-w-[400px]">
                      <select value={reactionAccessibility} onChange={e => setReactionAccessibility(e.target.value)} className="w-full text-[15px] appearance-none outline-none bg-transparent cursor-pointer">
                        <option>Don't announce reactions</option>
                        <option>Announce all reactions</option>
                        <option>Announce with a sound</option>
                      </select>
                      <ChevronUp className="rotate-180 text-gray-500 absolute right-4 pointer-events-none" size={16} />
                   </div>
                   
                   <p className="text-gray-600 text-[14px] mt-4 max-w-sm">You can also press Shift + R to change how you hear reactions</p>
                 </div>
               </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
