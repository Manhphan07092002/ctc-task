const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/components/MeetingRoom.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports
if (!content.includes("import { Sidebars }")) {
  content = content.replace(
    "import { ControlsBar } from './meeting/ControlsBar';",
    "import { ControlsBar } from './meeting/ControlsBar';\nimport { Sidebars } from './meeting/Sidebars';\nimport { AudioSpeakerWrapper, useAudioLevel } from './meeting/AudioSpeakerWrapper';"
  );
}


// 2. Remove useAudioLevel & AudioSpeakerWrapper locally
const audioWrapperStart = "function useAudioLevel(";
// Find the end of AudioSpeakerWrapper
const audioWrapperEndStr = "return <div className={containerClass(isSpeaking)}>{children}</div>;\n};\n";

const awStartIdx = content.indexOf(audioWrapperStart);
if (awStartIdx > -1) {
  const awEndIdx = content.indexOf(audioWrapperEndStr, awStartIdx);
  if (awEndIdx > -1) {
    content = content.substring(0, awStartIdx) + content.substring(awEndIdx + audioWrapperEndStr.length);
  }
}

// 3. Replace Sidebars
const sbStartMarker = "{/* Sidebar (Chat/Participants) */}\n        <AnimatePresence>";
const sbEndMarker = "</AnimatePresence>\n      </div>\n\n      {/* Controls Bar */}\n";

const sbStart = content.indexOf(sbStartMarker);
if (sbStart > -1) {
  // Let's find exactly `</AnimatePresence>` before `</div>` before `{/* Controls Bar */}`
  // Since we replaced ControlsBar earlier:
  const controlsBarMarker = "      {/* Controls Bar */}";
  const cbStart = content.indexOf(controlsBarMarker, sbStart);
  
  // We want to replace from sbStart up to `</div>` just before cbStart.
  // Wait, let's just do a string based replace since we know the structure.
  // Actually, sbStart is `{/* Sidebar (Chat/Participants) */}`.
  
  const chunk = content.substring(sbStart, cbStart);
  if (chunk) {
     const replacement = `{/* Sidebar (Chat/Participants) */}
        <Sidebars 
          showChat={showChat} setShowChat={setShowChat}
          showParticipants={showParticipants} setShowParticipants={setShowParticipants}
          messages={messages} newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage}
          streamRef={streamRef} isMicOn={isMicOn} user={user} isHost={isHost} allUsers={allUsers}
          remoteStatuses={remoteStatuses} activeHostId={activeHostId} remoteStreams={remoteStreams}
          handleForceMute={handleForceMute} t={t}
        />
      </div>

`;
     content = content.substring(0, sbStart) + replacement  + content.substring(cbStart);
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Sidebars Refactoring complete!');
