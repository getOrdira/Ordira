// Cleanup script to remove duplicate imports from migrated route files
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

function cleanupFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Split into lines
    const lines = content.split('\n');
    const cleanedLines = [];
    const seenImports = new Set();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is an import line
      if (line.trim().startsWith('import')) {
        const importKey = line.trim();
        
        // Skip if we've already seen this exact import
        if (seenImports.has(importKey)) {
          modified = true;
          continue;
        }
        
        // Check for duplicate imports from the same module
        const moduleMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        if (moduleMatch) {
          const modulePath = moduleMatch[1];
          const importKey = `from_${modulePath}`;
          
          if (seenImports.has(importKey)) {
            modified = true;
            continue;
          }
          
          seenImports.add(importKey);
        }
        
        seenImports.add(importKey);
      }
      
      cleanedLines.push(line);
    }
    
    if (modified) {
      const cleanedContent = cleanedLines.join('\n');
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No cleanup needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return false;
  }
}

function cleanupRoutes() {
  console.log('🧹 Starting import cleanup...\n');
  
  const files = fs.readdirSync(routesDir)
    .filter(file => file.endsWith('.routes.ts'))
    .map(file => path.join(routesDir, file));
  
  // Also include integration files
  const integrationsDir = path.join(routesDir, 'integrations');
  if (fs.existsSync(integrationsDir)) {
    const integrationFiles = fs.readdirSync(integrationsDir)
      .filter(file => file.endsWith('.routes.ts'))
      .map(file => path.join(integrationsDir, file));
    files.push(...integrationFiles);
  }
  
  let cleanedCount = 0;
  
  files.forEach(filePath => {
    if (cleanupFile(filePath)) {
      cleanedCount++;
    }
  });
  
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files cleaned: ${cleanedCount}`);
  
  if (cleanedCount > 0) {
    console.log(`\n✨ Cleanup completed successfully!`);
  } else {
    console.log(`\n✅ No cleanup needed.`);
  }
}

// Run cleanup
cleanupRoutes();
