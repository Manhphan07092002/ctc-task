import { Meeting } from '../types';

const API_BASE = '/api';

export const getMeetings = async (): Promise<Meeting[]> => {
  try {
    const response = await fetch(`${API_BASE}/meetings`);
    if (!response.ok) throw new Error('Failed to fetch meetings');
    return await response.json();
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
};

export const subscribeToMeetings = (callback: (meetings: Meeting[]) => void) => {
  let isSubscribed = true;
  
  const poll = async () => {
    if (!isSubscribed) return;
    const meetings = await getMeetings();
    callback(meetings);
    setTimeout(poll, 1500); // Poll every 1.5 seconds for near-realtime updates
  };

  poll();

  return () => {
    isSubscribed = false;
  };
};

export const saveMeeting = async (meeting: Meeting): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meeting),
    });
    if (!response.ok) {
      // Try update if create fails (id already exists)
      const updateResponse = await fetch(`${API_BASE}/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting),
      });
      if (!updateResponse.ok) throw new Error('Failed to save meeting');
    }
  } catch (error) {
    console.error('Error saving meeting:', error);
  }
};

export const deleteMeeting = async (meetingId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/meetings/${meetingId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete meeting');
  } catch (error) {
    console.error('Error deleting meeting:', error);
  }
};

// Signals for WebRTC
export const sendSignal = async (meetingId: string, signal: any): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/meetings/${meetingId}/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    });
    if (!response.ok) throw new Error('Failed to send signal');
  } catch (error) {
    console.error('Error sending signal:', error);
  }
};

export const subscribeToSignals = (meetingId: string, callback: (signals: any[]) => void) => {
  let isSubscribed = true;
  let lastTimestamp = 0;
  let isFirstFetch = true;
  
  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const response = await fetch(`${API_BASE}/meetings/${meetingId}/signals?since=${lastTimestamp}`);
      if (response.ok) {
        const signals = await response.json();
        
        if (signals.length > 0) {
          lastTimestamp = Math.max(...signals.map((s: any) => s.timestamp));
          
          if (isFirstFetch) {
            // For the first fetch, we mark signals as historical so the UI doesn't initiate new WebRTC offers for old joins
            const historicalSignals = signals.map((s: any) => ({ ...s, isHistorical: true }));
            callback(historicalSignals);
          } else {
            callback(signals);
          }
        }
        isFirstFetch = false;
      }
    } catch (error) {
      console.error('Error polling signals:', error);
    }
    setTimeout(poll, 1000);
  };

  poll();

  return () => {
    isSubscribed = false;
  };
};
