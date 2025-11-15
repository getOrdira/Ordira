/**
 * Products Analytics Controller Unit Tests
 * 
 * Tests product analytics operations: get analytics, trends, performance metrics.
 */

import { Response, NextFunction } from 'express';
import { ProductsAnalyticsController } from '../../../../controllers/features/products/productsAnalytics.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  analytics: {
    getAnalytics: jest.fn(),
    getCategoryAnalytics: jest.fn(),
    getEngagementMetrics: jest.fn(),
  },
};

// Mock the base controller
jest.mock('../../../../controllers/features/products/productsBase.controller', () => {
  const actual = jest.requireActual('../../../../controllers/features/products/productsBase.controller');
  return {
    ...actual,
    ProductsBaseController: jest.fn().mockImplementation(() => ({
      ...actual.ProductsBaseController.prototype,
      productServices: mockProductServices,
      ensureAuthenticated: jest.fn(),
      resolveOwner: jest.fn().mockReturnValue({
        businessId: 'business-id-123',
        manufacturerId: undefined,
      }),
      ensureOwner: jest.fn(),
      recordPerformance: jest.fn(),
      logAction: jest.fn(),
      handleAsync: jest.fn(async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }),
      getRequestMeta: jest.fn().mockReturnValue({}),
    })),
  };
});

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ProductsAnalyticsController', () => {
  let productsAnalyticsController: ProductsAnalyticsController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsAnalyticsController = new ProductsAnalyticsController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (productsAnalyticsController as any).ensureAuthenticated = jest.fn();
    (productsAnalyticsController as any).resolveOwner = jest.fn().mockReturnValue({
      businessId: 'business-id-123',
      manufacturerId: undefined,
    });
    (productsAnalyticsController as any).ensureOwner = jest.fn();
    (productsAnalyticsController as any).recordPerformance = jest.fn();
    (productsAnalyticsController as any).logAction = jest.fn();
    (productsAnalyticsController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsAnalyticsController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
  });

  describe('getAnalyticsSummary', () => {
    const mockAnalytics = {
      totalProducts: 100,
      activeProducts: 80,
      totalViews: 5000,
      totalSales: 250,
    };

    beforeEach(() => {
      mockProductServices.analytics.getAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should retrieve product analytics summary', async () => {
      mockRequest.validatedQuery = {};

      await productsAnalyticsController.getAnalyticsSummary(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.analytics.getAnalytics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.analytics).toEqual(mockAnalytics);
    });

    it('should apply time range filters', async () => {
      mockRequest.validatedQuery = {
        start: '2024-01-01',
        end: '2024-12-31',
      };

      await productsAnalyticsController.getAnalyticsSummary(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.analytics.getAnalytics).toHaveBeenCalled();
    });
  });

  describe('getCategoryAnalytics', () => {
    const mockCategories = [
      { category: 'Electronics', count: 50 },
      { category: 'Clothing', count: 30 },
    ];

    beforeEach(() => {
      mockProductServices.analytics.getCategoryAnalytics.mockResolvedValue(mockCategories);
    });

    it('should retrieve category analytics', async () => {
      mockRequest.validatedQuery = {};

      await productsAnalyticsController.getCategoryAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.analytics.getCategoryAnalytics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getEngagementMetrics', () => {
    const mockMetrics = {
      totalViews: 5000,
      totalVotes: 250,
      engagementRate: 0.05,
    };

    beforeEach(() => {
      mockProductServices.analytics.getEngagementMetrics.mockResolvedValue(mockMetrics);
    });

    it('should retrieve engagement metrics', async () => {
      mockRequest.validatedQuery = {};

      await productsAnalyticsController.getEngagementMetrics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.analytics.getEngagementMetrics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Analytics service unavailable',
      };
      mockProductServices.analytics.getAnalytics.mockRejectedValue(serviceError);

      await productsAnalyticsController.getAnalyticsSummary(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedQuery = {};
      mockProductServices.analytics.getAnalytics.mockResolvedValue({});

      await productsAnalyticsController.getAnalyticsSummary(mockRequest, mockResponse, mockNext);

      expect((productsAnalyticsController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_PRODUCT_ANALYTICS_SUMMARY'
      );
    });
  });
});

