/**
 * Manufacturer Helpers Service Unit Tests
 * 
 * Tests manufacturer helper utilities and validation functions.
 */

import { ManufacturerHelpersService } from '../../../services/manufacturers/utils/manufacturerHelpers.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { UtilsService } from '../../../services/infrastructure/shared';
import { enhancedCacheService } from '../../../services/external/enhanced-cache.service';

// Mock dependencies
const mockUtilsService = {
  isValidEmail: jest.fn(),
};

const mockEnhancedCacheService = {
  invalidateByTags: jest.fn(),
};

// Mock services
jest.mock('../../../services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));

jest.mock('../../../services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));

// Mock Manufacturer model
jest.mock('../../../models/manufacturer/manufacturer.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerHelpersService', () => {
  let manufacturerHelpersService: ManufacturerHelpersService;

  beforeEach(() => {
    manufacturerHelpersService = new ManufacturerHelpersService();
    jest.clearAllMocks();
    
    mockUtilsService.isValidEmail.mockReturnValue(true);
  });

  describe('validateRegistrationData', () => {
    const validRegistrationData = {
      name: 'Test Manufacturer',
      email: 'test@manufacturer.com',
      password: 'SecurePass123!',
      contactEmail: 'contact@manufacturer.com',
    };

    it('should validate registration data successfully', () => {
      expect(() => {
        manufacturerHelpersService.validateRegistrationData(validRegistrationData);
      }).not.toThrow();
    });

    it('should throw error when email is invalid', () => {
      mockUtilsService.isValidEmail.mockReturnValue(false);

      expect(() => {
        manufacturerHelpersService.validateRegistrationData({
          ...validRegistrationData,
          email: 'invalid-email',
        });
      }).toThrow();
    });

    it('should throw error when name is too short', () => {
      expect(() => {
        manufacturerHelpersService.validateRegistrationData({
          ...validRegistrationData,
          name: 'T',
        });
      }).toThrow();
    });

    it('should throw error when password is too short', () => {
      expect(() => {
        manufacturerHelpersService.validateRegistrationData({
          ...validRegistrationData,
          password: '1234567',
        });
      }).toThrow();
    });

    it('should throw error when contact email is invalid', () => {
      mockUtilsService.isValidEmail
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      expect(() => {
        manufacturerHelpersService.validateRegistrationData({
          ...validRegistrationData,
          contactEmail: 'invalid-contact-email',
        });
      }).toThrow();
    });
  });

  describe('validateUpdateData', () => {
    const validUpdateData = {
      name: 'Updated Manufacturer',
      contactEmail: 'updated@manufacturer.com',
      moq: 100,
    };

    it('should validate update data successfully', () => {
      expect(() => {
        manufacturerHelpersService.validateUpdateData(validUpdateData);
      }).not.toThrow();
    });

    it('should throw error when name is too short', () => {
      expect(() => {
        manufacturerHelpersService.validateUpdateData({
          name: 'T',
        });
      }).toThrow();
    });

    it('should throw error when contact email is invalid', () => {
      mockUtilsService.isValidEmail.mockReturnValue(false);

      expect(() => {
        manufacturerHelpersService.validateUpdateData({
          contactEmail: 'invalid-email',
        });
      }).toThrow();
    });

    it('should throw error when MOQ is negative', () => {
      expect(() => {
        manufacturerHelpersService.validateUpdateData({
          moq: -10,
        });
      }).toThrow();
    });
  });

  describe('generateManufacturerAnalytics', () => {
    it('should generate manufacturer analytics', async () => {
      const result = await manufacturerHelpersService.generateManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(result).toBeDefined();
      expect(result.profileViews).toBeDefined();
      expect(result.connectionRequests).toBeDefined();
      expect(result.activeConnections).toBeDefined();
    });

    it('should filter analytics by date range', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      const result = await manufacturerHelpersService.generateManufacturerAnalytics(
        'manufacturer-id-123',
        dateRange
      );

      expect(result).toBeDefined();
    });
  });

  describe('invalidateManufacturerCaches', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            email: 'test@manufacturer.com',
          }),
        }),
      });
    });

    it('should invalidate manufacturer caches without manufacturerId', async () => {
      await manufacturerHelpersService.invalidateManufacturerCaches();

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'manufacturer_search',
        'manufacturer_analytics',
      ]);
    });

    it('should invalidate manufacturer-specific caches', async () => {
      await manufacturerHelpersService.invalidateManufacturerCaches('manufacturer-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'manufacturer_search',
        'manufacturer_analytics',
        'manufacturer:manufacturer-id-123',
        'email:test@manufacturer.com',
      ]);
    });

    it('should handle missing email gracefully', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await manufacturerHelpersService.invalidateManufacturerCaches('manufacturer-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith(
        expect.arrayContaining(['manufacturer:manufacturer-id-123'])
      );
    });
  });

  describe('formatManufacturerForPublic', () => {
    const mockManufacturer = {
      _id: 'manufacturer-id-123',
      id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      description: 'Test description',
      industry: 'Technology',
      servicesOffered: ['Production'],
      moq: 100,
      headquarters: {
        country: 'US',
        city: 'New York',
      },
      certifications: ['ISO 9001'],
      profileScore: 85,
      isVerified: true,
      createdAt: new Date(),
      password: 'secret',
      email: 'private@example.com',
    };

    it('should format manufacturer for public display', () => {
      const result = manufacturerHelpersService.formatManufacturerForPublic(mockManufacturer);

      expect(result.id).toBe('manufacturer-id-123');
      expect(result.name).toBe('Test Manufacturer');
      expect(result.description).toBe('Test description');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('email');
    });

    it('should use id field when _id is not available', () => {
      const manufacturerWithoutId = {
        ...mockManufacturer,
        _id: undefined,
      };

      const result = manufacturerHelpersService.formatManufacturerForPublic(manufacturerWithoutId);

      expect(result.id).toBe('manufacturer-id-123');
    });
  });

  describe('isProfileComplete', () => {
    it('should return true when all required fields are present', () => {
      const completeManufacturer = {
        name: 'Test Manufacturer',
        description: 'Test description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production'],
        moq: 100,
        headquarters: {
          country: 'US',
        },
      };

      const result = manufacturerHelpersService.isProfileComplete(completeManufacturer);

      expect(result).toBe(true);
    });

    it('should return false when required fields are missing', () => {
      const incompleteManufacturer = {
        name: 'Test Manufacturer',
        // Missing other required fields
      };

      const result = manufacturerHelpersService.isProfileComplete(incompleteManufacturer);

      expect(result).toBe(false);
    });

    it('should return false when array fields are empty', () => {
      const incompleteManufacturer = {
        name: 'Test Manufacturer',
        description: 'Test description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: [], // Empty array
        moq: 100,
        headquarters: {},
      };

      const result = manufacturerHelpersService.isProfileComplete(incompleteManufacturer);

      expect(result).toBe(false);
    });

    it('should return false when object fields are empty', () => {
      const incompleteManufacturer = {
        name: 'Test Manufacturer',
        description: 'Test description',
        industry: 'Technology',
        contactEmail: 'contact@manufacturer.com',
        servicesOffered: ['Production'],
        moq: 100,
        headquarters: {}, // Empty object
      };

      const result = manufacturerHelpersService.isProfileComplete(incompleteManufacturer);

      expect(result).toBe(false);
    });
  });

  describe('sanitizeSearchParams', () => {
    it('should sanitize search parameters', () => {
      const params = {
        query: '  test query  ',
        industry: '  Technology  ',
        services: ['  Production  ', '  Assembly  ', ''],
        minMoq: 50,
        maxMoq: 200,
      };

      const result = manufacturerHelpersService.sanitizeSearchParams(params);

      expect(result.query).toBe('test query');
      expect(result.industry).toBe('Technology');
      expect(result.services).toEqual(['Production', 'Assembly']);
      expect(result.minMoq).toBe(50);
      expect(result.maxMoq).toBe(200);
    });

    it('should handle undefined values', () => {
      const params = {
        query: undefined,
        industry: undefined,
      };

      const result = manufacturerHelpersService.sanitizeSearchParams(params);

      expect(result.query).toBeUndefined();
      expect(result.industry).toBeUndefined();
    });

    it('should filter out empty service strings', () => {
      const params = {
        services: ['Production', '', '   ', 'Assembly'],
      };

      const result = manufacturerHelpersService.sanitizeSearchParams(params);

      expect(result.services).toEqual(['Production', 'Assembly']);
    });
  });
});

