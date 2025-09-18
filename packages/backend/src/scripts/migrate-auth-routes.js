// Migration script to update all route files to use unified authentication
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const integrationsDir = path.join(routesDir, 'integrations');

// Files that need migration
const filesToMigrate = [
  'votes.routes.ts',
  'supplyChain.routes.ts',
  'products.routes.ts',
  'notification.routes.ts',
  'nfts.routes.ts',
  'media.routes.ts',
  'manufacturerProfile.routes.ts',
  'invitation.routes.ts',
  'integrations.routes.ts',
  'emailGating.routes.ts',
  'domainMapping.routes.ts',
  'certificate.routes.ts',
  'brandProfile.routes.ts',
  'brandAccount.routes.ts',
  'billing.routes.ts',
  'apiKey.routes.ts',
  'analytics.routes.ts',
  'integrations/woocommerce.routes.ts',
  'integrations/wix.routes.ts',
  'integrations/shopify.routes.ts'
];

// Migration patterns
const migrationPatterns = [
  // Import statements
  {
    from: /import\s*{\s*authenticate\s*}\s*from\s*['"]\.\.\/middleware\/auth\.middleware['"];?/g,
    to: "import { authenticate } from '../middleware/unifiedAuth.middleware';"
  },
  {
    from: /import\s*{\s*authenticateManufacturer\s*}\s*from\s*['"]\.\.\/middleware\/manufacturerAuth\.middleware['"];?/g,
    to: "import { authenticate, requireManufacturer } from '../middleware/unifiedAuth.middleware';"
  },
  {
    from: /import\s*{\s*authenticateManufacturer,\s*requireVerifiedManufacturer\s*}\s*from\s*['"]\.\.\/middleware\/manufacturerAuth\.middleware['"];?/g,
    to: "import { authenticate, requireManufacturer, requireVerifiedManufacturer } from '../middleware/unifiedAuth.middleware';"
  },
  {
    from: /import\s*{\s*authenticate,\s*AuthRequest\s*}\s*from\s*['"]\.\.\/middleware\/auth\.middleware['"];?/g,
    to: "import { authenticate, UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
  },
  {
    from: /import\s*{\s*authenticateManufacturer,\s*ManufacturerAuthRequest\s*}\s*from\s*['"]\.\.\/middleware\/manufacturerAuth\.middleware['"];?/g,
    to: "import { authenticate, requireManufacturer, UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';"
  },
  
  // For integration files with different path
  {
    from: /import\s*{\s*authenticate,\s*AuthRequest\s*}\s*from\s*['"]\.\.\/\.\.\/middleware\/auth\.middleware['"];?/g,
    to: "import { authenticate, UnifiedAuthRequest } from '../../middleware/unifiedAuth.middleware';"
  },
  
  // Middleware usage patterns
  {
    from: /router\.use\(authenticateManufacturer\);?/g,
    to: "router.use(authenticate, requireManufacturer);"
  },
  {
    from: /authenticateManufacturer,/g,
    to: "authenticate, requireManufacturer,"
  },
  
  // Interface usage patterns
  {
    from: /AuthRequest/g,
    to: "UnifiedAuthRequest"
  },
  {
    from: /ManufacturerAuthRequest/g,
    to: "UnifiedAuthRequest"
  }
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply migration patterns
    migrationPatterns.forEach(pattern => {
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

function migrateRoutes() {
  console.log('🚀 Starting authentication route migration...\n');
  
  let migratedCount = 0;
  let totalCount = 0;
  
  filesToMigrate.forEach(fileName => {
    const filePath = path.join(routesDir, fileName);
    
    if (fs.existsSync(filePath)) {
      totalCount++;
      if (migrateFile(filePath)) {
        migratedCount++;
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total files processed: ${totalCount}`);
  console.log(`   Files migrated: ${migratedCount}`);
  console.log(`   Files unchanged: ${totalCount - migratedCount}`);
  
  if (migratedCount > 0) {
    console.log(`\n✨ Migration completed successfully!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Review the migrated files for any manual adjustments`);
    console.log(`   2. Test the authentication flows`);
    console.log(`   3. Update any controller interfaces if needed`);
    console.log(`   4. Remove old middleware files after testing`);
  } else {
    console.log(`\n✅ No files needed migration.`);
  }
}

// Run migration
migrateRoutes();
