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
  
  // if uses apiFetch but does not import it
  if (content.includes('apiFetch') && !content.includes('import { apiFetch }')) {
    const fileDir = path.dirname(filePath);
    let relativePath = path.relative(fileDir, 'frontend/services/api').replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
    
    // add import after the first block of imports or at the top
    const newContent = `import { apiFetch } from '${relativePath}';\n` + content;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed imports in', filePath);
  }
});
