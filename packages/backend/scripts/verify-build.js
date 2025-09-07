#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying complete build output...\n');

const distPath = path.join(__dirname, '..', 'dist');

// Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist folder does not exist!');
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

console.log(`📊 Build Statistics:`);
console.log(`   Total files: ${totalFiles}`);
console.log(`   Total size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`);

// Check critical files
const criticalFiles = [
  'index.js',
  'controllers/auth.controller.js',
  'controllers/supplyChain.controller.js',
  'controllers/certificate.controller.js',
  'controllers/nfts.controller.js',
  'controllers/manufacturerAccount.controller.js',
  'controllers/billing.controller.js',
  'services/business/auth.service.js',
  'services/business/votes.service.js',
  'services/blockchain/nft.service.js',
  'services/blockchain/voting.service.js',
  'services/external/billing.service.js',
  'services/external/notifications.service.js',
  'validation/auth.validation.js',
  'validation/user.validation.js',
  'validation/supplyChain.validation.js',
  'routes/supplyChain.routes.js',
  'middleware/auth.middleware.js',
  'middleware/manufacturerAuth.middleware.js',
  'models/business.model.js',
  'models/manufacturer.model.js',
  'models/user.model.js'
];

console.log(`\n🔍 Checking critical files:`);
let missingFiles = [];
let syntaxErrors = [];

criticalFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`✅ ${file} (${sizeKB}KB)`);
    
    // Check for syntax errors
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      new Function('module', 'exports', 'require', content);
    } catch (error) {
      syntaxErrors.push(`${file}: ${error.message}`);
    }
  } else {
    missingFiles.push(file);
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check for empty files
console.log(`\n🔍 Checking for empty files:`);
let emptyFiles = [];
jsFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    emptyFiles.push(file);
    console.log(`⚠️  ${file} - EMPTY FILE`);
  }
});

// Summary
console.log(`\n📋 Build Summary:`);
console.log(`   ✅ Critical files found: ${criticalFiles.length - missingFiles.length}/${criticalFiles.length}`);
console.log(`   ✅ Total files compiled: ${totalFiles}`);
console.log(`   ✅ Syntax errors: ${syntaxErrors.length}`);
console.log(`   ⚠️  Empty files: ${emptyFiles.length}`);

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing critical files:`);
  missingFiles.forEach(file => console.log(`   - ${file}`));
}

if (syntaxErrors.length > 0) {
  console.log(`\n❌ Syntax errors found:`);
  syntaxErrors.forEach(error => console.log(`   - ${error}`));
}

if (emptyFiles.length > 0) {
  console.log(`\n⚠️  Empty files found:`);
  emptyFiles.forEach(file => console.log(`   - ${file}`));
}

const allGood = missingFiles.length === 0 && syntaxErrors.length === 0;
console.log('\n' + (allGood ? '🎉 Complete build verification passed!' : '💥 Build verification failed!'));
process.exit(allGood ? 0 : 1);
