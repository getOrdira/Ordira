/**
 * Products Search Controller Unit Tests
 * 
 * Tests product search operations: full text search, category search, tag search, price search, similar products, autocomplete.
 */

import { Response, NextFunction } from 'express';
import { ProductsSearchController } from '../../../../controllers/features/products/productsSearch.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  search: {
    searchProducts: jest.fn(),
    searchByCategory: jest.fn(),
    searchByTags: jest.fn(),
    searchByPriceRange: jest.fn(),
    getSimilarProducts: jest.fn(),
    autocomplete: jest.fn(),
  },
  validation: {
    validateSearchQuery: jest.fn(),
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
      parseNumber: jest.fn((val: any, def: number) => val ?? def),
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

describe('ProductsSearchController', () => {
  let productsSearchController: ProductsSearchController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsSearchController = new ProductsSearchController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (productsSearchController as any).ensureAuthenticated = jest.fn();
    (productsSearchController as any).parseNumber = jest.fn((val: any, def: number) => val ?? def);
    (productsSearchController as any).recordPerformance = jest.fn();
    (productsSearchController as any).logAction = jest.fn();
    (productsSearchController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsSearchController as any).handleAsync = jest.fn(
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

  describe('searchProducts', () => {
    const mockSearchResults = {
      products: [
        { _id: 'product-id-1', name: 'Test Product 1' },
        { _id: 'product-id-2', name: 'Test Product 2' },
      ],
      total: 2,
    };

    beforeEach(() => {
      mockProductServices.validation.validateSearchQuery.mockReturnValue({
        valid: true,
        error: null,
      });
      mockProductServices.search.searchProducts.mockResolvedValue(mockSearchResults);
    });

    it('should search products successfully', async () => {
      mockRequest.validatedQuery = {
        query: 'test product',
        limit: 20,
      };

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test product',
          limit: 20,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when query is missing', async () => {
      mockRequest.validatedQuery = {
        limit: 20,
      };

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProductServices.search.searchProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when query validation fails', async () => {
      mockRequest.validatedQuery = {
        query: '<script>alert("xss")</script>',
      };
      mockProductServices.validation.validateSearchQuery.mockReturnValue({
        valid: false,
        error: 'Invalid search query',
      });

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should apply businessId and manufacturerId filters', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
        businessId: 'business-id-123',
        manufacturerId: 'manufacturer-id-456',
      };

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'business-id-123',
          manufacturerId: 'manufacturer-id-456',
        })
      );
    });
  });

  describe('searchByCategory', () => {
    const mockCategoryResults = {
      products: [{ _id: 'product-id-1', category: 'Electronics' }],
      total: 1,
    };

    beforeEach(() => {
      mockProductServices.search.searchByCategory.mockResolvedValue(mockCategoryResults);
    });

    it('should search products by category', async () => {
      mockRequest.validatedQuery = {
        category: 'Electronics',
        limit: 20,
      };

      await productsSearchController.searchByCategory(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchByCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Electronics',
          limit: 20,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when category is missing', async () => {
      mockRequest.validatedQuery = {};

      await productsSearchController.searchByCategory(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchByTags', () => {
    const mockTagResults = {
      products: [{ _id: 'product-id-1', tags: ['tag1', 'tag2'] }],
      total: 1,
    };

    beforeEach(() => {
      mockProductServices.search.searchByTags.mockResolvedValue(mockTagResults);
    });

    it('should search products by tags array', async () => {
      mockRequest.validatedQuery = {
        tags: ['tag1', 'tag2'],
        limit: 20,
      };

      await productsSearchController.searchByTags(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchByTags).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['tag1', 'tag2'],
          limit: 20,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle tags as comma-separated string', async () => {
      mockRequest.validatedQuery = {
        tags: 'tag1,tag2',
        limit: 20,
      };

      await productsSearchController.searchByTags(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchByTags).toHaveBeenCalled();
    });

    it('should return 400 when tags are missing', async () => {
      mockRequest.validatedQuery = {};

      await productsSearchController.searchByTags(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchByPriceRange', () => {
    const mockPriceResults = {
      products: [{ _id: 'product-id-1', price: 99.99 }],
      total: 1,
    };

    beforeEach(() => {
      mockProductServices.search.searchByPriceRange.mockResolvedValue(mockPriceResults);
    });

    it('should search products by price range', async () => {
      mockRequest.validatedQuery = {
        minPrice: 10,
        maxPrice: 100,
        limit: 20,
      };

      await productsSearchController.searchByPriceRange(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.searchByPriceRange).toHaveBeenCalledWith(
        expect.objectContaining({
          minPrice: 10,
          maxPrice: 100,
          limit: 20,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when price range is invalid', async () => {
      mockRequest.validatedQuery = {
        minPrice: 100,
        maxPrice: 10, // Invalid: min > max
      };

      await productsSearchController.searchByPriceRange(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSimilarProducts', () => {
    const mockSimilarProducts = [
      { _id: 'product-id-2', name: 'Similar Product 2' },
      { _id: 'product-id-3', name: 'Similar Product 3' },
    ];

    beforeEach(() => {
      mockProductServices.search.getSimilarProducts.mockResolvedValue(mockSimilarProducts);
    });

    it('should find similar products', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-1',
      };
      mockRequest.validatedQuery = {
        limit: 5,
      };

      await productsSearchController.getSimilarProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.getSimilarProducts).toHaveBeenCalledWith(
        'product-id-1',
        expect.objectContaining({
          limit: 5,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use default limit when not provided', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-1',
      };
      mockRequest.validatedQuery = {};

      await productsSearchController.getSimilarProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.getSimilarProducts).toHaveBeenCalled();
    });
  });

  describe('autocomplete', () => {
    const mockAutocompleteResults = {
      suggestions: ['Test Product', 'Test Item', 'Testing'],
    };

    beforeEach(() => {
      mockProductServices.search.autocomplete.mockResolvedValue(mockAutocompleteResults);
    });

    it('should provide autocomplete suggestions', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
        limit: 10,
      };

      await productsSearchController.autocomplete(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.search.autocomplete).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test',
          limit: 10,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when query is missing', async () => {
      mockRequest.validatedQuery = {};

      await productsSearchController.autocomplete(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Search service unavailable',
      };
      mockProductServices.search.searchProducts.mockRejectedValue(serviceError);

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedQuery = {
        query: 'test',
      };
      mockProductServices.search.searchProducts.mockResolvedValue({
        products: [],
        total: 0,
      });

      await productsSearchController.searchProducts(mockRequest, mockResponse, mockNext);

      expect((productsSearchController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'SEARCH_PRODUCTS'
      );
    });
  });
});

