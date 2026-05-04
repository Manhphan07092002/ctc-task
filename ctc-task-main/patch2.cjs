const fs = require('fs');
let content = fs.readFileSync('frontend/pages/Admin/DatabaseManagement.tsx', 'utf8');

const oldFn = `  const confirmImport = async () => {
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
      await fetchTables();
      if (selectedTable) await fetchRows(selectedTable);
    } catch (e: any) {
      setImportError(e.message || 'Import thất bại');
    } finally {
      setImportBusy(false);
    }
  };`;

const newFn = `  const confirmImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await apiFetch('/api/admin/database/import', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import thất bại');
      alert(data.message || 'Import thành công. Hệ thống đang khởi động lại...');
      setImportFile(null);
      setImportStep(1);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (e: any) {
      setImportError(e.message || 'Import thất bại');
      setImportBusy(false);
    }
  };`;

const oldFnCRLF = oldFn.replace(/\n/g, '\r\n');

if (content.includes(oldFnCRLF)) {
  content = content.replace(oldFnCRLF, newFn);
  console.log("Replaced with CRLF");
} else if (content.includes(oldFn)) {
  content = content.replace(oldFn, newFn);
  console.log("Replaced with LF");
} else {
  console.log("Target not found!");
}

fs.writeFileSync('frontend/pages/Admin/DatabaseManagement.tsx', content);
