/**
 * Brand Profile Controller Unit Tests
 * 
 * Tests brand profile operations: list, get by ID/domain/subdomain, analytics, connections, recommendations, search.
 */

import { Response, NextFunction } from 'express';
import { BrandProfileController } from '../../../../controllers/features/brands/brandProfile.controller';
import { BrandServices } from '../../../../services/brands';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
}));

// Mock brand services
jest.mock('../../../../services/brands', () => ({
  BrandServices: {
    profile: {
      listBrandProfiles: jest.fn(),
      getBrandProfile: jest.fn(),
      getBrandProfileByCustomDomain: jest.fn(),
      getBrandProfileBySubdomain: jest.fn(),
      trackProfileView: jest.fn(),
      getPublicAnalytics: jest.fn(),
      getRelatedBrands: jest.fn(),
      getPersonalizedRecommendations: jest.fn(),
      searchBrandProfiles: jest.fn(),
      getTrendingBrands: jest.fn(),
      getFeaturedBrands: jest.fn(),
    },
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

describe('BrandProfileController', () => {
  let brandProfileController: BrandProfileController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    brandProfileController = new BrandProfileController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandProfileController as any).recordPerformance = jest.fn();
    (brandProfileController as any).logAction = jest.fn();
    (brandProfileController as any).createPaginationMeta = jest.fn((page, limit, total) => ({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }));
    (brandProfileController as any).sendPaginated = jest.fn();
    (brandProfileController as any).validateManufacturerUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandProfileController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message?: string) => {
        try {
          const result = await fn();
          if (message) {
            res.status(200).json({ success: true, data: result, message });
          } else {
            res.status(200).json({ success: true, data: result });
          }
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandProfileController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('listBrandProfiles', () => {
    const mockBrands = [
      { id: 'brand-id-1', businessName: 'Brand 1' },
      { id: 'brand-id-2', businessName: 'Brand 2' },
    ];

    beforeEach(() => {
      (BrandServices.profile.listBrandProfiles as jest.Mock).mockResolvedValue(mockBrands);
    });

    it('should list brand profiles with default pagination', async () => {
      mockRequest.validatedQuery = {};

      await brandProfileController.listBrandProfiles(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.listBrandProfiles).toHaveBeenCalled();
      expect((brandProfileController as any).sendPaginated).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockRequest.validatedQuery = {
        search: 'Brand 1',
        page: 1,
        limit: 10,
      };

      await brandProfileController.listBrandProfiles(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.listBrandProfiles).toHaveBeenCalled();
    });
  });

  describe('getBrandById', () => {
    const mockProfile = {
      id: 'brand-id-123',
      businessName: 'Test Brand',
      industry: 'Electronics',
    };

    beforeEach(() => {
      (BrandServices.profile.getBrandProfile as jest.Mock).mockResolvedValue(mockProfile);
    });

    it('should retrieve brand profile by ID', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };
      mockRequest.validatedQuery = {};

      await brandProfileController.getBrandById(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getBrandProfile).toHaveBeenCalledWith('brand-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandByDomain', () => {
    const mockBrand = {
      id: 'brand-id-123',
      customDomain: 'example.com',
    };

    beforeEach(() => {
      (BrandServices.profile.getBrandProfileByCustomDomain as jest.Mock).mockResolvedValue(
        mockBrand
      );
    });

    it('should retrieve brand by domain', async () => {
      mockRequest.validatedParams = {
        domain: 'example.com',
      };

      await brandProfileController.getBrandByDomain(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getBrandProfileByCustomDomain).toHaveBeenCalledWith(
        'example.com'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandBySubdomain', () => {
    const mockBrand = {
      id: 'brand-id-123',
      subdomain: 'test-brand',
    };

    beforeEach(() => {
      (BrandServices.profile.getBrandProfileBySubdomain as jest.Mock).mockResolvedValue(mockBrand);
    });

    it('should retrieve brand by subdomain', async () => {
      mockRequest.validatedParams = {
        subdomain: 'test-brand',
      };

      await brandProfileController.getBrandBySubdomain(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getBrandProfileBySubdomain).toHaveBeenCalledWith('test-brand');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('trackBrandView', () => {
    beforeEach(() => {
      (BrandServices.profile.trackProfileView as jest.Mock).mockResolvedValue({
        tracked: true,
      });
      mockRequest.manufacturerId = 'manufacturer-id-123';
    });

    it('should track manufacturer view', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };
      mockRequest.headers = {
        'user-agent': 'test-agent',
      };
      mockRequest.ip = '127.0.0.1';

      await brandProfileController.trackBrandView(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.trackProfileView).toHaveBeenCalledWith(
        'brand-id-123',
        expect.objectContaining({
          userAgent: 'test-agent',
          timestamp: expect.any(Date),
          ipAddress: '127.0.0.1',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandAnalytics', () => {
    const mockAnalytics = {
      views: 1000,
      connections: 50,
      products: 25,
    };

    beforeEach(() => {
      (BrandServices.profile.getPublicAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
    });

    it('should retrieve brand analytics', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };
      mockRequest.validatedQuery = {
        timeframe: '30d',
        metrics: ['views', 'connections'],
      };

      await brandProfileController.getBrandAnalytics(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getPublicAnalytics).toHaveBeenCalledWith('brand-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBrandConnections', () => {
    const mockRelatedBrands = [
      { id: 'brand-id-1', name: 'Related Brand 1' },
      { id: 'brand-id-2', name: 'Related Brand 2' },
    ];

    beforeEach(() => {
      (BrandServices.profile.getRelatedBrands as jest.Mock).mockResolvedValue(mockRelatedBrands);
    });

    it('should retrieve brand connections (as related brands)', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };
      mockRequest.validatedQuery = {
        type: 'accepted',
        page: 1,
        limit: 20,
      };

      await brandProfileController.getBrandConnections(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getRelatedBrands).toHaveBeenCalledWith(
        'brand-id-123',
        expect.objectContaining({
          limit: 20,
        })
      );
      expect((brandProfileController as any).sendPaginated).toHaveBeenCalled();
    });
  });

  describe('getBrandRecommendations', () => {
    const mockRecommendations = [
      { id: 'rec-1', type: 'connections' },
      { id: 'rec-2', type: 'products' },
    ];

    beforeEach(() => {
      (BrandServices.profile.getPersonalizedRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );
    });

    it('should retrieve brand recommendations', async () => {
      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };
      mockRequest.validatedQuery = {
        type: 'connections',
        limit: 10,
      };

      await brandProfileController.getBrandRecommendations(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'brand-id-123',
        expect.objectContaining({
          type: 'connections',
          limit: 10,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('searchBrands', () => {
    const mockSearchResults = [
      { id: 'brand-id-1', businessName: 'Brand 1' },
      { id: 'brand-id-2', businessName: 'Brand 2' },
    ];

    beforeEach(() => {
      (BrandServices.profile.searchBrandProfiles as jest.Mock).mockResolvedValue(mockSearchResults);
    });

    it('should search brands successfully', async () => {
      mockRequest.query = {
        q: 'test',
        page: '1',
        limit: '10',
      };

      await brandProfileController.searchBrands(mockRequest, mockResponse, mockNext);

      expect(BrandServices.profile.searchBrandProfiles).toHaveBeenCalledWith('test');
      expect((brandProfileController as any).sendPaginated).toHaveBeenCalled();
    });

    it('should return error when query is missing', async () => {
      mockRequest.query = {};

      await brandProfileController.searchBrands(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 404,
        message: 'Brand not found',
      };
      (BrandServices.profile.getBrandProfile as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedParams = {
        brandId: 'brand-id-123',
      };

      await brandProfileController.getBrandById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (BrandServices.profile.listBrandProfiles as jest.Mock).mockResolvedValue([]);

      await brandProfileController.listBrandProfiles(mockRequest, mockResponse, mockNext);

      expect((brandProfileController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'LIST_BRAND_PROFILES'
      );
    });
  });
});
