const fs = require('fs');
const path = require('path');

const moveRename = (oldP, newP) => {
  const fullOld = path.join(__dirname, oldP);
  const fullNew = path.join(__dirname, newP);
  if (fs.existsSync(fullOld)) {
    // Ensure dir exists
    const newDir = path.dirname(fullNew);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    fs.renameSync(fullOld, fullNew);
    console.log(`Moved ${oldP} to ${newP}`);
  } else {
    console.log(`File not found: ${oldP}`);
  }
}

// Ensure Dashboard folder exists when moving
moveRename('frontend/pages/DashboardPage.tsx', 'frontend/pages/Dashboard/index.tsx');

// Move MeetingView
moveRename('frontend/components/MeetingView.tsx', 'frontend/pages/Meetings/index.tsx');
// Move JoinMeetingPage
moveRename('frontend/pages/JoinMeetingPage.tsx', 'frontend/pages/Meetings/JoinMeeting.tsx');

// Move Settings
moveRename('frontend/components/SettingsView.tsx', 'frontend/pages/Settings/index.tsx');

// Move Calendar
moveRename('frontend/components/CalendarView.tsx', 'frontend/pages/Calendar/index.tsx');

console.log('Finished moving pages.');
