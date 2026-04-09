import { useState, useEffect } from 'react';

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useDeviceSelection = () => {
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  const fetchDevices = async () => {
    try {
      // Must request permissions first to get labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const aInputs = devices.filter(d => d.kind === 'audioinput');
      const vInputs = devices.filter(d => d.kind === 'videoinput');
      const aOutputs = devices.filter(d => d.kind === 'audiooutput');

      setAudioInputs(aInputs);
      setVideoInputs(vInputs);
      setAudioOutputs(aOutputs);

      // Set defaults if not selected
      if (!selectedAudioInput && aInputs.length > 0) setSelectedAudioInput(aInputs[0].deviceId);
      if (!selectedVideoInput && vInputs.length > 0) setSelectedVideoInput(vInputs[0].deviceId);
      if (!selectedAudioOutput && aOutputs.length > 0) setSelectedAudioOutput(aOutputs[0].deviceId);
      
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  useEffect(() => {
    fetchDevices();
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, []);

  return {
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideoInput,
    setSelectedVideoInput,
    selectedAudioOutput,
    setSelectedAudioOutput,
    fetchDevices
  };
};
