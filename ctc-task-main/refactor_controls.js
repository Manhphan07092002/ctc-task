const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/components/MeetingRoom.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes("import { ControlsBar }")) {
  content = content.replace(
    "import { PreJoinLobby } from './meeting/PreJoinLobby';",
    "import { PreJoinLobby } from './meeting/PreJoinLobby';\nimport { ControlsBar } from './meeting/ControlsBar';"
  );
}

// 2. Remove PRESET_BGS
const presetBgsStart = "const PRESET_BGS = [";
const presetBgsEndMarker = "];\n";

const pbStart = content.indexOf(presetBgsStart);
if (pbStart > -1) {
  const pbEnd = content.indexOf(presetBgsEndMarker, pbStart) + presetBgsEndMarker.length;
  content = content.substring(0, pbStart) + content.substring(pbEnd);
}

// 3. Replace Controls Bar
const cbStartMarker = "{/* Controls Bar */}";
const cbEndMarker = "  const renderRoom = () => ("; // renderRoom ends right after the Controls Bar div usually, let's locate it carefully.

const cbStart = content.indexOf(cbStartMarker);
if (cbStart > -1) {
  // Find the end of the Controls Bar div. Controls bar is the last element inside renderRoom's wrapper div.
  // The wrapper div is: 
  // <div className="fixed inset-0 bg-[#202124] text-white flex flex-col z-50 overflow-hidden font-sans">
  //   {/* Header */}...
  //   {/* Main View Area */}...
  //   {/* Controls Bar */}...
  // </div> // <- this is what we need to find. 
  // The actual end is just before the final `</div>\n    </div>\n  );`
  // Wait, let's just find `    </div>\n  );\n\n  return (`
  const renderRoomEnd = "  );\n\n  return (";
  const rrEndIdx = content.indexOf(renderRoomEnd, cbStart);

  if (rrEndIdx > -1) {
    // Replace the Controls Bar content entirely
    const replacement = `{/* Controls Bar */}
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
`;
    content = content.substring(0, cbStart) + replacement + content.substring(rrEndIdx);
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('ControlsBar Refactoring complete!');
