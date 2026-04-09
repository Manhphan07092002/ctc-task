import React, { useState, useEffect } from 'react';

export function useAudioLevel(stream: MediaStream | null | undefined, isMuted: boolean) {
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
    let animationFrameId: number;

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      if (average > 10) {
        setIsSpeaking(true);
      } else {
        setIsSpeaking(false);
      }
      animationFrameId = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();

    return () => {
      cancelAnimationFrame(animationFrameId);
      try { source.disconnect(); } catch(e){}
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, isMuted]);

  return isSpeaking;
}

export const AudioSpeakerWrapper = ({ stream, isMuted, children, containerClass, onSpeakStateChange, userId }: {stream: MediaStream | null | undefined, isMuted: boolean, children: any, containerClass: (isSpeaking: boolean) => string, onSpeakStateChange?: (id: string, isSpeaking: boolean) => void, userId?: string}) => {
  const isSpeaking = useAudioLevel(stream, isMuted);
  
  useEffect(() => {
    if (onSpeakStateChange && userId) {
      onSpeakStateChange(userId, isSpeaking);
    }
  }, [isSpeaking, userId, onSpeakStateChange]);

  return <div className={containerClass(isSpeaking)}>{children}</div>;
};
