/**
 * Brand Discovery Controller Unit Tests
 * 
 * Tests brand discovery operations: personalized recommendations, connection opportunities, compatibility, search suggestions, ecosystem analytics.
 */

import { Response, NextFunction } from 'express';
import { BrandDiscoveryController } from '../../../../controllers/features/brands/brandDiscovery.controller';
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
    discovery: {
      getPersonalizedRecommendations: jest.fn().mockResolvedValue([]),
      getConnectionOpportunities: jest.fn().mockResolvedValue([]),
      calculateCompatibilityScore: jest.fn().mockResolvedValue({ score: 0 }),
      getSearchSuggestions: jest.fn().mockResolvedValue([]),
      getEcosystemAnalytics: jest.fn().mockResolvedValue({}),
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

describe('BrandDiscoveryController', () => {
  let brandDiscoveryController: BrandDiscoveryController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandDiscoveryController = new BrandDiscoveryController();
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

    (brandDiscoveryController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandDiscoveryController as any).recordPerformance = jest.fn();
    (brandDiscoveryController as any).logAction = jest.fn();
    (brandDiscoveryController as any).handleAsync = jest.fn(
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
    (brandDiscoveryController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getPersonalizedRecommendations', () => {
    const mockRecommendations = [
      { id: 'brand-id-1', relevanceScore: 0.9 },
      { id: 'brand-id-2', relevanceScore: 0.85 },
    ];

    beforeEach(() => {
      (mockBrandServices.discovery.getPersonalizedRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );
    });

    it('should retrieve personalized recommendations successfully', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        categories: ['Electronics'],
        excludeIds: ['brand-id-excluded'],
      };

      await brandDiscoveryController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.discovery.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          limit: 10,
          categories: ['Electronics'],
          excludeIds: ['brand-id-excluded'],
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.recommendations).toEqual(mockRecommendations);
    });

    it('should apply default limit when not provided', async () => {
      mockRequest.validatedQuery = {};

      await brandDiscoveryController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.discovery.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });

  describe('getConnectionOpportunities', () => {
    const mockOpportunities = [
      { id: 'brand-id-1', compatibilityScore: 0.85 },
      { id: 'brand-id-2', compatibilityScore: 0.80 },
    ];

    beforeEach(() => {
      (mockBrandServices.discovery.getConnectionOpportunities as jest.Mock).mockResolvedValue(
        mockOpportunities
      );
    });

    it('should retrieve connection opportunities', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        industry: 'Electronics',
        location: 'United States',
        minCompatibility: 0.7,
      };

      await brandDiscoveryController.getConnectionOpportunities(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.discovery.getConnectionOpportunities).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          limit: 10,
          industry: 'Electronics',
          location: 'United States',
          minCompatibility: 0.7,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use default minCompatibility when not provided', async () => {
      mockRequest.validatedQuery = {};

      await brandDiscoveryController.getConnectionOpportunities(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.discovery.getConnectionOpportunities).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          minCompatibility: 0.7,
        })
      );
    });
  });

  describe('calculateCompatibilityScore', () => {
    const mockResult = {
      score: 0.85,
      factors: ['industry', 'location', 'size'],
    };

    beforeEach(() => {
      (mockBrandServices.discovery.calculateCompatibilityScore as jest.Mock).mockResolvedValue(
        mockResult
      );
    });

    it('should calculate compatibility score between two brands', async () => {
      mockRequest.validatedBody = {
        brandId1: 'brand-id-1',
        brandId2: 'brand-id-2',
      };

      await brandDiscoveryController.calculateCompatibilityScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.discovery.calculateCompatibilityScore).toHaveBeenCalledWith(
        'brand-id-1',
        'brand-id-2'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
    });
  });

  describe('getSearchSuggestions', () => {
    const mockSuggestions = ['Brand A', 'Brand B', 'Brand C'];

    beforeEach(() => {
      (mockBrandServices.discovery.getSearchSuggestions as jest.Mock).mockResolvedValue(
        mockSuggestions
      );
    });

    it('should retrieve search suggestions', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
        limit: 10,
      };

      await brandDiscoveryController.getSearchSuggestions(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.discovery.getSearchSuggestions).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          limit: 10,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.suggestions).toEqual(mockSuggestions);
    });

    it('should use default limit when not provided', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
      };

      await brandDiscoveryController.getSearchSuggestions(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.discovery.getSearchSuggestions).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });

  describe('getEcosystemAnalytics', () => {
    const mockAnalytics = {
      totalBrands: 1000,
      industryDistribution: { Electronics: 300, Clothing: 200 },
      growthTrends: [{ month: '2024-01', count: 50 }],
    };

    beforeEach(() => {
      (mockBrandServices.discovery.getEcosystemAnalytics as jest.Mock).mockResolvedValue(
        mockAnalytics
      );
    });

    it('should retrieve ecosystem analytics', async () => {
      mockRequest.validatedQuery = {
        timeframe: '30d',
        industry: 'Electronics',
        region: 'United States',
      };

      await brandDiscoveryController.getEcosystemAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.discovery.getEcosystemAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '30d',
          industry: 'Electronics',
          region: 'United States',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.analytics).toEqual(mockAnalytics);
    });

    it('should use default timeframe when not provided', async () => {
      mockRequest.validatedQuery = {};

      await brandDiscoveryController.getEcosystemAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.discovery.getEcosystemAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '30d',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      // Create a proper Error object that will be thrown when the promise rejects
      const serviceError = new Error('Discovery service unavailable');
      (serviceError as any).statusCode = 500;
      (mockBrandServices.discovery.getPersonalizedRecommendations as jest.Mock).mockRejectedValue(
        serviceError
      );

      mockRequest.validatedQuery = {};

      await brandDiscoveryController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      // The handleAsync mock catches errors and returns 500 status
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.message).toBe('Discovery service unavailable');
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.discovery.getPersonalizedRecommendations as jest.Mock).mockResolvedValue(
        []
      );

      await brandDiscoveryController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((brandDiscoveryController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_PERSONALIZED_RECOMMENDATIONS'
      );
    });
  });
});
