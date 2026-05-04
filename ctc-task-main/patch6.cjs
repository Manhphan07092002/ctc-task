const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

const oldFn = `const confirmImport = async () => {\r\n    if (!importFile) return;\r\n    setImportBusy(true);\r\n    setImportError('');\r\n    try {\r\n      const formData = new FormData();\r\n      formData.append('file', importFile);\r\n      const res = await apiFetch('/api/admin/database/import', { method: 'POST', body: formData });\r\n      const data = await res.json().catch(() => ({}));\r\n      if (!res.ok) throw new Error(data.error || 'Import thất bại');\r\n      setImportFile(null);\r\n      setImportStep(1);\r\n      await fetchTables();\r\n      if (selectedTable) await fetchRows(selectedTable);\r\n    } catch (e: any) {\r\n      setImportError(e.message || 'Import thất bại');\r\n    } finally {\r\n      setImportBusy(false);\r\n    }\r\n  };`;

const newFn = `const confirmImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await apiFetch('/api/admin/database/import', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import thất bại');
      setImportFile(null);
      setImportStep(1);
      setImportConfirmText('');
      setImportSuccessMsg('✅ Import thành công! Đang chờ server khởi động lại...');

      // Poll until backend is back up, then reload
      const waitForBackend = async () => {
        await new Promise(r => setTimeout(r, 3000)); // give backend time to exit
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const ping = await fetch('/api/admin/database/tables');
            if (ping.ok) {
              setImportSuccessMsg('✅ Server đã sẵn sàng! Đang tải lại trang...');
              await new Promise(r => setTimeout(r, 1500));
              window.location.reload();
              return;
            }
          } catch {}
        }
        window.location.reload(); // fallback
      };
      waitForBackend();
    } catch (e) {
      setImportError(e.message || 'Import thất bại');
      setImportBusy(false);
    }
  };`;

if (content.includes(oldFn)) {
  content = content.replace(oldFn, newFn);
  console.log('Patched confirmImport');
} else {
  console.log('Target not found!');
  // Show what's there
  const i = content.indexOf('const confirmImport');
  console.log(JSON.stringify(content.slice(i, i+200)));
}

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
