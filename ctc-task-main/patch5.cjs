const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

const targetStr = `<button onClick={() => setImportStep(2)} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">Tiếp tục</button>`;
const newStr = `<button 
                onClick={() => setImportStep(2)} 
                disabled={importConfirmText !== 'IMPORT'}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục
              </button>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
console.log("Patched disable button");
