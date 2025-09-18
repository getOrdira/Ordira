// Fix script to correct double "Unified" prefixes in controller files
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix import statements
    const importFix = content.replace(/UnifiedUnifiedAuthRequest/g, 'UnifiedAuthRequest');
    if (importFix !== content) {
      content = importFix;
      modified = true;
    }
    
    // Fix function parameters
    const paramFix = content.replace(/UnifiedUnifiedAuthRequest/g, 'UnifiedAuthRequest');
    if (paramFix !== content) {
      content = paramFix;
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No fix needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function fixControllers() {
  console.log('🔧 Fixing double "Unified" prefixes...\n');
  
  const files = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(controllersDir, file));
  
  let fixedCount = 0;
  
  files.forEach(filePath => {
    if (fixFile(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files fixed: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log(`\n✨ Double "Unified" prefix fix completed!`);
  } else {
    console.log(`\n✅ No fixes needed.`);
  }
}

// Run fix
fixControllers();
