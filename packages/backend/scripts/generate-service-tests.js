/**
 * Service Test File Generator
 * 
 * Generates test files for services following the established pattern
 * Usage: node scripts/generate-service-tests.js <servicePath> <serviceName>
 */

const fs = require('fs');
const path = require('path');

function generateTestFile(servicePath, serviceName, testDirPath) {
  // Read the actual service file to understand its structure
  const serviceFilePath = path.join(process.cwd(), 'packages/backend/src', servicePath);
  
  if (!fs.existsSync(serviceFilePath)) {
    console.error(`Service file not found: ${serviceFilePath}`);
    return false;
  }

  const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');
  
  // Extract class name
  const classMatch = serviceContent.match(/export class (\w+)/);
  const className = classMatch ? classMatch[1] : `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service`;
  
  // Extract methods (simple detection)
  const methodMatches = serviceContent.matchAll(/async (\w+)\(/g);
  const methods = Array.from(methodMatches).map(m => m[1]).filter(m => !m.startsWith('_'));

  // Determine service category
  const serviceCategory = servicePath.split('/').slice(-2, -1)[0]; // e.g., 'manufacturers', 'brands', 'users'
  const serviceFolder = servicePath.split('/').slice(-2, -1)[0]; // folder name
  
  // Determine relative path for imports
  const depth = servicePath.split('/').length - 1;
  const relativePath = '../'.repeat(depth + 3); // Adjust based on test file location
  
  // Generate test file path
  const testFilePath = path.join(
    process.cwd(),
    'packages/backend/src/_test_/services',
    serviceFolder,
    `${serviceName}.service.spec.ts`
  );

  // Ensure directory exists
  const testDir = path.dirname(testFilePath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Generate test file content
  const testContent = generateTestContent(
    className,
    serviceName,
    servicePath,
    methods,
    serviceFolder
  );

  fs.writeFileSync(testFilePath, testContent, 'utf-8');
  console.log(`✅ Generated: ${testFilePath}`);
  return true;
}

function generateTestContent(className, serviceName, servicePath, methods, serviceFolder) {
  const relativePath = calculateRelativePath(servicePath);
  const normalizedServicePath = servicePath.replace(/\.ts$/, '');
  
  // Detect common dependencies
  const isValidationService = serviceName.includes('Validation');
  const isDataService = serviceName.includes('Data');
  const isAuthService = serviceName.includes('Auth');
  const isCacheService = serviceName.includes('Cache');
  const isAnalyticsService = serviceName.includes('Analytics');
  const isSearchService = serviceName.includes('Search');
  const isProfileService = serviceName.includes('Profile');
  const isAccountService = serviceName.includes('Account');

  let mockDependencies = '';
  let mockServices = '';
  let describeContent = '';

  // Generate mocks based on service type
  if (isValidationService) {
    mockDependencies = `
const mockUtilsService = {
  isValidEmail: jest.fn(),
};

jest.mock('${relativePath}services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));`;
  } else if (isDataService || isAuthService || isProfileService || isAccountService) {
    // Determine model name from service path
    const modelName = detectModelName(servicePath, serviceFolder);
    mockDependencies = `
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

jest.mock('${relativePath}models/${modelName}');`;
  } else if (isCacheService) {
    mockDependencies = `
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
    mockDependencies = `
// Mock dependencies - customize based on service needs
const mockDependency = {
  // Add mock methods here
};`;
  }

  // Generate describe blocks for methods
  if (methods.length > 0) {
    describeContent = methods.map(method => `
  describe('${method}', () => {
    it('should ${method} successfully', async () => {
      // Mock setup
      
      const result = await ${serviceName}Service.${method}();
      
      expect(result).toBeDefined();
    });

    it('should handle errors when ${method} fails', async () => {
      // Error scenario test
      
      await expect(${serviceName}Service.${method}()).rejects.toThrow();
    });
  });`).join('\n');
  } else {
    describeContent = `
  describe('Service Methods', () => {
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

import { ${className} } from '${relativePath}${normalizedServicePath}';
${getAdditionalImports(servicePath, serviceFolder, relativePath)}

${mockDependencies}

${mockServices}

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
${getMockVariables(servicePath, serviceFolder)}

  beforeEach(() => {
    ${serviceName}Service = new ${className}();
    jest.clearAllMocks();
    ${getSetupCode(servicePath, serviceFolder)}
  });

${describeContent}
});
`;
}

function calculateRelativePath(servicePath) {
  const depth = servicePath.split('/').length - 1;
  return '../'.repeat(depth + 3);
}

function detectModelName(servicePath, serviceFolder) {
  if (serviceFolder === 'manufacturers') return 'manufacturer/manufacturer.model';
  if (serviceFolder === 'brands') return 'deprecated/business.model';
  if (serviceFolder === 'users') return 'user';
  if (serviceFolder === 'products') return 'product/product.model';
  if (serviceFolder === 'certificates') return 'certificate/certificate.model';
  return 'model';
}

function getAdditionalImports(servicePath, serviceFolder, relativePath) {
  const imports = [];
  if (serviceFolder === 'manufacturers') {
    imports.push(`import { Manufacturer } from '${relativePath}models/manufacturer/manufacturer.model';`);
  } else if (serviceFolder === 'brands') {
    imports.push(`import { Business } from '${relativePath}models/deprecated/business.model';`);
  } else if (serviceFolder === 'users') {
    imports.push(`import { User } from '${relativePath}models/user';`);
  }
  return imports.join('\n');
}

function getMockVariables(servicePath, serviceFolder) {
  if (['manufacturers', 'brands', 'users', 'products'].includes(serviceFolder)) {
    return `  let mockModel: jest.Mocked<any>;`;
  }
  return '';
}

function getSetupCode(servicePath, serviceFolder) {
  if (['manufacturers', 'brands', 'users', 'products'].includes(serviceFolder)) {
    return `    mockModel = {} as jest.Mocked<any>;`;
  }
  return '';
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generate-service-tests.js <servicePath> <serviceName>');
    console.error('Example: node generate-service-tests.js services/manufacturers/core/manufacturerData.service.ts manufacturerData');
    process.exit(1);
  }

  const [servicePath, serviceName] = args;
  const testDirPath = 'packages/backend/src/_test_/services';
  
  generateTestFile(servicePath, serviceName, testDirPath);
}

module.exports = { generateTestFile };

