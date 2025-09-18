// Bulk removal script for @ts-nocheck directives
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

// Get all TypeScript files
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', 'dist', 'scripts'].includes(item)) {
      files.push(...getAllTsFiles(fullPath));
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Remove @ts-nocheck from a file
function removeTsNocheck(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed !== '// @ts-nocheck' && trimmed !== '@ts-nocheck';
  });
  
  if (filteredLines.length !== lines.length) {
    fs.writeFileSync(filePath, filteredLines.join('\n'), 'utf8');
    return true;
  }
  
  return false;
}

// Process all files
const tsFiles = getAllTsFiles(srcDir);
let modifiedCount = 0;

console.log(`🔍 Processing ${tsFiles.length} TypeScript files...`);

for (const file of tsFiles) {
  if (removeTsNocheck(file)) {
    modifiedCount++;
    console.log(`✅ Removed @ts-nocheck from: ${path.relative(srcDir, file)}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files processed: ${tsFiles.length}`);
console.log(`   Files modified: ${modifiedCount}`);
console.log(`   Files unchanged: ${tsFiles.length - modifiedCount}`);

if (modifiedCount > 0) {
  console.log('\n✅ @ts-nocheck removal completed!');
} else {
  console.log('\n✅ No @ts-nocheck directives found!');
}
