import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('frontend', (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('api.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // if no fetch, ignore
  if (!content.includes('fetch(')) return;
  // If it's AuthContext, we ignore because we already manually handled it, and it uses fetch for login
  if (filePath.includes('AuthContext.tsx')) return;

  // Replace fetch with apiFetch
  let newContent = content.replace(/\bfetch\(/g, 'apiFetch(');
  
  // Ensure apiFetch is imported
  if (newContent.includes('apiFetch(') && !newContent.includes('apiFetch')) {
    // We need to add import { apiFetch } from ...
    // Since calculating relative path is tricky, let's just use a relative path logic or absolute based on frontend root.
    // For simplicity, let's calculate relative path from file to frontend/services/api.ts
    const fileDir = path.dirname(filePath);
    let relativePath = path.relative(fileDir, 'frontend/services/api').replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
    
    // add import at top
    newContent = `import { apiFetch } from '${relativePath}';\n` + newContent;
  }
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Updated', filePath);
});
