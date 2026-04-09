const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/pages/Dashboard/index.tsx',
  'frontend/pages/Meetings/index.tsx',
  'frontend/pages/Meetings/JoinMeeting.tsx',
  'frontend/pages/Settings/index.tsx',
  'frontend/pages/Calendar/index.tsx'
];

filesToUpdate.forEach(f => {
  const fullPath = path.join(__dirname, f);
  if (!fs.existsSync(fullPath)) return;
  console.log(`Updating ${f}...`);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Any import from '../something' should become '../../something'
  // EXCEPT if it's already '../../something'.
  // Also, any import from './UI' should become '../../components/UI' because they used to be in `frontend/components/` (except DashboardPage which was in `frontend/pages/`, wait:
  
  if (f.includes('Dashboard')) {
    // Dashboard was in `frontend/pages/DashboardPage.tsx`. It moved to `frontend/pages/Dashboard/index.tsx`.
    // So `../types` becomes `../../types`.
    // `../components/` becomes `../../components/`
    // `./TaskPriorityChart` -> we also need to move `TaskPriorityChart` ? Oh, wait.
    // Dashboard had `import { TaskPriorityChart } from '../components/TaskPriorityChart';`
    // Let's just blindly replace `../` with `../../` for all imports because it moved ONE level deeper.
    content = content.replace(/from\s+['"]\.\.\//g, 'from "../../');
  } 
  else if (f.includes('JoinMeeting')) {
    // JoinMeeting was in `frontend/pages/JoinMeetingPage.tsx`. Now `frontend/pages/Meetings/JoinMeeting.tsx`
    // Moved ONE level deeper. 
    content = content.replace(/from\s+['"]\.\.\//g, 'from "../../');
  }
  else {
    // Calendar, Meetings/index, Settings/index were in `frontend/components/`. 
    // Now they are in `frontend/pages/Folder/index.tsx`. 
    // Old path: `frontend/components/CalendarView.tsx` -> `import { Task } from '../types';`
    // New path: `frontend/pages/Calendar/index.tsx` -> `import { Task } from '../../types';`
    content = content.replace(/from\s+['"]\.\.\//g, 'from "../../');
    
    // Also old path `import { Button } from './UI';` -> `import { Button } from '../../components/UI';`
    content = content.replace(/from\s+['"]\.\/(.*?)['"]/g, 'from "../../components/$1"');
  }

  // Then for TS errors of any type:
  content = content.replace("m =>", "(m: any) =>");
  content = content.replace("e =>", "(e: any) =>");

  fs.writeFileSync(fullPath, content, 'utf8');
});
console.log('Done.');
