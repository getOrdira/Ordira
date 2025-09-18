// Migration script to update controller files to use UnifiedAuthRequest
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

function migrateControllerFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Update import statements
    const importPatterns = [
      {
        from: /import\s*{\s*AuthRequest\s*}\s*from\s*['"]\.\.\/middleware\/auth\.middleware['"];?/g,
        to: "import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
      },
      {
        from: /import\s*{\s*ManufacturerAuthRequest\s*}\s*from\s*['"]\.\.\/middleware\/manufacturerAuth\.middleware['"];?/g,
        to: "import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
      },
      {
        from: /import\s*{\s*AuthRequest,\s*[^}]*}\s*from\s*['"]\.\.\/middleware\/auth\.middleware['"];?/g,
        to: "import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
      },
      {
        from: /import\s*{\s*ManufacturerAuthRequest,\s*[^}]*}\s*from\s*['"]\.\.\/middleware\/manufacturerAuth\.middleware['"];?/g,
        to: "import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
      }
    ];
    
    importPatterns.forEach(pattern => {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // Update interface usage
    const interfacePatterns = [
      {
        from: /AuthRequest/g,
        to: "UnifiedAuthRequest"
      },
      {
        from: /ManufacturerAuthRequest/g,
        to: "UnifiedAuthRequest"
      }
    ];
    
    interfacePatterns.forEach(pattern => {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

function migrateControllers() {
  console.log('🚀 Starting controller interface migration...\n');
  
  const files = fs.readdirSync(controllersDir)
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(controllersDir, file));
  
  let migratedCount = 0;
  let totalCount = files.length;
  
  files.forEach(filePath => {
    if (migrateControllerFile(filePath)) {
      migratedCount++;
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total files processed: ${totalCount}`);
  console.log(`   Files migrated: ${migratedCount}`);
  console.log(`   Files unchanged: ${totalCount - migratedCount}`);
  
  if (migratedCount > 0) {
    console.log(`\n✨ Controller migration completed successfully!`);
  } else {
    console.log(`\n✅ No controller files needed migration.`);
  }
}

// Run migration
migrateControllers();
