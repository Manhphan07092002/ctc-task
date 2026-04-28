const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// After line 292 (handleDelete closing brace), insert executeDelete, executeHardDelete, and return opening
// Lines are 0-indexed, so index 291 = line 292
const insertAt = 292; // after the "  };" of handleDelete (0-indexed)

const toInsert = [
  '',
  '  const executeDelete = () => {',
  '    if (initialReport && onDelete) {',
  '      onDelete(initialReport.id);',
  '      setShowConfirmDelete(false);',
  '    }',
  '  };',
  '',
  '  const executeHardDelete = () => {',
  '    if (initialReport && onAdminHardDelete) {',
  '      onAdminHardDelete(initialReport.id);',
  '      setShowConfirmHardDelete(false);',
  '    }',
  '  };',
  '',
  '  // \u2500\u2500\u2500 Render \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '  return (',
  '    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">',
  '      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6 flex flex-col overflow-hidden">',
  '',
];

lines.splice(insertAt, 0, ...toInsert);
console.log('Inserted', toInsert.length, 'lines at index', insertAt);
console.log('New total lines:', lines.length);

// Verify: check a few lines around the insertion
for (let i = insertAt - 1; i <= insertAt + toInsert.length + 2; i++) {
  console.log(i + 1, JSON.stringify(lines[i]).slice(0, 80));
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Done.');
