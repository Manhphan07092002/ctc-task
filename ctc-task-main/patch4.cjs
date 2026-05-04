const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

// 1. Add CheckCircle2 icon
content = content.replace(
  "import { AlertCircle, Database, Download, FileUp, RefreshCw, Search, Trash2 } from 'lucide-react';",
  "import { AlertCircle, Database, Download, FileUp, RefreshCw, Search, Trash2, CheckCircle2 } from 'lucide-react';"
);

// 2. Add importSuccessMsg state
content = content.replace(
  "const [importConfirmText, setImportConfirmText] = useState('');",
  "const [importConfirmText, setImportConfirmText] = useState('');\n  const [importSuccessMsg, setImportSuccessMsg] = useState('');"
);

// 3. Replace alert with setImportSuccessMsg
content = content.replace(
  "alert(data.message || 'Import thành công. Hệ thống đang khởi động lại, trang sẽ tự làm mới sau 10 giây...');",
  "setImportSuccessMsg(data.message || 'Import thành công. Hệ thống đang khởi động lại, trang sẽ tự làm mới sau 10 giây...');"
);

// 4. Add Overlay JSX just inside the main wrapper
const overlayJSX = `
      {importSuccessMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm mx-4 text-center border border-green-100 transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Thành công!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">{importSuccessMsg}</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-[progress_10s_ease-in-out_forwards]" />
            </div>
            <style>{'\\n@keyframes progress { from { width: 0%; } to { width: 100%; } }\\n'}</style>
          </div>
        </div>
      )}
`;

content = content.replace(
  "<div className=\"space-y-6 pb-8\">",
  "<div className=\"space-y-6 pb-8\">" + overlayJSX
);

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
console.log("Patched UI");
