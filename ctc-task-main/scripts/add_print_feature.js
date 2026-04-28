const fs = require('fs');

// 1. Fix CSV Export in Reports/index.tsx
const indexFile = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/index.tsx';
let idxSrc = fs.readFileSync(indexFile, 'utf8');

const oldCsv = "const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });";
const newCsv = "const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });";

if (idxSrc.includes(oldCsv)) {
  idxSrc = idxSrc.replace(oldCsv, newCsv);
  fs.writeFileSync(indexFile, idxSrc, 'utf8');
  console.log('Fixed CSV Export in index.tsx');
} else {
  console.log('Could not find CSV export blob line in index.tsx');
}

// 2. Add Print function to ReportModal.tsx
const modalFile = 'd:/ctc-task/ctc-task-main/frontend/pages/Reports/ReportModal.tsx';
let modalSrc = fs.readFileSync(modalFile, 'utf8');

// Insert handlePrint before handleAction
const printLogic = `
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = \`
      <!DOCTYPE html>
      <html>
      <head>
        <title>In Báo Cáo - \${title || 'Báo cáo công việc'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .company { font-weight: bold; text-transform: uppercase; color: #1e40af; font-size: 14px; margin-bottom: 5px; }
          .dept { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
          .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
          .meta { display: flex; justify-content: center; gap: 30px; font-size: 14px; color: #555; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; color: #1e40af; text-transform: uppercase; }
          .section-title { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .plan-box, .feedback-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; white-space: pre-wrap; min-height: 50px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
          .sig-box { width: 200px; }
          .sig-title { font-weight: bold; margin-bottom: 80px; }
          @media print {
            body { padding: 0; margin: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">CÔNG TY CỔ PHẦN XÂY LẮP BƯU ĐIỆN MIỀN TRUNG</div>
          <div class="dept">\${currentUser.department || 'Phòng ban'}</div>
          <div class="title">BÁO CÁO CÔNG VIỆC THỰC HIỆN</div>
          <div class="meta">
            <span><strong>Tuần:</strong> \${fmtDate(weekStart)} - \${fmtDate(weekEnd)}</span>
            <span><strong>Người báo cáo:</strong> \${initialReport ? (users.find(u => u.id === initialReport.authorId)?.name || currentUser.name) : currentUser.name}</span>
          </div>
        </div>

        <div class="section-title">1. Nội dung công việc thực hiện</div>
        <table>
          <thead>
            <tr>
              <th width="5%" style="text-align: center">STT</th>
              <th width="30%">Nội dung công việc</th>
              <th width="15%">Kết quả</th>
              <th width="20%">Công việc tiếp theo</th>
              <th width="15%">Nhân viên</th>
              <th width="15%">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            \${rows.map((r, i) => \`
              <tr>
                <td align="center">\${i + 1}</td>
                <td>\${r.content || ''}</td>
                <td>\${RESULT_OPTIONS.find(o => o.value === r.result)?.label || ''}</td>
                <td>\${r.nextAction || ''}</td>
                <td>\${r.assignee || ''}</td>
                <td>\${r.note || ''}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>

        <div class="section-title">2. Kế hoạch tuần tới</div>
        <div class="plan-box">\${nextWeekPlan || 'Không có'}</div>

        \${managerFeedback || directorFeedback ? \`
          <div class="section-title">3. Ý kiến chỉ đạo / Nhận xét</div>
          \${managerFeedback ? \`<div class="feedback-box"><strong>Trưởng phòng:</strong><br/>\${managerFeedback}</div>\` : ''}
          \${directorFeedback ? \`<div class="feedback-box"><strong>Giám đốc:</strong><br/>\${directorFeedback}</div>\` : ''}
        \` : ''}

        <div class="footer">
          <div class="sig-box">
            <div class="sig-title">Người báo cáo</div>
            <div>\${initialReport ? (users.find(u => u.id === initialReport.authorId)?.name || currentUser.name) : currentUser.name}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Trưởng phòng</div>
            <div></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Giám đốc</div>
            <div>\${initialReport?.approvedBy ? users.find(u => u.id === initialReport.approvedBy)?.name : ''}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() { 
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    \`;

    printWindow.document.write(html);
    printWindow.document.close();
  };
`;

if (!modalSrc.includes('const handlePrint')) {
  modalSrc = modalSrc.replace('const handleAction =', printLogic + '\n  const handleAction =');
}

// Now insert the Print button in the footer actions
const printButton = `
            <button onClick={handlePrint} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm flex items-center gap-2" title="In Báo Cáo">
              <FileText size={16} /> In
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-xl transition-colors">
              Đóng
            </button>`;

if (!modalSrc.includes('In Báo Cáo')) {
  modalSrc = modalSrc.replace(
    /<button onClick={onClose} className="px-5 py-2\.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200\/50 rounded-xl transition-colors">\s*Đóng\s*<\/button>/g,
    printButton
  );
  fs.writeFileSync(modalFile, modalSrc, 'utf8');
  console.log('Added Print button to ReportModal.tsx');
} else {
  console.log('Print button already exists in ReportModal.tsx');
}

