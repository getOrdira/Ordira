/**
 * Brand Completeness Controller Unit Tests
 * 
 * Tests brand completeness operations: calculate business profile, brand settings, integration, overall, get configs, simple calculations.
 */

import { Response, NextFunction } from 'express';
import { BrandCompletenessController } from '../../../../controllers/features/brands/brandCompleteness.controller';
import { getBrandsServices } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
  getBrandsServices: jest.fn(() => ({
    profile: {
      getBrandProfile: jest.fn().mockResolvedValue({}),
    },
    settings: {
      getSettings: jest.fn().mockResolvedValue({}),
    },
    completeness: {
      calculateBusinessProfileCompleteness: jest.fn().mockReturnValue({ score: 0 }),
      calculateBrandSettingsCompleteness: jest.fn().mockReturnValue({ score: 0 }),
      calculateIntegrationCompleteness: jest.fn().mockReturnValue({ score: 0 }),
      calculateOverallCompleteness: jest.fn().mockReturnValue({ score: 0 }),
      getBusinessProfileConfig: jest.fn().mockReturnValue({ requiredFields: [], optionalFields: [] }),
      getBrandSettingsConfig: jest.fn().mockReturnValue({ requiredFields: [], optionalFields: [] }),
      getIntegrationConfig: jest.fn().mockReturnValue({ requiredFields: [], optionalFields: [] }),
      calculateSimpleProfileCompleteness: jest.fn().mockReturnValue(0),
      calculateSimpleSetupCompleteness: jest.fn().mockReturnValue(0),
    },
  })),
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

describe('BrandCompletenessController', () => {
  let brandCompletenessController: BrandCompletenessController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandCompletenessController = new BrandCompletenessController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockBrandServices = getBrandsServices();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandCompletenessController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandCompletenessController as any).recordPerformance = jest.fn();
    (brandCompletenessController as any).logAction = jest.fn();
    (brandCompletenessController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          // Handle both Error objects and plain error objects
          const statusCode = error?.statusCode || (error?.error?.code === 'INTERNAL_ERROR' ? 500 : 500);
          const errorMessage = error?.message || error?.error?.message || 'Internal server error';
          res.status(statusCode).json({ 
            success: false, 
            error: {
              code: error?.code || 'INTERNAL_ERROR',
              message: errorMessage
            }
          });
        }
      }
    );
    (brandCompletenessController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('calculateBusinessProfileCompleteness', () => {
    const mockProfile = { name: 'Test Brand' };
    const mockResult = {
      score: 75,
      missingFields: ['logoUrl'],
    };

    beforeEach(() => {
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue(mockProfile);
      (mockBrandServices.completeness.calculateBusinessProfileCompleteness as jest.Mock).mockReturnValue(
        mockResult
      );
    });

    it('should calculate business profile completeness', async () => {
      mockRequest.validatedQuery = {
        plan: 'foundation',
      };

      await brandCompletenessController.calculateBusinessProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.profile.getBrandProfile).toHaveBeenCalledWith('business-id-123');
      expect(mockBrandServices.completeness.calculateBusinessProfileCompleteness).toHaveBeenCalledWith(
        mockProfile,
        'foundation'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use foundation plan as default', async () => {
      mockRequest.validatedQuery = {};

      await brandCompletenessController.calculateBusinessProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.calculateBusinessProfileCompleteness).toHaveBeenCalledWith(
        mockProfile,
        'foundation'
      );
    });
  });

  describe('calculateBrandSettingsCompleteness', () => {
    const mockSettings = { themeColor: '#FF0000' };
    const mockResult = {
      score: 80,
      missingFields: ['subdomain'],
    };

    beforeEach(() => {
      (mockBrandServices.settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);
      (mockBrandServices.completeness.calculateBrandSettingsCompleteness as jest.Mock).mockReturnValue(
        mockResult
      );
    });

    it('should calculate brand settings completeness', async () => {
      mockRequest.validatedQuery = {
        plan: 'premium',
      };

      await brandCompletenessController.calculateBrandSettingsCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.settings.getSettings).toHaveBeenCalledWith('business-id-123');
      expect(mockBrandServices.completeness.calculateBrandSettingsCompleteness).toHaveBeenCalledWith(
        mockSettings,
        'premium'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('calculateIntegrationCompleteness', () => {
    const mockSettings = {};
    const mockResult = {
      score: 60,
      missingFields: ['shopifyIntegration'],
    };

    beforeEach(() => {
      (mockBrandServices.settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);
      (mockBrandServices.completeness.calculateIntegrationCompleteness as jest.Mock).mockReturnValue(
        mockResult
      );
    });

    it('should calculate integration completeness', async () => {
      mockRequest.validatedQuery = {
        plan: 'growth',
      };

      await brandCompletenessController.calculateIntegrationCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.calculateIntegrationCompleteness).toHaveBeenCalledWith(
        {},
        'growth'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('calculateOverallCompleteness', () => {
    const mockProfile = { name: 'Test Brand' };
    const mockSettings = {};
    const mockResult = {
      score: 70,
      breakdown: {
        profile: 75,
        settings: 80,
        integrations: 60,
      },
    };

    beforeEach(() => {
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue(mockProfile);
      (mockBrandServices.settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);
      (mockBrandServices.completeness.calculateOverallCompleteness as jest.Mock).mockReturnValue(
        mockResult
      );
    });

    it('should calculate overall completeness', async () => {
      mockRequest.validatedQuery = {
        plan: 'premium',
      };

      await brandCompletenessController.calculateOverallCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.calculateOverallCompleteness).toHaveBeenCalledWith(
        mockProfile,
        mockSettings,
        {},
        'premium'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBusinessProfileConfig', () => {
    const mockConfig = {
      requiredFields: ['name', 'email'],
      optionalFields: ['logoUrl', 'description'],
    };

    beforeEach(() => {
      (mockBrandServices.completeness.getBusinessProfileConfig as jest.Mock).mockReturnValue(
        mockConfig
      );
    });

    it('should retrieve business profile configuration', async () => {
      mockRequest.validatedQuery = {
        plan: 'foundation',
      };

      await brandCompletenessController.getBusinessProfileConfig(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.getBusinessProfileConfig).toHaveBeenCalledWith(
        'foundation'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandSettingsConfig', () => {
    const mockConfig = {
      requiredFields: ['themeColor'],
      optionalFields: ['subdomain', 'customDomain'],
    };

    beforeEach(() => {
      (mockBrandServices.completeness.getBrandSettingsConfig as jest.Mock).mockReturnValue(
        mockConfig
      );
    });

    it('should retrieve brand settings configuration', async () => {
      mockRequest.validatedQuery = {
        plan: 'premium',
      };

      await brandCompletenessController.getBrandSettingsConfig(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.getBrandSettingsConfig).toHaveBeenCalledWith(
        'premium'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getIntegrationConfig', () => {
    const mockConfig = {
      requiredFields: [],
      optionalFields: ['shopifyIntegration', 'woocommerceIntegration'],
    };

    beforeEach(() => {
      (mockBrandServices.completeness.getIntegrationConfig as jest.Mock).mockReturnValue(
        mockConfig
      );
    });

    it('should retrieve integration configuration', async () => {
      mockRequest.validatedQuery = {
        plan: 'growth',
      };

      await brandCompletenessController.getIntegrationConfig(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.completeness.getIntegrationConfig).toHaveBeenCalledWith('growth');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('calculateSimpleProfileCompleteness', () => {
    const mockProfile = { name: 'Test Brand' };

    beforeEach(() => {
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue(mockProfile);
      (mockBrandServices.completeness.calculateSimpleProfileCompleteness as jest.Mock).mockReturnValue(
        75
      );
    });

    it('should calculate simple profile completeness', async () => {
      await brandCompletenessController.calculateSimpleProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.completeness.calculateSimpleProfileCompleteness).toHaveBeenCalledWith(
        mockProfile
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('calculateSimpleSetupCompleteness', () => {
    const mockSettings = { themeColor: '#FF0000' };

    beforeEach(() => {
      (mockBrandServices.settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);
      (mockBrandServices.completeness.calculateSimpleSetupCompleteness as jest.Mock).mockReturnValue(
        80
      );
    });

    it('should calculate simple setup completeness', async () => {
      await brandCompletenessController.calculateSimpleSetupCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.settings.getSettings).toHaveBeenCalledWith('business-id-123');
      expect(mockBrandServices.completeness.calculateSimpleSetupCompleteness).toHaveBeenCalledWith(
        mockSettings
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.score).toBe(80);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      // Create a proper Error object that will be thrown when the promise rejects
      const serviceError = new Error('Completeness service unavailable');
      (serviceError as any).statusCode = 500;
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockRejectedValue(serviceError);

      await brandCompletenessController.calculateBusinessProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      // The handleAsync mock catches errors and returns 500 status
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Completeness service unavailable');
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue({});
      (mockBrandServices.completeness.calculateBusinessProfileCompleteness as jest.Mock).mockReturnValue(
        { score: 75 }
      );

      await brandCompletenessController.calculateBusinessProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((brandCompletenessController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'CALCULATE_BUSINESS_PROFILE_COMPLETENESS'
      );
    });
  });
});
