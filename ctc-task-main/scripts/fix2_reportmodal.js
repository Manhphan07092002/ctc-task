const fs = require('fs');
const path = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the bad block: starts at the line that has "{/* Rows */}" inside footer
// (around line 608 based on inspection) and goes to the line just before
// "{/* MANAGER approves employee report"
let badStart = -1;
let badEnd = -1;

for (let i = 600; i < lines.length; i++) {
  if (badStart === -1 && lines[i].includes('{/* Rows */}')) {
    badStart = i;
  }
  if (badStart !== -1 && lines[i].includes('{/* MANAGER approves employee report')) {
    badEnd = i;
    break;
  }
}

console.log(`Bad block: lines ${badStart+1} to ${badEnd} (0-indexed ${badStart} to ${badEnd-1})`);
console.log('First bad line:', JSON.stringify(lines[badStart]));
console.log('End line:', JSON.stringify(lines[badEnd]));

if (badStart !== -1 && badEnd !== -1) {
  // Also need to re-add the proper beginning of the employee/own report section
  // which was at line 607: {/* Employee / Manager sending their OWN report */}
  // followed by: {!isFormReadOnly && !isManagerReview && !isDirectorPendingReview && (
  // which was removed by the bad patch and replaced with the bad block
  
  const proper = [
    `            {!isFormReadOnly && !isManagerReview && !isDirectorPendingReview && (`,
    `              <>`,
    `                {initialReport && onDelete && (`,
    `                  <button`,
    `                    onClick={handleDelete}`,
    `                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"`,
    `                    title="Ẩn báo cáo (chỉ Admin mới xóa vĩnh viễn)"`,
    `                  >`,
    `                    <Trash2 size={15} /> Ẩn`,
    `                  </button>`,
    `                )}`,
    `                {isAdmin && initialReport && onAdminHardDelete && (`,
    `                  <button`,
    `                    onClick={() => setShowConfirmHardDelete(true)}`,
    `                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"`,
    `                    title="Xóa vĩnh viễn khỏi hệ thống (Admin)"`,
    `                  >`,
    `                    <Trash2 size={15} /> Xóa vĩnh viễn`,
    `                  </button>`,
    `                )}`,
    `                <button`,
    `                  onClick={() => handleSave('Draft')}`,
    `                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"`,
    `                >`,
    `                  <Save size={15} /> Lưu nháp`,
    `                </button>`,
    `                <button`,
    `                  onClick={() => handleSave('Pending')}`,
    `                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"`,
    `                >`,
    `                  <Send size={15} /> Gửi báo cáo`,
    `                </button>`,
    `              </>`,
    `            )}`,
    ``,
  ];
  
  lines.splice(badStart, badEnd - badStart, ...proper);
  console.log('Fixed. New total lines:', lines.length);
} else {
  console.log('Pattern not found!');
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Done.');
