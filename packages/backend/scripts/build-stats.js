#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📊 Build Statistics:\n');

const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.log('❌ No dist folder found - run npm run build first');
  process.exit(1);
}

// Get all JavaScript files recursively
function getAllJsFiles(dir, baseDir = '') {
  let files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files = files.concat(getAllJsFiles(fullPath, relativePath));
    } else if (item.endsWith('.js')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

const jsFiles = getAllJsFiles(distPath);
const totalFiles = jsFiles.length;
const totalSize = jsFiles.reduce((sum, file) => {
  const filePath = path.join(distPath, file);
  return sum + fs.statSync(filePath).size;
}, 0);

// Get directory structure
function getDirectoryStructure(dir, baseDir = '', maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  let structure = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      const subItems = getDirectoryStructure(fullPath, relativePath, maxDepth, currentDepth + 1);
      structure.push({
        name: item,
        type: 'directory',
        path: relativePath,
        children: subItems.length
      });
      structure = structure.concat(subItems);
    } else if (item.endsWith('.js')) {
      structure.push({
        name: item,
        type: 'file',
        path: relativePath,
        size: stat.size
      });
    }
  }
  
  return structure;
}

const structure = getDirectoryStructure(distPath);

console.log(`📁 Total Files: ${totalFiles}`);
console.log(`💾 Total Size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`);
console.log(`📅 Last Modified: ${fs.statSync(distPath).mtime.toLocaleString()}`);

// Show largest files
const largestFiles = jsFiles
  .map(file => ({
    name: file,
    size: fs.statSync(path.join(distPath, file)).size
  }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 10);

console.log(`\n🔝 Top 10 Largest Files:`);
largestFiles.forEach((file, index) => {
  const sizeKB = Math.round(file.size / 1024);
  console.log(`   ${index + 1}. ${file.name} (${sizeKB}KB)`);
});

// Show directory structure
console.log(`\n📂 Directory Structure:`);
const dirs = structure.filter(item => item.type === 'directory');
dirs.forEach(dir => {
  console.log(`   📁 ${dir.path}/ (${dir.children} files)`);
});

console.log(`\n✅ Build is complete and ready for production!`);
