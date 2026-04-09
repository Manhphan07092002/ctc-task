
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Settings, Share, 
  MoreVertical, Hand, Smile, Grid, Layout as LayoutIcon,
  Maximize, Minimize, Shield, Info, X, Calendar, Clock
} from 'lucide-react';
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

const AudioSpeakerWrapper = ({ stream, isMuted, children, containerClass }: {stream: MediaStream | null | undefined, isMuted: boolean, children: any, containerClass: (isSpeaking: boolean) => string}) => {
  const isSpeaking = useAudioLevel(stream, isMuted);
  return <div className={containerClass(isSpeaking)}>{children}</div>;
};

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
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const statusRef = useRef({ isMicOn: true, isCamOn: true, isHandRaised: false, isSharingScreen: false });
  const isSharingRef = useRef(false);
  
  const [hasJoined, setHasJoined] = useState(false);
  const hasJoinedRef = useRef(false);
  
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
  }, []);

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

  const handleForceMute = (targetUserId: string, tool: 'mic' | 'cam') => {
    sendSignal(meeting.id, {
      from: user?.id || '',
      to: targetUserId,
      type: 'force_mute',
      data: tool
    });
  };

  const getContainerClass = (uId?: string) => {
    if (sharingUserId) {
      if (sharingUserId === uId) {
        return "relative overflow-hidden bg-gray-900 rounded-2xl shadow-xl border border-brand-500/30 order-1 w-full h-[60vh] lg:h-full lg:w-3/4 flex-grow object-contain";
      }
      return "relative rounded-xl overflow-hidden bg-gray-800 shadow-md border border-white/5 aspect-video w-[140px] lg:w-[220px] flex-shrink-0 order-2 h-fit";
    }
    if (totalParticipants === 1) {
      return "relative overflow-hidden bg-gray-800 w-full h-full rounded-2xl shadow-2xl border-none";
    }
    return "relative rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border border-white/5 aspect-video flex-1 min-w-[320px] max-w-[800px]";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short'
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

  if (!hasJoined) {
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
                <button 
                  onClick={onLeave} 
                  className="w-full py-4 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition-all border border-gray-200 hover:border-gray-300 shadow-sm text-lg"
                >
                  {language === 'vi' ? 'Quay lại' : 'Back'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

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
        <div className={`flex-grow flex gap-4 transition-all duration-300 w-full h-full overflow-y-auto overflow-x-hidden p-2 ${sharingUserId ? 'flex-row flex-wrap justify-center lg:justify-start content-start' : 'flex-wrap items-center justify-center content-center'} ${showChat || showParticipants ? 'pr-80' : ''}`}>
          
          {/* Local Video */}
          <AudioSpeakerWrapper stream={streamRef.current} isMuted={!isMicOn} containerClass={(isSpeaking) => `${getContainerClass(user?.id)} ${isSpeaking ? 'ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : ''}`}>
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
                className={`w-full h-full ${!isSharingScreen ? 'object-cover mirror' : 'object-contain bg-black'}`}
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
          </AudioSpeakerWrapper>

          {/* Remote Participants */}
          {activeRemoteUsers.map((u) => {
            const status = remoteStatuses[u.id] || { isMicOn: false, isCamOn: false, isSharingScreen: false };
            const stream = remoteStreams[u.id];

            return (
              <AudioSpeakerWrapper key={`remote-${u.id}`} stream={stream} isMuted={!status.isMicOn} containerClass={(isSpeaking) => `${getContainerClass(u.id)} ${isSpeaking ? 'ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : ''}`}>
                {stream && (status.isCamOn || status.isSharingScreen) ? (
                  <video 
                    key={`remote-vid-${u.id}-${status.isSharingScreen}`}
                    autoPlay 
                    playsInline 
                    className={`w-full h-full ${!status.isSharingScreen ? 'object-cover mirror' : 'object-contain bg-black'}`}
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
    </div>
  );
};
