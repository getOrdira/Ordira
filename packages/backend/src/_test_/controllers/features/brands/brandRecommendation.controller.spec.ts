/**
 * Brand Recommendation Controller Unit Tests
 * 
 * Tests brand recommendation operations: generate personalized recommendations, get personalized recommendations, generate improvement recommendations.
 */

import { Response, NextFunction } from 'express';
import { BrandRecommendationController } from '../../../../controllers/features/brands/brandRecommendation.controller';
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
    recommendations: {
      generatePersonalizedRecommendations: jest.fn().mockResolvedValue({
        recommendations: [],
      }),
      getPersonalizedRecommendations: jest.fn().mockResolvedValue([]),
      generateImprovementRecommendations: jest.fn().mockReturnValue([]),
    },
    profile: {
      getBrandProfile: jest.fn().mockResolvedValue({}),
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

describe('BrandRecommendationController', () => {
  let brandRecommendationController: BrandRecommendationController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandRecommendationController = new BrandRecommendationController();
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

    (brandRecommendationController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandRecommendationController as any).recordPerformance = jest.fn();
    (brandRecommendationController as any).logAction = jest.fn();
    (brandRecommendationController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandRecommendationController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('generatePersonalizedRecommendations', () => {
    const mockRecommendations = {
      recommendations: [
        { id: 'rec-1', type: 'profile', priority: 'high' },
        { id: 'rec-2', type: 'settings', priority: 'medium' },
      ],
    };

    beforeEach(() => {
      (mockBrandServices.recommendations.generatePersonalizedRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );
    });

    it('should generate personalized recommendations successfully', async () => {
      mockRequest.query = {
        plan: 'premium',
      };
      mockRequest.validatedQuery = {
        limit: 10,
        categories: ['profile', 'settings'],
        context: 'onboarding',
      };

      await brandRecommendationController.generatePersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.recommendations.generatePersonalizedRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'business-id-123',
          plan: 'premium',
          limit: 10,
        }),
        expect.objectContaining({
          limit: 10,
          types: ['profile', 'settings'],
          minPriority: 'onboarding',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.recommendations).toEqual(mockRecommendations);
    });

    it('should use foundation plan as default', async () => {
      mockRequest.query = {};
      mockRequest.validatedQuery = {};

      await brandRecommendationController.generatePersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.recommendations.generatePersonalizedRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'foundation',
        }),
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });

  describe('getPersonalizedRecommendations', () => {
    const mockRecommendations = [
      { id: 'rec-1', type: 'connections' },
      { id: 'rec-2', type: 'products' },
    ];

    beforeEach(() => {
      (mockBrandServices.recommendations.getPersonalizedRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );
    });

    it('should retrieve personalized recommendations successfully', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        categories: ['connections'],
        context: 'connections',
      };

      await brandRecommendationController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.recommendations.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          limit: 10,
          type: 'connections',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.recommendations).toEqual(mockRecommendations);
    });

    it('should apply default limit when not provided', async () => {
      mockRequest.validatedQuery = {};

      await brandRecommendationController.getPersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.recommendations.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          limit: 10,
        })
      );
    });
  });

  describe('generateImprovementRecommendations', () => {
    const mockProfile = { name: 'Test Brand' };
    const mockRecommendations = [
      { type: 'profile', message: 'Add logo' },
      { type: 'settings', message: 'Configure domain' },
    ];

    beforeEach(() => {
      (mockBrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue(mockProfile);
      (mockBrandServices.recommendations.generateImprovementRecommendations as jest.Mock).mockReturnValue(
        mockRecommendations
      );
    });

    it('should generate improvement recommendations successfully', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        focusAreas: ['profile', 'settings'],
      };

      await brandRecommendationController.generateImprovementRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.profile.getBrandProfile).toHaveBeenCalledWith('business-id-123');
      expect(mockBrandServices.recommendations.generateImprovementRecommendations).toHaveBeenCalledWith(
        mockProfile
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.recommendations).toEqual(mockRecommendations);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Recommendation service unavailable',
      };
      (mockBrandServices.recommendations.generatePersonalizedRecommendations as jest.Mock).mockRejectedValue(
        serviceError
      );

      mockRequest.query = {};
      mockRequest.validatedQuery = {};

      await brandRecommendationController.generatePersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.recommendations.generatePersonalizedRecommendations as jest.Mock).mockResolvedValue(
        { recommendations: [] }
      );

      mockRequest.query = {};
      mockRequest.validatedQuery = {};

      await brandRecommendationController.generatePersonalizedRecommendations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((brandRecommendationController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GENERATE_PERSONALIZED_RECOMMENDATIONS'
      );
    });
  });
});
