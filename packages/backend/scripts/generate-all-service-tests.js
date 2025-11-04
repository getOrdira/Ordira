/**
 * Batch Service Test File Generator
 * 
 * Generates test files for all services in a given folder
 * Usage: node scripts/generate-all-service-tests.js <serviceFolder>
 * Example: node scripts/generate-all-service-tests.js manufacturers
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function findServiceFiles(serviceFolder) {
  const servicesPath = path.join(process.cwd(), 'packages/backend/src/services', serviceFolder);
  
  if (!fs.existsSync(servicesPath)) {
    console.error(`Service folder not found: ${servicesPath}`);
    return [];
  }

  // Find all .service.ts files
  const pattern = path.join(servicesPath, '**/*.service.ts');
  const files = glob.sync(pattern);
  
  return files.map(file => {
    const relativePath = path.relative(
      path.join(process.cwd(), 'packages/backend/src/services'),
      file
    );
    const serviceName = path.basename(file, '.service.ts');
    return { file, relativePath, serviceName };
  });
}

function generateTestFile(serviceInfo, serviceFolder) {
  const { file, relativePath, serviceName } = serviceInfo;
  
  // Read service file
  const serviceContent = fs.readFileSync(file, 'utf-8');
  
  // Extract class name
  const classMatch = serviceContent.match(/export class (\w+)/);
  const className = classMatch ? classMatch[1] : `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service`;
  
  // Extract methods
  const methodMatches = Array.from(serviceContent.matchAll(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g));
  const publicMethods = methodMatches
    .map(m => m[1])
    .filter(m => 
      !m.startsWith('_') && 
      m !== 'constructor' && 
      m !== 'getInstance' &&
      !['then', 'catch', 'finally'].includes(m)
    )
    .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  
  // Determine test file path
  const testDir = path.join(
    process.cwd(),
    'packages/backend/src/_test_/services',
    serviceFolder
  );
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const testFilePath = path.join(testDir, `${serviceName}.service.spec.ts`);
  
  // Skip if already exists
  if (fs.existsSync(testFilePath)) {
    console.log(`⏭️  Skipped (exists): ${testFilePath}`);
    return false;
  }
  
  // Generate test content
  const testContent = generateTestContent(
    className,
    serviceName,
    relativePath,
    publicMethods,
    serviceFolder
  );
  
  fs.writeFileSync(testFilePath, testContent, 'utf-8');
  console.log(`✅ Generated: ${testFilePath}`);
  return true;
}

function generateTestContent(className, serviceName, servicePath, methods, serviceFolder) {
  // Calculate relative path (test files are in _test_/services/{folder}/)
  // Service files are in services/{folder}/...
  const pathParts = servicePath.split(path.sep);
  const depth = pathParts.length - 1;
  const relativePath = '../'.repeat(depth + 3);
  
  const normalizedPath = servicePath.replace(/\\/g, '/').replace(/\.ts$/, '');
  
  // Detect service type
  const isValidation = serviceName.includes('Validation');
  const isData = serviceName.includes('Data');
  const isAuth = serviceName.includes('Auth');
  const isCache = serviceName.includes('Cache');
  const isAnalytics = serviceName.includes('Analytics');
  const isSearch = serviceName.includes('Search');
  const isProfile = serviceName.includes('Profile');
  const isAccount = serviceName.includes('Account');
  const isFormatter = serviceName.includes('Formatter');
  const isHelper = serviceName.includes('Helper');
  
  // Generate imports and mocks based on service type
  let imports = `import { ${className} } from '${relativePath}services/${normalizedPath}';`;
  let modelImport = '';
  let mocks = '';
  
  // Add model imports
  if (['manufacturers', 'brands', 'users', 'products', 'certificates'].includes(serviceFolder)) {
    const modelMap = {
      manufacturers: { import: "import { Manufacturer } from '${relativePath}models/manufacturer/manufacturer.model';", name: 'Manufacturer' },
      brands: { import: "import { Business } from '${relativePath}models/deprecated/business.model';", name: 'Business' },
      users: { import: "import { User } from '${relativePath}models/user';", name: 'User' },
      products: { import: "import { Product } from '${relativePath}models/product/product.model';", name: 'Product' },
      certificates: { import: "import { Certificate } from '${relativePath}models/certificate/certificate.model';", name: 'Certificate' },
    };
    if (modelMap[serviceFolder]) {
      modelImport = modelMap[serviceFolder].import;
    }
  }
  
  // Generate mocks
  if (isValidation) {
    mocks = `
const mockUtilsService = {
  isValidEmail: jest.fn(),
};

jest.mock('${relativePath}services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));`;
  } else if (isData || isAuth || isProfile || isAccount) {
    mocks = `
const mockEnhancedCacheService = {
  getCachedManufacturer: jest.fn(),
  cacheManufacturer: jest.fn(),
  getCachedManufacturerSearch: jest.fn(),
  cacheManufacturerSearch: jest.fn(),
  invalidateByTags: jest.fn(),
};

const mockQueryOptimizationService = {
  optimizedManufacturerSearch: jest.fn(),
};

jest.mock('${relativePath}services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));

jest.mock('${relativePath}services/external/query-optimization.service', () => ({
  queryOptimizationService: mockQueryOptimizationService,
}));

jest.mock('${relativePath}models/${getModelPath(serviceFolder)}');`;
  } else if (isCache) {
    mocks = `
const mockEnhancedCacheService = {
  getCachedUser: jest.fn(),
  cacheUser: jest.fn(),
  getCachedAnalytics: jest.fn(),
  cacheAnalytics: jest.fn(),
  invalidateByTags: jest.fn(),
};

jest.mock('${relativePath}services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));`;
  } else {
    mocks = `
// Mock dependencies - customize based on service needs
const mockDependency = {
  // Add mock methods here
};

// jest.mock('${relativePath}services/...', () => ({
//   dependencyService: mockDependency,
// }));`;
  }
  
  // Generate method tests
  let methodTests = '';
  if (methods.length > 0) {
    methodTests = methods.map(method => `  describe('${method}', () => {
    it('should ${method} successfully', async () => {
      // Mock setup
      ${getMockSetupForMethod(method, serviceName)}
      
      const result = await ${serviceName}Service.${method}(${getMethodParams(method)});
      
      expect(result).toBeDefined();
    });

    it('should handle errors when ${method} fails', async () => {
      // Error scenario setup
      ${getErrorMockSetupForMethod(method, serviceName)}
      
      await expect(${serviceName}Service.${method}(${getMethodParams(method)})).rejects.toThrow();
    });

    it('should validate input parameters for ${method}', async () => {
      // Validation test
      ${getValidationMockSetup(method, serviceName)}
      
      await expect(${serviceName}Service.${method}(null)).rejects.toThrow();
    });
  });`).join('\n\n');
  } else {
    methodTests = `  describe('Service Methods', () => {
    it('should be instantiated', () => {
      expect(${serviceName}Service).toBeDefined();
    });

    // Add method tests here as methods are implemented
  });`;
  }
  
  return `/**
 * ${className} Unit Tests
 * 
 * Tests ${serviceName} service operations.
 */

${imports}
${modelImport}

${mocks}

// Mock logger
jest.mock('${relativePath}utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('${className}', () => {
  let ${serviceName}Service: ${className};
${getMockVariables(serviceFolder)}

  beforeEach(() => {
    ${serviceName}Service = new ${className}();
    jest.clearAllMocks();
    ${getSetupCode(serviceFolder)}
  });

${methodTests}
});
`;
}

function getModelPath(serviceFolder) {
  const map = {
    manufacturers: 'manufacturer/manufacturer.model',
    brands: 'deprecated/business.model',
    users: 'user',
    products: 'product/product.model',
    certificates: 'certificate/certificate.model',
  };
  return map[serviceFolder] || 'model';
}

function getMockVariables(serviceFolder) {
  if (['manufacturers', 'brands', 'users', 'products', 'certificates'].includes(serviceFolder)) {
    return `  let mockModel: jest.Mocked<any>;`;
  }
  return '';
}

function getSetupCode(serviceFolder) {
  if (['manufacturers', 'brands', 'users', 'products', 'certificates'].includes(serviceFolder)) {
    return `    mockModel = {} as jest.Mocked<any>;`;
  }
  return '';
}

function getMockSetupForMethod(method, serviceName) {
  if (method.includes('get') || method.includes('find')) {
    return `// Setup mock return value for ${method}`;
  }
  return `// Setup mock for ${method}`;
}

function getErrorMockSetupForMethod(method, serviceName) {
  return `// Setup error scenario for ${method}`;
}

function getValidationMockSetup(method, serviceName) {
  return `// Setup validation scenario for ${method}`;
}

function getMethodParams(method) {
  // Simple parameter detection - can be enhanced
  if (method.includes('ById')) return "'test-id'";
  if (method.includes('ByEmail')) return "'test@example.com'";
  if (method.includes('Search') || method.includes('Find')) return '{}';
  if (method.includes('Create') || method.includes('Update')) return '{}';
  return '';
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node generate-all-service-tests.js <serviceFolder>');
    console.error('Example: node generate-all-service-tests.js manufacturers');
    process.exit(1);
  }

  const serviceFolder = args[0];
  console.log(`\n🔍 Finding services in: ${serviceFolder}\n`);
  
  const services = findServiceFiles(serviceFolder);
  
  if (services.length === 0) {
    console.error(`No service files found in ${serviceFolder}`);
    process.exit(1);
  }
  
  console.log(`Found ${services.length} service files\n`);
  
  let generated = 0;
  let skipped = 0;
  
  services.forEach(service => {
    if (generateTestFile(service, serviceFolder)) {
      generated++;
    } else {
      skipped++;
    }
  });
  
  console.log(`\n✅ Generated: ${generated} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log(`📊 Total: ${services.length} services\n`);
}

module.exports = { generateTestFile, findServiceFiles };

