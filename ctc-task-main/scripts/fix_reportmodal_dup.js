const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let c = fs.readFileSync(path, 'utf8');

// The file has a duplicated JSX section inserted by a bad patch.
// The correct file structure should have:
// 1. Component logic (lines before "// ─── Render")
// 2. One return() JSX block
//
// Find where the duplicated rows/tables section starts - it's right after handleDelete closing
// and before the original "const executeDelete"
// 
// The bad insertion added JSX rows inside the JS section.
// We need to remove everything from the bad JSX insertion down to the start of "const executeDelete"

// Find the bad insertion: after handleDelete, there's raw JSX mixed in
// The bad block starts with:
//   {/* Rows */}
// and ends just before:
//   const executeDelete

const badStart = `\n              {/* Rows */}\n`;
const badEnd = `\r\n  const executeDelete = () => {`;

const si = c.indexOf(badStart);
const ei = c.indexOf(badEnd);

if (si !== -1 && ei !== -1 && si < ei) {
  c = c.slice(0, si) + '\n' + c.slice(ei);
  console.log('Removed bad block from char', si, 'to', ei);
} else {
  console.log('Bad block not found, si=', si, 'ei=', ei);
}

fs.writeFileSync(path, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);
