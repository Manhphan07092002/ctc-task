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
  console.log(`Fixing quotes in ${f}...`);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Fix mixed quotes: from "../../path' -> from '../../path'
  content = content.replace(/from\s+"([^'"]*)'/g, "from '$1'");
  
  // also fix from '../../path" if it exists
  content = content.replace(/from\s+'([^'"]*)"/g, "from '$1'");

  // Also fix lines like:
  // pages/Dashboard/index.tsx(109,51): error TS1005: ',' expected.
  // Wait, did I mess up something else? In Dashboard: `content = content.replace("m =>", "(m: any) =>");`
  // if `m =>` was part of a JSX string like `className="text-sm => "`? Probably not.
  
  fs.writeFileSync(fullPath, content, 'utf8');
});
console.log('Quotation fixed.');
