const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/components/MeetingRoom.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes("import { PreJoinLobby }")) {
  content = content.replace(
    "import { ActionModals } from './meeting/ActionModals';",
    "import { ActionModals } from './meeting/ActionModals';\nimport { PreJoinLobby } from './meeting/PreJoinLobby';"
  );
}

// 2. Remove formatDate, formatTime, and renderLobby
const renderLobbyStart = "  const formatDate = (dateStr: string) =>";
const renderLobbyEndMarker = "const renderRoom = () => (";

const startIndex = content.indexOf(renderLobbyStart);
const endIndex = content.indexOf(renderLobbyEndMarker);

if (startIndex > -1 && endIndex > -1) {
    const replacement = `  const renderLobby = () => (
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

  `;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('PreJoinLobby Refactoring complete!');
