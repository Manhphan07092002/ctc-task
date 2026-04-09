
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Settings, Share, 
  MoreVertical, Hand, Smile, Grid, Layout as LayoutIcon,
  Maximize, Minimize, Shield, Info, X, Calendar, Clock, CircleDot, Disc3, Wifi, Sparkles, ChevronUp, Check, AlertTriangle, Search, AppWindow, Square, Volume2, Subtitles, Globe
} from 'lucide-react';
import { useDeviceSelection } from '../hooks/useDeviceSelection';
import { useVirtualBackground, BgMode } from '../hooks/useVirtualBackground';
import { Meeting, User } from '../types';
import { Button, Avatar, Card } from './UI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToSignals, sendSignal, saveMeeting } from '../services/meetingService';

interface MeetingRoomProps {
  meeting: Meeting;
  onLeave: () => void;
  allUsers: User[];
}

const PRESET_BGS = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=640', // Bright open office
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=640', // Bright meeting room
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=640', // Corporate boardroom
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=640', // Minimalist desk Space
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=640', // Modern conference room
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=640', // Clean coworking space
  'https://images.unsplash.com/photo-1571624436279-b272aff752b5?auto=format&fit=crop&q=80&w=640', // Cozy tech office
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=640', // Tech startup workspace
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=640', // Startup team room
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=640', // White minimalist office
];

function useAudioLevel(stream: MediaStream | null | undefined, isMuted: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || isMuted || stream.getAudioTracks().length === 0) {
      setIsSpeaking(false);
      return;
    }

    let audioContext: AudioContext;
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;
    
    let source: MediaStreamAudioSourceNode;
    try {
       source = audioContext.createMediaStreamSource(stream);
       source.connect(analyser); 
    } catch (e) {
       return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const checkInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      setIsSpeaking(average > 15);
    }, 150);

    return () => {
      clearInterval(checkInterval);
      try { source.disconnect(); } catch(e){}
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, isMuted]);

  return isSpeaking;
}

const AudioSpeakerWrapper = ({ stream, isMuted, children, containerClass, onSpeakStateChange, userId }: {stream: MediaStream | null | undefined, isMuted: boolean, children: any, containerClass: (isSpeaking: boolean) => string, onSpeakStateChange?: (id: string, isSpeaking: boolean) => void, userId?: string}) => {
  const isSpeaking = useAudioLevel(stream, isMuted);
  
  useEffect(() => {
    if (onSpeakStateChange && userId) {
      onSpeakStateChange(userId, isSpeaking);
    }
  }, [isSpeaking, userId, onSpeakStateChange]);

  return <div className={containerClass(isSpeaking)}>{children}</div>;
};

const NetworkIndicator = ({ quality }: { quality?: 'good' | 'average' | 'poor' }) => {
  if (!quality) return null;
  if (quality === 'poor') return <Wifi size={14} className="text-red-500" />;
  if (quality === 'average') return <Wifi size={14} className="text-yellow-400" />;
  return <Wifi size={14} className="text-green-500" />;
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <div onClick={onChange} className={`w-11 h-6 rounded-full relative cursor-pointer shadow-inner shrink-0 mt-1 transition-colors ${checked ? 'bg-[#1a73e8]' : 'bg-gray-300'}`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full flex items-center justify-center transition-all ${checked ? 'right-1' : 'left-1 text-gray-400'}`}>
      {checked ? <Check size={12} className="text-[#1a73e8]"/> : <X size={10}/>}
    </div>
  </div>
);

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, onLeave, allUsers }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<{id: string, user: string, text: string, time: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [remoteStatuses, setRemoteStatuses] = useState<Record<string, {isMicOn: boolean, isCamOn: boolean, isHandRaised?: boolean, isSharingScreen?: boolean}>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{id: string, userId: string, emoji: string}[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleSpeakStateChange = React.useCallback((id: string, isSpeaking: boolean) => {
    setActiveSpeakerId(prev => {
      if (isSpeaking) return id;
      return prev;
    });
  }, []);
  

  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const statusRef = useRef({ isMicOn: true, isCamOn: true, isHandRaised: false, isSharingScreen: false });
  const isSharingRef = useRef(false);
  
  const [hasJoined, setHasJoined] = useState(false);
  const hasJoinedRef = useRef(false);

  const rawStreamRef = useRef<MediaStream | null>(null);
  const [rawStreamTrigger, setRawStreamTrigger] = useState(0);
  const [bgMode, setBgMode] = useState<BgMode>('none');
  const [bgImageUrl, setBgImageUrl] = useState<string>('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000');
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCamMenu, setShowCamMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showReportAbuse, setShowReportAbuse] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLivestream, setShowLivestream] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBgImageUrl(url);
      setBgMode('image');
    }
  };

  const {
    audioInputs, videoInputs, audioOutputs,
    selectedAudioInput, setSelectedAudioInput,
    selectedVideoInput, setSelectedVideoInput,
    selectedAudioOutput, setSelectedAudioOutput
  } = useDeviceSelection();

  const { processedStream } = useVirtualBackground(rawStreamRef.current, isCamOn, bgMode, bgImageUrl);

  useEffect(() => {
    if (!rawStreamRef.current) return;
    
    const videoTrack = processedStream?.getVideoTracks()[0] || rawStreamRef.current.getVideoTracks()[0];
    const audioTrack = rawStreamRef.current.getAudioTracks()[0];

    const tracks = [];
    if (videoTrack) tracks.push(videoTrack);
    if (audioTrack) tracks.push(audioTrack);

    const newStream = new MediaStream(tracks);
    streamRef.current = newStream;

    if (localVideoRef.current && localVideoRef.current.srcObject !== newStream) {
        localVideoRef.current.srcObject = newStream;
    }

    Object.values(peersRef.current).forEach(peer => {
       const senders = peer.getSenders();
       const videoSender = senders.find(s => s.track?.kind === 'video');
       if (videoSender && videoTrack && videoSender.track?.id !== videoTrack.id) {
           videoSender.replaceTrack(videoTrack).catch(e => console.error("Replace track err:", e));
       }
    });
  }, [processedStream, rawStreamTrigger]);

  const [networkQuality, setNetworkQuality] = useState<Record<string, 'good' | 'average' | 'poor'>>({});

  useEffect(() => {
    if (!hasJoined) return;
    const interval = setInterval(async () => {
      const newQualities: Record<string, 'good' | 'average' | 'poor'> = {};
      for (const [userId, peer] of Object.entries(peersRef.current)) {
        if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected') {
           newQualities[userId] = 'poor';
           continue;
        }
        try {
          const stats = await peer.getStats();
          let pLost = 0, pReceived = 0;
          stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
               pLost += report.packetsLost || 0;
               pReceived += report.packetsReceived || 0;
            }
          });
          if (pReceived > 0) {
             const lossRate = pLost / (pReceived + pLost);
             if (lossRate > 0.05) newQualities[userId] = 'poor';
             else if (lossRate > 0.01) newQualities[userId] = 'average';
             else newQualities[userId] = 'good';
          } else {
             newQualities[userId] = 'good';
          }
        } catch (e) {
          newQualities[userId] = 'good';
        }
      }
      setNetworkQuality(newQualities);
    }, 5000);
    return () => clearInterval(interval);
  }, [hasJoined]);
  
  const isLocalSpeaking = useAudioLevel(streamRef.current, !isMicOn);

  useEffect(() => {
    hasJoinedRef.current = hasJoined;
  }, [hasJoined]);

  useEffect(() => {
    isSharingRef.current = isSharingScreen;
    statusRef.current = { isMicOn, isCamOn, isHandRaised, isSharingScreen };
  }, [isMicOn, isCamOn, isHandRaised, isSharingScreen]);

  useEffect(() => {
    if (!user || !hasJoined) return;
    // Use existing PUT endpoint: fetch current state first then update atomically
    fetch(`/api/meetings/${meeting.id}`)
      .then(r => r.json())
      .then(data => {
        const parts: string[] = data.participants || [];
        if (!parts.includes(user.id)) {
          fetch(`/api/meetings/${meeting.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, participants: [...parts, user.id] }),
          }).catch(e=>{});
        }
      }).catch(e=>{});
  }, [user, meeting.id]);

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
        rawStreamRef.current = stream;
        setRawStreamTrigger(prev => prev + 1);
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
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(peer => peer.close());

      if (user && hasJoinedRef.current) {
        // Run in background without awaiting, best effort to notify others we left
        fetch(`/api/meetings/${meeting.id}/signals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: Math.random().toString(36).substring(2),
            from: user.id,
            to: 'all',
            type: 'user_left',
            data: {}
          }),
          keepalive: true
        }).catch(e => {});

        // Safely remove self from DB participants array via existing PUT endpoint
        fetch(`/api/meetings/${meeting.id}`, { keepalive: true })
          .then(r => r.json())
          .then(data => {
            const parts: string[] = (data.participants || []).filter((p: string) => p !== user.id);
            fetch(`/api/meetings/${meeting.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...data, participants: parts }),
              keepalive: true
            });
          }).catch(e=>{});
      }
    };
  }, [user, meeting.id]);

  useEffect(() => {
    if (!hasJoinedRef.current) return;
    const changeMediaDevice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput }, width: 640, height: 480 } : { width: 640, height: 480 }, 
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true 
        });
        if (rawStreamRef.current) rawStreamRef.current.getTracks().forEach(t => t.stop());
        rawStreamRef.current = stream;
        setRawStreamTrigger(prev => prev + 1);
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error changing media devices:", err);
      }
    };
    changeMediaDevice();
  }, [selectedVideoInput, selectedAudioInput]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = isMicOn);
      streamRef.current.getVideoTracks().forEach(track => track.enabled = isCamOn);
    }
    
    // Broadcast status change ONLY if already joined
    if (user && hasJoined) {
      sendSignal(meeting.id, {
        id: Math.random().toString(36).substr(2, 9),
        from: user.id,
        to: 'all',
        type: 'status_update',
        data: { isMicOn, isCamOn, isHandRaised, isSharingScreen }
      });
    }
  }, [isMicOn, isCamOn, isHandRaised, isSharingScreen, user, meeting.id, hasJoined]);

  // Subscribe to signals
  useEffect(() => {
    if (!user || !hasJoined) return;

    const createPeer = (userId: string, isInitiator: boolean) => {
      if (peersRef.current[userId]) return peersRef.current[userId]; // already exists
      
      const peer = new RTCPeerConnection({
         iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peersRef.current[userId] = peer;
  
      if (streamRef.current) {
         const videoTrack = isSharingRef.current && screenStreamRef.current 
            ? screenStreamRef.current.getVideoTracks()[0] 
            : streamRef.current.getVideoTracks()[0];
         const audioTrack = streamRef.current.getAudioTracks()[0];

         if (videoTrack) peer.addTrack(videoTrack, streamRef.current);
         if (audioTrack) peer.addTrack(audioTrack, streamRef.current);
      }
  
      peer.onicecandidate = (e) => {
         if (e.candidate) {
            sendSignal(meeting.id, { from: user.id, to: userId, type: 'webrtc_candidate', data: e.candidate });
         }
      };
  
      peer.ontrack = (e) => {
         setRemoteStreams(prev => ({ ...prev, [userId]: e.streams[0] }));
      };
  
      if (isInitiator) {
         peer.createOffer().then(offer => {
            peer.setLocalDescription(offer);
            sendSignal(meeting.id, { from: user.id, to: userId, type: 'webrtc_offer', data: offer });
         });
      }
  
      return peer;
    };

    // Broadcast that we just joined so others initiate connections to us
    sendSignal(meeting.id, {
      from: user.id,
      to: 'all',
      type: 'user_joined',
      data: { isMicOn, isCamOn } 
    });

    const unsubscribe = subscribeToSignals(meeting.id, (signals) => {
      signals.forEach(signal => {
        if (signal.from === user.id) return; // Ignore own signals
        if (signal.to !== 'all' && signal.to !== user.id) return; // Ignore signals meant for others

        if (signal.type === 'chat_message') {
          setMessages(prev => {
            if (prev.some(m => m.id === signal.id)) return prev;
            return [...prev, signal.data];
          });
        } else if (signal.type === 'reaction') {
          const reaction = { id: Math.random().toString(), userId: signal.from, emoji: signal.data };
          setActiveReactions(prev => [...prev, reaction]);
          setTimeout(() => {
             setActiveReactions(prev => prev.filter(r => r.id !== reaction.id));
          }, 3000);
        } else if (signal.type === 'status_update') {
          if (!signal.isHistorical) {
            setRemoteStatuses(prev => ({ ...prev, [signal.from]: signal.data }));
          }
        } else if (signal.type === 'user_joined') {
          if (!signal.isHistorical) {
            setRemoteStatuses(prev => ({ ...prev, [signal.from]: signal.data }));
            createPeer(signal.from, true); // Initiate connection to the new user

            // Introduce ourselves back to the new user so they know our status
            sendSignal(meeting.id, {
              from: user.id,
              to: signal.from,
              type: 'status_update',
              data: statusRef.current
            });
          }
        } else if (signal.type === 'force_mute') {
          if (!signal.isHistorical) {
            if (signal.data === 'mic') setIsMicOn(false);
            else if (signal.data === 'cam') setIsCamOn(false);
            else if (signal.data === 'kick') {
              alert(language === 'vi' ? 'Bạn đã bị Chủ phòng mời ra khỏi cuộc họp.' : 'You have been removed by the Host.');
              onLeave();
            }
          }
        } else if (signal.type === 'user_left') {
          if (!signal.isHistorical) {
            setRemoteStatuses(prev => { const n = {...prev}; delete n[signal.from]; return n; });
            setRemoteStreams(prev => { const n = {...prev}; delete n[signal.from]; return n; });
            if (peersRef.current[signal.from]) {
              peersRef.current[signal.from].close();
              delete peersRef.current[signal.from];
            }
          }
        } else if (signal.type === 'meeting_deleted') {
          if (!signal.isHistorical) {
            alert(language === 'vi' ? 'Chủ phòng đã kết thúc và xóa phòng họp này. Bạn sẽ được đưa ra ngoài.' : 'The host has ended and deleted this meeting. You will be removed.');
            onLeave();
          }
        } else if (signal.type === 'webrtc_offer' && !signal.isHistorical) {
          const peer = createPeer(signal.from, false);
          peer.setRemoteDescription(new RTCSessionDescription(signal.data));
          peer.createAnswer().then(answer => {
            peer.setLocalDescription(answer);
            sendSignal(meeting.id, { from: user.id, to: signal.from, type: 'webrtc_answer', data: answer });
          });
        } else if (signal.type === 'force_mute') {
          if (!signal.isHistorical) {
            if (signal.data === 'mic') setIsMicOn(false);
            if (signal.data === 'cam') setIsCamOn(false);
          }
        } else if (signal.type === 'webrtc_answer' && !signal.isHistorical) {
          const peer = peersRef.current[signal.from];
          if (peer) peer.setRemoteDescription(new RTCSessionDescription(signal.data));
        } else if (signal.type === 'webrtc_candidate' && !signal.isHistorical) {
          const peer = peersRef.current[signal.from];
          if (peer) peer.addIceCandidate(new RTCIceCandidate(signal.data));
        }
      });
    });

    return () => unsubscribe();
  }, [meeting.id, user, hasJoined]);

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

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = displayStream;
        const screenTrack = displayStream.getVideoTracks()[0];

        // Replace track in all peers
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch(err => console.error("Screen share replaceTrack error:", err));
          }
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
        setIsSharingScreen(true);

        // Listen for native stop button
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (e) { 
      console.error("Error sharing screen", e); 
      setIsSharingScreen(false);
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      const camTrack = streamRef.current.getVideoTracks()[0];
      if (camTrack) {
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(camTrack).catch(err => console.error("Camera replaceTrack error:", err));
          }
        });
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsSharingScreen(false);
  };

  const handleReaction = (emoji: string) => {
    if (!user) return;
    const reaction = { id: Math.random().toString(), userId: user.id, emoji };
    setActiveReactions(prev => [...prev, reaction]);
    
    sendSignal(meeting.id, {
      from: user.id,
      to: 'all',
      type: 'reaction',
      data: emoji
    });
    
    setShowReactions(false);
    setTimeout(() => {
       setActiveReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  const activeRemoteUsers = allUsers.filter(u => !!remoteStatuses[u.id] && u.id !== user?.id);
  const totalParticipants = 1 + activeRemoteUsers.length;
  
  let sharingUserId = isSharingScreen ? user?.id : null;
  if (!sharingUserId) {
    const remoteSharer = activeRemoteUsers.find(u => remoteStatuses[u.id]?.isSharingScreen);
    if (remoteSharer) sharingUserId = remoteSharer.id;
  }

  const allActiveUserIds = [user?.id, ...Object.keys(remoteStatuses)].filter(Boolean) as string[];
  let activeHostId = meeting.hostId;
  if (!allActiveUserIds.includes(meeting.hostId)) {
    activeHostId = [...allActiveUserIds].sort()[0];
  }
  const isHost = user?.id === activeHostId;

  const handleForceMute = (targetUserId: string, tool: 'mic' | 'cam' | 'kick') => {
    sendSignal(meeting.id, {
      from: user?.id || '',
      to: targetUserId,
      type: 'force_mute',
      data: tool
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true } as any);
      const recorder = new MediaRecorder(displayStream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `CTC_Meeting_${new Date().toISOString().slice(0,10)}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        displayStream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
      });
    } catch (err) {
      console.error("Recording failed to start:", err);
    }
  };

  const getContainerClass = (uId?: string) => {
    const pinnedUser = sharingUserId || (activeSpeakerId && totalParticipants > 2 && !sharingUserId ? activeSpeakerId : null);
    
    if (pinnedUser) {
      if (pinnedUser === uId) {
        return "group relative overflow-hidden bg-gray-900 rounded-2xl shadow-xl border border-brand-500/30 order-1 w-full h-[60vh] lg:h-full lg:w-3/4 flex-grow object-contain";
      }
      return "group relative rounded-xl overflow-hidden bg-gray-800 shadow-md border border-white/5 aspect-video w-[140px] lg:w-[220px] flex-shrink-0 order-2 h-fit";
    }
    if (totalParticipants === 1) {
      return "group relative overflow-hidden bg-[#202124] w-full h-full rounded-xl shadow-2xl border-none max-h-full max-w-full flex items-center justify-center";
    }
    return "group relative rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border border-white/5 aspect-video flex-1 min-w-[320px] max-w-[800px]";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short'
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

  const renderLobby = () => (
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

  const renderRoom = () => (
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
      <div className="flex-grow flex relative overflow-hidden p-4 pt-20 pb-24 w-full justify-center">
        <div className={`w-full max-h-full p-4 h-full flex ${sharingUserId || (activeSpeakerId && totalParticipants > 2 && !sharingUserId) ? 'flex-col lg:flex-row gap-4' : 'flex-wrap gap-4 items-center justify-center content-center'} ${showChat || showParticipants ? 'pr-80' : ''}`}>
          
          {/* Local Video */}
          <AudioSpeakerWrapper stream={streamRef.current} isMuted={!isMicOn} containerClass={(isSpeaking) => `${getContainerClass(user?.id)} ${isSpeaking ? 'ring-4 ring-brand-500 shadow-[0_0_30px_rgba(139,92,246,0.4)]' : ''}`} onSpeakStateChange={handleSpeakStateChange} userId={user?.id}>
            {isCamOn || isSharingScreen ? (
              <video 
                ref={el => {
                  if (el) {
                    const expectedStream = isSharingScreen ? screenStreamRef.current : streamRef.current;
                    if (el.srcObject !== expectedStream) el.srcObject = expectedStream;
                  }
                }}
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full ${!isSharingScreen ? (totalParticipants === 1 ? 'object-contain mirror' : 'object-cover mirror') : 'object-contain bg-black'}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Avatar src={user?.avatar} size="xl" className="border-4 border-brand-500/30" />
                <p className="text-xl font-medium text-gray-400">{user?.name} ({t('you')})</p>
              </div>
            )}
            <div className={`absolute bottom-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors duration-300 ${isMicOn ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white shadow-lg'}`}>
              {!isMicOn && <MicOff size={14} />}
              <span>{user?.name} ({t('you')})</span>
            </div>
            {isHandRaised && (
              <div className="absolute top-4 right-4 bg-brand-500 text-white p-2 rounded-full shadow-lg animate-bounce">
                <Hand size={20} />
              </div>
            )}
            {activeReactions.filter(r => r.userId === user?.id).map(r => (
              <div key={r.id} className="absolute inset-0 flex items-center justify-center pointer-events-none animate-float-up text-6xl">
                {r.emoji}
              </div>
            ))}
            
            {!isSharingScreen && isCamOn && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="relative">
                  <select 
                     onChange={e => setSelectedVideoInput(e.target.value)} 
                     value={selectedVideoInput} 
                     className="bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs rounded-full py-1.5 pl-7 pr-4 hover:bg-black/80 outline-none appearance-none cursor-pointer flex items-center gap-1 shadow-lg max-w-[120px] lg:max-w-[200px] truncate"
                  >
                     {videoInputs.map(v => <option key={v.deviceId} value={v.deviceId} className="bg-gray-800 text-white">{v.label || 'Camera'}</option>)}
                  </select>
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <Video size={12} className="text-gray-300"/>
                  </div>
                </div>
                
                <button 
                   onClick={() => setBgMode(bgMode === 'blur' ? 'none' : 'blur')} 
                   className={`bg-black/60 backdrop-blur-md border ${bgMode === 'blur' ? 'border-brand-500 text-brand-400' : 'border-white/20 text-white'} text-xs rounded-full px-3 py-1.5 hover:bg-black/80 flex items-center gap-1.5 transition-colors shadow-lg whitespace-nowrap`}
                >
                   <Grid size={12} /> {bgMode === 'blur' ? 'Đã làm mờ' : 'Làm mờ nền'}
                </button>
                
                <button 
                   onClick={() => setShowCamMenu(!showCamMenu)} 
                   className="bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs rounded-full px-3 py-1.5 hover:bg-black/80 flex items-center gap-1.5 transition-colors shadow-lg whitespace-nowrap"
                >
                   <Sparkles size={12} /> Hiệu ứng nền
                </button>
              </div>
            )}
          </AudioSpeakerWrapper>

          {/* Remote Participants */}
          {activeRemoteUsers.map((u) => {
            const status = remoteStatuses[u.id] || { isMicOn: false, isCamOn: false, isSharingScreen: false };
            const stream = remoteStreams[u.id];

            return (
              <AudioSpeakerWrapper key={`remote-${u.id}`} stream={stream} isMuted={!status.isMicOn} containerClass={(isSpeaking) => `${getContainerClass(u.id)} ${isSpeaking ? 'ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : ''}`} onSpeakStateChange={handleSpeakStateChange} userId={u.id}>
                {stream && (
                  <audio 
                    autoPlay 
                    ref={el => { 
                      if (el) {
                        if (el.srcObject !== stream) el.srcObject = stream;
                        if (selectedAudioOutput && (el as any).setSinkId) {
                          (el as any).setSinkId(selectedAudioOutput).catch((e:any) => {});
                        }
                      }
                    }} 
                  />
                )}
                {stream && (status.isCamOn || status.isSharingScreen) ? (
                  <video 
                    key={`remote-vid-${u.id}-${status.isSharingScreen}`}
                    autoPlay 
                    muted
                    playsInline 
                    className={`w-full h-full ${!status.isSharingScreen ? (totalParticipants === 1 ? 'object-contain mirror' : 'object-cover mirror') : 'object-contain bg-black'}`}
                    ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900">
                    <Avatar src={u.avatar} size="xl" className="border-4 border-white/10" />
                    <p className="text-xl font-medium text-gray-400">{u.name}</p>
                  </div>
                )}
                <div className={`absolute bottom-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors duration-300 ${status.isMicOn ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white shadow-lg'}`}>
                  {!status.isMicOn && <MicOff size={14} className="text-white" />}
                  <span>{u.name}</span>
                  <NetworkIndicator quality={networkQuality[u.id] || 'good'} />
                </div>
                {status.isHandRaised && (
                  <div className="absolute top-4 right-4 bg-brand-500 text-white p-2 rounded-full shadow-lg animate-bounce">
                    <Hand size={20} />
                  </div>
                )}
                {activeReactions.filter(r => r.userId === u.id).map(r => (
                  <div key={r.id} className="absolute inset-0 flex items-center justify-center pointer-events-none animate-float-up text-6xl">
                    {r.emoji}
                  </div>
                ))}
              </AudioSpeakerWrapper>
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
      </div>

      {/* Controls Bar */}
      <div className="h-24 px-8 flex items-center justify-between bg-[#202124] border-t border-white/5">
        <div className="flex items-center gap-4 w-1/3">
          <div className="text-sm font-medium hidden md:block">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {meeting.meetingLink}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <button 
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-4 rounded-l-full transition-all border-r border-[#202124] ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <button
              onClick={() => setShowMicMenu(!showMicMenu)}
              className={`py-5 px-2 rounded-r-full transition-all ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              <ChevronUp size={16} />
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
              className={`p-4 rounded-l-full transition-all border-r border-[#202124] ${isCamOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            <button
              onClick={() => setShowCamMenu(!showCamMenu)}
              className={`py-5 px-2 rounded-r-full transition-all ${isCamOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              <ChevronUp size={16} />
            </button>
            <AnimatePresence>
              {showCamMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-[calc(100%+1rem)] left-0 bg-[#28292c] p-3 rounded-2xl shadow-2xl ring-1 ring-white/10 min-w-[280px] z-50 text-white flex flex-col gap-3 origin-bottom-left"
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
            className={`p-4 rounded-full transition-all ${isHandRaised ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <Hand size={24} />
          </button>
          <button 
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${isSharingScreen ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <Share size={24} />
          </button>
          
          <button 
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-500/30' : 'bg-gray-700 hover:bg-gray-600'}`}
            title={language === 'vi' ? 'Ghi hình cuộc họp' : 'Record meeting'}
          >
            {isRecording ? <Disc3 size={24} className="animate-spin-slow" /> : <CircleDot size={24} className="text-red-400" />}
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowReactions(!showReactions)}
              className={`p-4 rounded-full transition-all ${showReactions ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'}`}
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
                    <button key={emoji} onClick={() => handleReaction(emoji)} className="p-2 text-2xl hover:bg-gray-600 rounded-lg transition-transform hover:scale-125">
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
              className={`p-4 rounded-full transition-all flex items-center justify-center ${showOptionsMenu ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'}`}
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
                  className="absolute bottom-[calc(100%+1rem)] left-1/2 -translate-x-1/2 bg-[#28292c] py-2 rounded-2xl shadow-2xl ring-1 ring-white/10 w-[300px] z-50 text-white flex flex-col origin-bottom"
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
            className="p-4 px-8 rounded-full bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2"
          >
            <PhoneOff size={24} />
            <span className="font-bold whitespace-nowrap">{language === 'vi' ? 'Rời khỏi' : 'Leave Call'}</span>
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
    </div>
  );

  return (
    <>
      {!hasJoined ? renderLobby() : renderRoom()}

      {/* Modals for Action Menu */}
      <AnimatePresence>
        {showReportIssue && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white flex items-center gap-2"><MessageSquare size={24} className="text-gray-400" /> Báo cáo sự cố</h2>
                <button onClick={() => setShowReportIssue(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <p className="text-gray-400 mb-4 text-sm">Vui lòng mô tả chi tiết sự cố bạn đang gặp phải. Phản hồi của bạn sẽ giúp chúng tôi cải thiện hệ thống.</p>
              <textarea className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 min-h-[120px] resize-none mb-6" placeholder="Bắt đầu nhập nội dung..."></textarea>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReportIssue(false)} className="px-5 py-2.5 rounded-full text-brand-400 font-medium hover:bg-brand-500/10 transition-colors">Huỷ</button>
                <button onClick={() => { setShowReportIssue(false); alert('Cảm ơn bạn đã gửi báo cáo!'); }} className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors">Gửi báo cáo</button>
              </div>
            </motion.div>
          </div>
        )}

        {showReportAbuse && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-red-400 flex items-center gap-2"><AlertTriangle size={24} /> Báo cáo lạm dụng</h2>
                <button onClick={() => setShowReportAbuse(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <p className="text-gray-400 mb-4 text-sm">Chúng tôi xem xét nghiêm túc các hành vi vi phạm. Vui lòng chọn lý do phù hợp nhất:</p>
              <div className="flex flex-col gap-2 mb-4">
                {['Ngôn từ kích động và quấy rối', 'Nội dung phản cảm', 'Hành vi lừa đảo', 'Khác'].map(opt => (
                  <label key={opt} className="flex items-center gap-3 p-3 bg-[#111] rounded-xl border border-gray-700 cursor-pointer hover:border-gray-500">
                    <input type="radio" name="abuse-type" className="w-5 h-5 accent-red-500" />
                    <span className="text-white text-sm">{opt}</span>
                  </label>
                ))}
              </div>
              <textarea className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 min-h-[80px] resize-none mb-6" placeholder="Cung cấp thêm ngữ cảnh (nếu có)..."></textarea>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReportAbuse(false)} className="px-5 py-2.5 rounded-full text-gray-300 font-medium hover:bg-white/5 transition-colors">Huỷ</button>
                <button onClick={() => { setShowReportAbuse(false); alert('Báo cáo của bạn đã được ghi nhận.'); }} className="px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Gửi báo cáo</button>
              </div>
            </motion.div>
          </div>
        )}

        {showHelp && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white flex items-center gap-2"><Search size={24} className="text-brand-400" /> Khắc phục sự cố và trợ giúp</h2>
                <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              
              <div className="bg-[#111] border border-gray-700 rounded-xl p-4 mb-5">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Wifi size={16} className="text-green-400" /> Tình trạng kết nối: Ổn định</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Độ trễ tín hiệu (Ping)</span> <span className="text-green-400">~24ms</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Băng thông Video</span> <span className="text-white">1.2 Mbps</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Máy chủ</span> <span className="text-white">Asia-East-1 (WebRTC)</span></div>
                </div>
              </div>
              
              <h3 className="text-white font-medium mb-3">Vấn đề thường gặp</h3>
              <div className="space-y-2 mb-6">
                <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                  Không nghe được người khác nói? <ChevronUp size={16} className="rotate-90"/>
                </button>
                <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                  Camera của tôi bị đen/không hoạt động? <ChevronUp size={16} className="rotate-90"/>
                </button>
                <button className="w-full text-left p-3.5 rounded-xl border border-gray-700 hover:bg-[#111] transition-colors text-gray-300 text-sm flex justify-between items-center">
                  Cách bật/tắt phông nền AI <ChevronUp size={16} className="rotate-90"/>
                </button>
              </div>

              <div className="flex justify-end pr-2">
                <button onClick={() => setShowHelp(false)} className="px-8 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">Đóng</button>
              </div>
            </motion.div>
          </div>
        )}
        
        {showLivestream && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white flex items-center gap-2"><Wifi size={24} className="text-brand-400" /> Phát trực tuyến</h2>
                <button onClick={() => setShowLivestream(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <p className="text-gray-400 mb-4 text-sm">Phát sóng trực tiếp cuộc họp của bạn tới các nền tảng có hỗ trợ RTMP.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Nền tảng</label>
                  <select className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 cursor-pointer">
                    <option>YouTube Live</option>
                    <option>Facebook Live</option>
                    <option>Tuỳ chỉnh (Custom RTMP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2 font-medium">Khoá phát luồng (Stream Key)</label>
                  <input type="password" placeholder="Nhập Stream Key" className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowLivestream(false)} className="px-5 py-2.5 rounded-full text-brand-400 font-medium hover:bg-brand-500/10 transition-colors">Đóng</button>
                <button onClick={() => { setShowLivestream(false); alert('Đang kết nối tới máy chủ phát trực tuyến...'); }} className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors">Bắt đầu phát</button>
              </div>
            </motion.div>
          </div>
        )}

        {showRecordingModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-700 text-center">
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowRecordingModal(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="w-20 h-20 rounded-full bg-[#111] border border-gray-700 mx-auto flex items-center justify-center mb-4">
                {isRecording ? <Disc3 size={40} className="text-red-500 animate-spin-slow" /> : <CircleDot size={40} className="text-gray-400" />}
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Ghi hình cuộc họp</h2>
              <p className="text-gray-400 mb-6 text-sm">Bản ghi của bạn sẽ được lưu cục bộ trên máy tính dưới dạng file WebM.</p>
              
              {isRecording ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                  <p className="text-red-400 font-medium flex items-center justify-center gap-2"><Disc3 size={16} className="animate-spin-slow" /> Đang ghi hình (Lưu cục bộ)</p>
                </div>
              ) : (
                 <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700 border-dashed">
                  <p className="text-gray-500 text-sm">Chưa có tiến trình ghi hình nào đang diễn ra.</p>
                </div>
              )}
              
              <div className="flex justify-center gap-3">
                <button onClick={() => { toggleRecording(); setShowRecordingModal(false); }} className={`px-8 py-3 rounded-full text-white font-medium transition-all shadow-lg w-full flex items-center justify-center gap-2 ${isRecording ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600 ring-2 ring-transparent hover:ring-red-500/50'}`}>
                  {isRecording ? <><Square size={18} fill="currentColor"/> Dừng ghi</> : <><CircleDot size={18} /> Bắt đầu ghi hình</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showLayoutSettings && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#202124] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white flex items-center gap-2"><LayoutIcon size={24} className="text-brand-400" /> Bố cục màn hình</h2>
                <button onClick={() => setShowLayoutSettings(false)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="space-y-3 mb-6">
                 {['Tự động', 'Xếp kề (Tiled)', 'Điểm nhấn (Spotlight)', 'Thanh bên (Sidebar)'].map((l, i) => (
                    <label key={l} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${i === 0 ? 'bg-brand-500/20 border-brand-500' : 'bg-[#111] border-gray-700 hover:border-gray-500'}`}>
                      <span className={`text-sm ${i === 0 ? 'text-brand-300 font-medium' : 'text-white'}`}>{l}</span>
                      <input type="radio" name="layout" defaultChecked={i === 0} className="w-4 h-4 accent-brand-500" />
                    </label>
                 ))}
              </div>
              <p className="text-gray-400 text-xs mb-2 text-center">Bố cục `Tự động` sẽ ưu tiên hiển thị người đang phát biểu và người được Share Screen.</p>
            </motion.div>
          </div>
        )}

        {showSettings && (
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
                  <button onClick={() => setShowSettings(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
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
                           <button onClick={() => { setShowSettings(false); setShowCamMenu(true); }} className="text-[#1967d2] font-medium hover:underline">Backgrounds and effects</button>
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
        )}
      </AnimatePresence>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes float-up {
          0% { transform: translateY(50px) scale(0.5); opacity: 0; }
          20% { transform: translateY(0) scale(1.2); opacity: 1; }
          80% { transform: translateY(-50px) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default MeetingRoom;
