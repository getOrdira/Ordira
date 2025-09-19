#!/usr/bin/env node

/**
 * Migration script to replace console.log statements with structured logging
 * Usage: node src/utils/migrate-logging.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to find and replace
const replacements = [
  // Error logging
  {
    pattern: /console\.error\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);?/g,
    replacement: (match, message, context) => {
      if (context.trim()) {
        return `logger.error('${message}', ${context.trim()});`;
      }
      return `logger.error('${message}');`;
    }
  },
  
  // Warning logging
  {
    pattern: /console\.warn\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);?/g,
    replacement: (match, message, context) => {
      if (context.trim()) {
        return `logger.warn('${message}', ${context.trim()});`;
      }
      return `logger.warn('${message}');`;
    }
  },
  
  // Info logging
  {
    pattern: /console\.log\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);?/g,
    replacement: (match, message, context) => {
      if (context.trim()) {
        return `logger.info('${message}', ${context.trim()});`;
      }
      return `logger.info('${message}');`;
    }
  },
  
  // Debug logging
  {
    pattern: /console\.debug\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);?/g,
    replacement: (match, message, context) => {
      if (context.trim()) {
        return `logger.debug('${message}', ${context.trim()});`;
      }
      return `logger.debug('${message}');`;
    }
  }
];

// Files to exclude from migration
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/migrate-logging.js'
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Add logger import if not present
    if (content.includes('console.') && !content.includes("import { logger }")) {
      const importMatch = content.match(/^import.*from.*['"]/m);
      if (importMatch) {
        const importIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
        const nextLineIndex = content.indexOf('\n', importIndex);
        content = content.slice(0, nextLineIndex) + 
                 "\nimport { logger } from '../utils/logger';" + 
                 content.slice(nextLineIndex);
        modified = true;
      }
    }
    
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting structured logging migration...\n');
  
  // Find all TypeScript files
  const files = glob.sync('src/**/*.ts', {
    ignore: excludePatterns
  });
  
  let migratedCount = 0;
  let totalCount = files.length;
  
  files.forEach(file => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total files processed: ${totalCount}`);
  console.log(`   Files migrated: ${migratedCount}`);
  console.log(`   Files unchanged: ${totalCount - migratedCount}`);
  
  if (migratedCount > 0) {
    console.log(`\n✨ Migration completed! Don't forget to:`);
    console.log(`   1. Review the changes`);
    console.log(`   2. Test the application`);
    console.log(`   3. Update any custom logging patterns`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, replacements };
