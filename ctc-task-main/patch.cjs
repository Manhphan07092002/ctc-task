const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

const target = `  const exportDb = () => {\r
    window.location.href = '/api/admin/database/export';\r
  };`;

const target2 = `  const exportDb = () => {\n    window.location.href = '/api/admin/database/export';\n  };`;

const replacement = `  const exportDb = async () => {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: \`ctc-database-\${new Date().toISOString().split('T')[0]}.sqlite\`,
          types: [{
            description: 'SQLite Database',
            accept: { 'application/x-sqlite3': ['.sqlite', '.db'] },
          }],
        });
        const res = await apiFetch('/api/admin/database/export');
        if (!res.ok) throw new Error('Không thể tải file database');
        const blob = await res.blob();
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const res = await apiFetch('/api/admin/database/export');
        if (!res.ok) throw new Error('Không thể tải file database');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`ctc-database-\${new Date().toISOString().split('T')[0]}.sqlite\`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        alert('Có lỗi khi xuất dữ liệu: ' + e.message);
      }
    }
  };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("Replaced using CRLF target");
} else if (content.includes(target2)) {
  content = content.replace(target2, replacement);
  console.log("Replaced using LF target");
} else {
  console.log("Target not found!");
}

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
