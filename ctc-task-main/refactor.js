const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/components/MeetingRoom.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports
content = content.replace(
  "import { subscribeToSignals, sendSignal, saveMeeting } from '../services/meetingService';",
  "import { subscribeToSignals, sendSignal, saveMeeting } from '../services/meetingService';\nimport { SettingsModal } from './meeting/SettingsModal';\nimport { ActionModals } from './meeting/ActionModals';"
);

// 2. Remove states
const stateStart = "  const [settingsTab, setSettingsTab] = useState<'audio' | 'video' | 'general' | 'captions' | 'reactions'>('audio');";
const stateEnd = "  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {";

const stateStartIndex = content.indexOf(stateStart);
const stateEndIndex = content.indexOf(stateEnd);

if (stateStartIndex > -1 && stateEndIndex > -1) {
    content = content.substring(0, stateStartIndex) + content.substring(stateEndIndex);
}

// 3. Replace Modals
const modalsStart = "{/* Modals for Action Menu */}";
const modalsEndMarker = "</AnimatePresence>";
const styleMarker = "<style>";

const modalsStartIndex = content.indexOf(modalsStart);
const styleMarkerIndex = content.indexOf(styleMarker, modalsStartIndex);
let lastAnimatePresence = -1;
if (modalsStartIndex > -1 && styleMarkerIndex > -1) {
    const chunk = content.substring(modalsStartIndex, styleMarkerIndex);
    lastAnimatePresence = modalsStartIndex + chunk.lastIndexOf("</AnimatePresence>") + "</AnimatePresence>".length;
}

if (modalsStartIndex > -1 && lastAnimatePresence > -1) {
    const newModals = `{/* Modals for Action Menu */}
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
`;
    content = content.substring(0, modalsStartIndex) + newModals + content.substring(lastAnimatePresence);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring complete!');
