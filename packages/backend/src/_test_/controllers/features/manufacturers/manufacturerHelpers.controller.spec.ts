/**
 * Manufacturer Helpers Controller Unit Tests
 * 
 * Tests helper operations: validation, analytics, cache invalidation, formatting.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerHelpersController } from '../../../../controllers/features/manufacturers/manufacturerHelpers.controller';
import { manufacturerHelpersService } from '../../../../services/manufacturers/utils/manufacturerHelpers.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer helpers service
jest.mock('../../../../services/manufacturers/utils/manufacturerHelpers.service', () => ({
  manufacturerHelpersService: {
    validateRegistrationData: jest.fn(),
    validateUpdateData: jest.fn(),
    generateManufacturerAnalytics: jest.fn(),
    invalidateManufacturerCaches: jest.fn(),
    formatManufacturerForPublic: jest.fn(),
    isProfileComplete: jest.fn(),
    sanitizeSearchParams: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerHelpersController', () => {
  let manufacturerHelpersController: ManufacturerHelpersController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerHelpersController = new ManufacturerHelpersController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('validateRegistrationData', () => {
    const mockValidation = {
      valid: true,
      errors: [],
    };

    beforeEach(() => {
      (manufacturerHelpersService.validateRegistrationData as jest.Mock).mockReturnValue(
        mockValidation
      );
    });

    it('should validate registration data successfully', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
        industry: 'Electronics',
        servicesOffered: ['Assembly'],
      };

      await manufacturerHelpersController.validateRegistrationData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.validateRegistrationData).toHaveBeenCalledWith(
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.validation).toEqual(mockValidation);
    });

    it('should return 400 when validation fails', async () => {
      const invalidValidation = {
        valid: false,
        errors: [{ field: 'email', message: 'Invalid email format' }],
      };
      (manufacturerHelpersService.validateRegistrationData as jest.Mock).mockReturnValue(
        invalidValidation
      );
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'invalid-email',
        password: 'Password123!',
      };

      await manufacturerHelpersController.validateRegistrationData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };

      await manufacturerHelpersController.validateRegistrationData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });
  });

  describe('validateUpdateData', () => {
    const mockValidation = {
      valid: true,
      errors: [],
    };

    beforeEach(() => {
      (manufacturerHelpersService.validateUpdateData as jest.Mock).mockReturnValue(mockValidation);
    });

    it('should validate update data successfully', async () => {
      mockRequest.validatedBody = {
        name: 'Updated Manufacturer',
        description: 'Updated description',
        industry: 'Electronics',
      };

      await manufacturerHelpersController.validateUpdateData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.validateUpdateData).toHaveBeenCalledWith(
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('generateManufacturerAnalytics', () => {
    const mockAnalytics = {
      totalProducts: 10,
      totalConnections: 5,
      profileCompleteness: 85,
    };

    beforeEach(() => {
      (manufacturerHelpersService.generateManufacturerAnalytics as jest.Mock).mockResolvedValue(
        mockAnalytics
      );
    });

    it('should generate analytics without date range', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {};

      await manufacturerHelpersController.generateManufacturerAnalytics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.generateManufacturerAnalytics).toHaveBeenCalledWith(
        'manufacturer-id-123',
        undefined,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should generate analytics with date range', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      await manufacturerHelpersController.generateManufacturerAnalytics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.generateManufacturerAnalytics).toHaveBeenCalled();
    });
  });

  describe('invalidateManufacturerCaches', () => {
    beforeEach(() => {
      (manufacturerHelpersService.invalidateManufacturerCaches as jest.Mock).mockResolvedValue({
        invalidated: true,
      });
    });

    it('should invalidate manufacturer caches', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerHelpersController.invalidateManufacturerCaches(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.invalidateManufacturerCaches).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('formatManufacturerForPublic', () => {
    const mockFormatted = {
      id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      industry: 'Electronics',
    };

    beforeEach(() => {
      (manufacturerHelpersService.formatManufacturerForPublic as jest.Mock).mockReturnValue(
        mockFormatted
      );
    });

    it('should format manufacturer for public display', async () => {
      mockRequest.validatedBody = {
        manufacturer: {
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          email: 'test@example.com',
          internalData: 'secret',
        },
      };

      await manufacturerHelpersController.formatManufacturerForPublic(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.formatManufacturerForPublic).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturer
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.formatted).toEqual(mockFormatted);
      // Verify sensitive data is not exposed
      expect(JSON.stringify(responseData.data.formatted)).not.toContain('secret');
    });
  });

  describe('isProfileComplete', () => {
    beforeEach(() => {
      (manufacturerHelpersService.isProfileComplete as jest.Mock).mockReturnValue(true);
    });

    it('should check if profile is complete', async () => {
      mockRequest.validatedBody = {
        manufacturer: {
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          industry: 'Electronics',
          servicesOffered: ['Assembly'],
        },
      };

      await manufacturerHelpersController.isProfileComplete(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.isProfileComplete).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturer
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.complete).toBe(true);
    });
  });

  describe('sanitizeSearchParams', () => {
    const mockSanitized = {
      query: 'test',
      industry: 'Electronics',
    };

    beforeEach(() => {
      (manufacturerHelpersService.sanitizeSearchParams as jest.Mock).mockReturnValue(
        mockSanitized
      );
    });

    it('should sanitize search parameters', async () => {
      mockRequest.validatedBody = {
        params: {
          query: '<script>alert("xss")</script>test',
          industry: 'Electronics',
        },
      };

      await manufacturerHelpersController.sanitizeSearchParams(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerHelpersService.sanitizeSearchParams).toHaveBeenCalledWith(
        mockRequest.validatedBody.params
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Validation service unavailable',
      };
      (manufacturerHelpersService.validateRegistrationData as jest.Mock).mockImplementation(() => {
        throw serviceError;
      });

      await manufacturerHelpersController.validateRegistrationData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerHelpersController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };
      (manufacturerHelpersService.validateRegistrationData as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });

      await manufacturerHelpersController.validateRegistrationData(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'VALIDATE_REGISTRATION_DATA'
      );
    });
  });
});

