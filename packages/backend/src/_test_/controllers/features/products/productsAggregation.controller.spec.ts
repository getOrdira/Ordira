/**
 * Products Aggregation Controller Unit Tests
 * 
 * Tests product aggregation operations: group by category, aggregate statistics, summarize data.
 */

import { Response, NextFunction } from 'express';
import { ProductsAggregationController } from '../../../../controllers/features/products/productsAggregation.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  aggregation: {
    groupByCategory: jest.fn(),
    aggregateStatistics: jest.fn(),
    summarizeProducts: jest.fn(),
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

describe('ProductsAggregationController', () => {
  let productsAggregationController: ProductsAggregationController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsAggregationController = new ProductsAggregationController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (productsAggregationController as any).ensureAuthenticated = jest.fn();
    (productsAggregationController as any).resolveOwner = jest.fn().mockReturnValue({
      businessId: 'business-id-123',
      manufacturerId: undefined,
    });
    (productsAggregationController as any).ensureOwner = jest.fn();
    (productsAggregationController as any).recordPerformance = jest.fn();
    (productsAggregationController as any).logAction = jest.fn();
    (productsAggregationController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsAggregationController as any).handleAsync = jest.fn(
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

  describe('groupByCategory', () => {
    const mockGrouped = {
      Electronics: [{ _id: 'product-id-1' }],
      Clothing: [{ _id: 'product-id-2' }],
    };

    beforeEach(() => {
      mockProductServices.aggregation.groupByCategory.mockResolvedValue(mockGrouped);
    });

    it('should group products by category', async () => {
      mockRequest.validatedQuery = {};

      await productsAggregationController.groupByCategory(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.aggregation.groupByCategory).toHaveBeenCalledWith(
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.grouped).toEqual(mockGrouped);
    });
  });

  describe('aggregateStatistics', () => {
    const mockStats = {
      totalProducts: 100,
      averagePrice: 99.99,
      totalRevenue: 9999,
    };

    beforeEach(() => {
      mockProductServices.aggregation.aggregateStatistics.mockResolvedValue(mockStats);
    });

    it('should aggregate product statistics', async () => {
      mockRequest.validatedQuery = {};

      await productsAggregationController.aggregateStatistics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.aggregation.aggregateStatistics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('summarizeProducts', () => {
    const mockSummary = {
      total: 100,
      byStatus: { active: 80, draft: 20 },
      byCategory: { Electronics: 50, Clothing: 50 },
    };

    beforeEach(() => {
      mockProductServices.aggregation.summarizeProducts.mockResolvedValue(mockSummary);
    });

    it('should summarize products', async () => {
      mockRequest.validatedQuery = {};

      await productsAggregationController.summarizeProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.aggregation.summarizeProducts).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Aggregation service unavailable',
      };
      mockProductServices.aggregation.groupByCategory.mockRejectedValue(serviceError);

      await productsAggregationController.groupByCategory(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedQuery = {};
      mockProductServices.aggregation.groupByCategory.mockResolvedValue({});

      await productsAggregationController.groupByCategory(mockRequest, mockResponse, mockNext);

      expect((productsAggregationController as any).recordPerformance).toHaveBeenCalled();
    });
  });
});

