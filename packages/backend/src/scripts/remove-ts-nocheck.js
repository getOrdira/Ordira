// Script to remove all @ts-nocheck directives from backend files
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function removeTsNocheck(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remove @ts-nocheck lines
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed === '// @ts-nocheck' || trimmed === '@ts-nocheck') {
        modified = true;
        return false;
      }
      return true;
    });
    
    if (modified) {
      const newContent = filteredLines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Removed @ts-nocheck from: ${path.relative(srcDir, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, and other build directories
        if (!['node_modules', 'dist', 'scripts', 'types'].includes(item)) {
          const result = processDirectory(fullPath);
          totalFiles += result.totalFiles;
          modifiedFiles += result.modifiedFiles;
        }
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        totalFiles++;
        if (removeTsNocheck(fullPath)) {
          modifiedFiles++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message);
  }
  
  return { totalFiles, modifiedFiles };
}

console.log('🔍 Scanning for @ts-nocheck directives...');
const result = processDirectory(srcDir);

console.log(`\n📊 Summary:`);
console.log(`   Total TypeScript files processed: ${result.totalFiles}`);
console.log(`   Files modified: ${result.modifiedFiles}`);
console.log(`   Files unchanged: ${result.totalFiles - result.modifiedFiles}`);

if (result.modifiedFiles > 0) {
  console.log('\n✅ @ts-nocheck removal completed successfully!');
  console.log('⚠️  Next steps:');
  console.log('   1. Run "npm run build:check" to check for TypeScript errors');
  console.log('   2. Fix any compilation errors that appear');
  console.log('   3. Test the application to ensure everything works');
} else {
  console.log('\n✅ No @ts-nocheck directives found - all clean!');
}
