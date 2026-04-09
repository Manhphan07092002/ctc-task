
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
import { SettingsModal } from './meeting/SettingsModal';
import { ActionModals } from './meeting/ActionModals';
import { PreJoinLobby } from './meeting/PreJoinLobby';
import { ControlsBar } from './meeting/ControlsBar';
import { Sidebars } from './meeting/Sidebars';
import { AudioSpeakerWrapper, useAudioLevel } from './meeting/AudioSpeakerWrapper';

interface MeetingRoomProps {
  meeting: Meeting;
  onLeave: () => void;
  allUsers: User[];
}



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

  const renderLobby = () => (
    <PreJoinLobby 
      meeting={meeting} user={user} language={language} isLocalSpeaking={isLocalSpeaking} streamRef={streamRef}
      isMicOn={isMicOn} setIsMicOn={setIsMicOn} isCamOn={isCamOn} setIsCamOn={setIsCamOn}
      audioInputs={audioInputs} videoInputs={videoInputs} audioOutputs={audioOutputs}
      selectedAudioInput={selectedAudioInput} setSelectedAudioInput={setSelectedAudioInput}
      selectedVideoInput={selectedVideoInput} setSelectedVideoInput={setSelectedVideoInput}
      selectedAudioOutput={selectedAudioOutput} setSelectedAudioOutput={setSelectedAudioOutput}
      setHasJoined={setHasJoined} setShowSettings={setShowSettings} onLeave={onLeave}
    />
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
        <Sidebars 
          showChat={showChat} setShowChat={setShowChat}
          showParticipants={showParticipants} setShowParticipants={setShowParticipants}
          messages={messages} newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage}
          streamRef={streamRef} isMicOn={isMicOn} user={user} isHost={isHost} allUsers={allUsers}
          remoteStatuses={remoteStatuses} activeHostId={activeHostId} remoteStreams={remoteStreams}
          handleForceMute={handleForceMute} t={t}
        />
      </div>

      {/* Controls Bar */}
      <ControlsBar 
        meeting={meeting} language={language}
        isMicOn={isMicOn} setIsMicOn={setIsMicOn} showMicMenu={showMicMenu} setShowMicMenu={setShowMicMenu}
        audioInputs={audioInputs} audioOutputs={audioOutputs} selectedAudioInput={selectedAudioInput} setSelectedAudioInput={setSelectedAudioInput} selectedAudioOutput={selectedAudioOutput} setSelectedAudioOutput={setSelectedAudioOutput}
        isCamOn={isCamOn} setIsCamOn={setIsCamOn} showCamMenu={showCamMenu} setShowCamMenu={setShowCamMenu}
        videoInputs={videoInputs} selectedVideoInput={selectedVideoInput} setSelectedVideoInput={setSelectedVideoInput}
        bgMode={bgMode} setBgMode={setBgMode} bgImageUrl={bgImageUrl} setBgImageUrl={setBgImageUrl} handleImageUpload={handleImageUpload}
        isHandRaised={isHandRaised} setIsHandRaised={setIsHandRaised} isSharingScreen={isSharingScreen} toggleScreenShare={toggleScreenShare}
        isRecording={isRecording} toggleRecording={toggleRecording} showReactions={showReactions} setShowReactions={setShowReactions} handleReaction={handleReaction}
        showOptionsMenu={showOptionsMenu} setShowOptionsMenu={setShowOptionsMenu}
        setShowLivestream={setShowLivestream} setShowRecordingModal={setShowRecordingModal} setShowLayoutSettings={setShowLayoutSettings}
        setShowReportIssue={setShowReportIssue} setShowReportAbuse={setShowReportAbuse} setShowHelp={setShowHelp} setShowSettings={setShowSettings}
        onLeave={onLeave} showParticipants={showParticipants} setShowParticipants={setShowParticipants} showChat={showChat} setShowChat={setShowChat}
        isFullScreen={isFullScreen} toggleFullScreen={toggleFullScreen}
      />
    </div>
  );

  return (
    <>
      {!hasJoined ? renderLobby() : renderRoom()}

      {/* Modals for Action Menu */}
      <ActionModals 
        showReportIssue={showReportIssue} setShowReportIssue={setShowReportIssue}
        showReportAbuse={showReportAbuse} setShowReportAbuse={setShowReportAbuse}
        showHelp={showHelp} setShowHelp={setShowHelp}
        showLivestream={showLivestream} setShowLivestream={setShowLivestream}
        showRecordingModal={showRecordingModal} setShowRecordingModal={setShowRecordingModal}
        showLayoutSettings={showLayoutSettings} setShowLayoutSettings={setShowLayoutSettings}
        isRecording={isRecording} toggleRecording={toggleRecording}
      />
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          audioInputs={audioInputs} videoInputs={videoInputs} audioOutputs={audioOutputs}
          selectedAudioInput={selectedAudioInput} setSelectedAudioInput={setSelectedAudioInput}
          selectedVideoInput={selectedVideoInput} setSelectedVideoInput={setSelectedVideoInput}
          selectedAudioOutput={selectedAudioOutput} setSelectedAudioOutput={setSelectedAudioOutput}
          rawStreamRef={rawStreamRef}
          openBackgroundsMenu={() => { setShowSettings(false); setShowCamMenu(true); }}
        />
      )}


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
