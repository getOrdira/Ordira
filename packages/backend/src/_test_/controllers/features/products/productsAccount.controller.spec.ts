/**
 * Products Account Controller Unit Tests
 * 
 * Tests product account operations: analytics, categories, stats, recent products, bulk operations.
 */

import { Response, NextFunction } from 'express';
import { ProductsAccountController } from '../../../../controllers/features/products/productsAccount.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  account: {
    getProductAnalytics: jest.fn(),
    getProductCategories: jest.fn(),
    getProductStats: jest.fn(),
    getRecentProducts: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    isProductOwner: jest.fn(),
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

describe('ProductsAccountController', () => {
  let productsAccountController: ProductsAccountController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsAccountController = new ProductsAccountController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (productsAccountController as any).ensureAuthenticated = jest.fn();
    (productsAccountController as any).resolveOwner = jest.fn().mockReturnValue({
      businessId: 'business-id-123',
      manufacturerId: undefined,
    });
    (productsAccountController as any).ensureOwner = jest.fn();
    (productsAccountController as any).recordPerformance = jest.fn();
    (productsAccountController as any).logAction = jest.fn();
    (productsAccountController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsAccountController as any).handleAsync = jest.fn(
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

  describe('getProductAnalytics', () => {
    const mockAnalytics = {
      totalProducts: 50,
      activeProducts: 40,
      archivedProducts: 10,
      totalRevenue: 50000,
    };

    beforeEach(() => {
      mockProductServices.account.getProductAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should retrieve product analytics without date range', async () => {
      mockRequest.validatedQuery = {};

      await productsAccountController.getProductAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getProductAnalytics).toHaveBeenCalledWith({
        businessId: 'business-id-123',
        manufacturerId: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.analytics).toEqual(mockAnalytics);
    });

    it('should retrieve product analytics with date range', async () => {
      mockRequest.validatedQuery = {
        start: '2024-01-01',
        end: '2024-12-31',
      };

      await productsAccountController.getProductAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getProductAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          }),
        })
      );
    });

    it('should require authentication', async () => {
      (productsAccountController as any).ensureAuthenticated.mockImplementation(() => {
        throw { statusCode: 401, message: 'Unauthorized' };
      });
      mockRequest.userId = undefined;

      await productsAccountController.getProductAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getProductCategories', () => {
    const mockCategories = ['Electronics', 'Clothing', 'Food'];

    beforeEach(() => {
      mockProductServices.account.getProductCategories.mockResolvedValue(mockCategories);
    });

    it('should retrieve product categories', async () => {
      mockRequest.validatedQuery = {};

      await productsAccountController.getProductCategories(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getProductCategories).toHaveBeenCalledWith(
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.categories).toEqual(mockCategories);
    });
  });

  describe('getProductStats', () => {
    const mockStats = {
      total: 100,
      active: 80,
      draft: 15,
      archived: 5,
    };

    beforeEach(() => {
      mockProductServices.account.getProductStats.mockResolvedValue(mockStats);
    });

    it('should retrieve product statistics', async () => {
      mockRequest.validatedQuery = {};

      await productsAccountController.getProductStats(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getProductStats).toHaveBeenCalledWith(
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.stats).toEqual(mockStats);
    });
  });

  describe('getRecentProducts', () => {
    const mockRecentProducts = [
      { _id: 'product-id-1', name: 'Recent Product 1' },
      { _id: 'product-id-2', name: 'Recent Product 2' },
    ];

    beforeEach(() => {
      mockProductServices.account.getRecentProducts.mockResolvedValue(mockRecentProducts);
    });

    it('should retrieve recent products with default limit', async () => {
      mockRequest.validatedQuery = {};

      await productsAccountController.getRecentProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getRecentProducts).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply custom limit and status filters', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
        status: 'active',
      };

      await productsAccountController.getRecentProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.getRecentProducts).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    beforeEach(() => {
      mockProductServices.account.bulkUpdateStatus.mockResolvedValue({
        updated: 5,
        failed: 0,
      });
    });

    it('should bulk update product status', async () => {
      mockRequest.validatedBody = {
        productIds: ['product-id-1', 'product-id-2', 'product-id-3'],
        status: 'active',
      };

      await productsAccountController.bulkUpdateStatus(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.bulkUpdateStatus).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when productIds array is empty', async () => {
      mockRequest.validatedBody = {
        productIds: [],
        status: 'active',
      };

      await productsAccountController.bulkUpdateStatus(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when status is invalid', async () => {
      mockRequest.validatedBody = {
        productIds: ['product-id-1'],
        status: 'invalid-status',
      };

      await productsAccountController.bulkUpdateStatus(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('isProductOwner', () => {
    beforeEach(() => {
      mockProductServices.account.isProductOwner.mockResolvedValue(true);
    });

    it('should check product ownership', async () => {
      mockRequest.validatedQuery = {
        productId: 'product-id-123',
      };

      await productsAccountController.isProductOwner(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.account.isProductOwner).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when productId is missing', async () => {
      mockRequest.validatedQuery = {};

      await productsAccountController.isProductOwner(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Analytics service unavailable',
      };
      mockProductServices.account.getProductAnalytics.mockRejectedValue(serviceError);

      await productsAccountController.getProductAnalytics(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedQuery = {};
      mockProductServices.account.getProductAnalytics.mockResolvedValue({});

      await productsAccountController.getProductAnalytics(mockRequest, mockResponse, mockNext);

      expect((productsAccountController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_PRODUCT_ANALYTICS'
      );
    });
  });
});

