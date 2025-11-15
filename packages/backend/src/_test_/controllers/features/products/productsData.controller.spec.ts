/**
 * Products Data Controller Unit Tests
 * 
 * Tests product CRUD operations: create, get, list, update, delete, batch operations.
 */

import { Response, NextFunction } from 'express';
import { ProductsDataController } from '../../../../controllers/features/products/productsData.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  data: {
    createProduct: jest.fn(),
    getProduct: jest.fn(),
    getProducts: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    batchGetProducts: jest.fn(),
    productExists: jest.fn(),
  },
  validation: {
    sanitizeProductData: jest.fn(),
    validateCreateProduct: jest.fn(),
    validateUpdateProduct: jest.fn(),
  },
};

// Mock the base controller's productServices
jest.mock('../../../../controllers/features/products/productsBase.controller', () => {
  const actual = jest.requireActual('../../../../controllers/features/products/productsBase.controller');
  return {
    ...actual,
    ProductsBaseController: jest.fn().mockImplementation(() => ({
      ...actual.ProductsBaseController.prototype,
      productServices: mockProductServices,
      ensureAuthenticated: jest.fn(),
      resolveOwner: jest.fn(),
      ensureOwner: jest.fn(),
      resolveProductId: jest.fn(),
      parsePagination: jest.fn(),
      buildFilters: jest.fn(),
      createPaginationMeta: jest.fn(),
      recordPerformance: jest.fn(),
      logAction: jest.fn(),
      handleAsync: jest.fn((fn, res, message, meta) => fn()),
      getRequestMeta: jest.fn(),
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

describe('ProductsDataController', () => {
  let productsDataController: ProductsDataController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsDataController = new ProductsDataController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    // Set up default authenticated user
    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    // Setup base controller methods
    (productsDataController as any).ensureAuthenticated = jest.fn();
    (productsDataController as any).resolveOwner = jest.fn().mockReturnValue({
      businessId: 'business-id-123',
      manufacturerId: undefined,
    });
    (productsDataController as any).ensureOwner = jest.fn();
    (productsDataController as any).resolveProductId = jest.fn().mockReturnValue('product-id-123');
    (productsDataController as any).parsePagination = jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
    });
    (productsDataController as any).buildFilters = jest.fn().mockReturnValue({});
    (productsDataController as any).createPaginationMeta = jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
      total: 0,
    });
    (productsDataController as any).recordPerformance = jest.fn();
    (productsDataController as any).logAction = jest.fn();
    (productsDataController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsDataController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string, meta: any) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
  });

  describe('createProduct', () => {
    const mockProduct = {
      _id: 'product-id-123',
      name: 'Test Product',
      description: 'Test description',
      price: 99.99,
    };

    beforeEach(() => {
      mockProductServices.validation.sanitizeProductData.mockReturnValue({
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
      });
      mockProductServices.validation.validateCreateProduct.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockProductServices.data.createProduct.mockResolvedValue(mockProduct);
    });

    it('should create product successfully', async () => {
      mockRequest.validatedBody = {
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
      };

      await productsDataController.createProduct(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.createProduct).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('product');
    });

    it('should return 400 when validation fails', async () => {
      mockRequest.validatedBody = {
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
      };
      mockProductServices.validation.validateCreateProduct.mockResolvedValue({
        valid: false,
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'price', message: 'Price must be positive' },
        ],
      });

      await productsDataController.createProduct(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockProductServices.data.createProduct).not.toHaveBeenCalled();
    });

    it('should require business or manufacturer authentication', async () => {
      (productsDataController as any).ensureAuthenticated.mockImplementation((req: any) => {
        if (!req.userType || !['business', 'manufacturer'].includes(req.userType)) {
          throw { statusCode: 401, message: 'Unauthorized' };
        }
      });
      mockRequest.userType = 'customer';
      mockRequest.validatedBody = {
        name: 'Test Product',
        price: 99.99,
      };

      await productsDataController.createProduct(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getProductById', () => {
    const mockProduct = {
      _id: 'product-id-123',
      name: 'Test Product',
      price: 99.99,
    };

    beforeEach(() => {
      mockProductServices.data.getProduct.mockResolvedValue(mockProduct);
    });

    it('should retrieve product by ID', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };

      await productsDataController.getProductById(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.getProduct).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.product).toEqual(mockProduct);
    });

    it('should return 404 when product is not found', async () => {
      mockRequest.validatedParams = {
        productId: 'non-existent-id',
      };
      mockProductServices.data.getProduct.mockResolvedValue(null);

      await productsDataController.getProductById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listProducts', () => {
    const mockProducts = [
      { _id: 'product-id-1', name: 'Product 1' },
      { _id: 'product-id-2', name: 'Product 2' },
    ];

    beforeEach(() => {
      mockProductServices.data.getProducts.mockResolvedValue({
        products: mockProducts,
        total: 2,
        hasMore: false,
      });
    });

    it('should list products with default pagination', async () => {
      mockRequest.validatedQuery = {};

      await productsDataController.listProducts(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.getProducts).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.products).toEqual(mockProducts);
      expect(responseData.data.total).toBe(2);
    });

    it('should apply filters when provided', async () => {
      mockRequest.validatedQuery = {
        status: 'active',
        category: 'Electronics',
        query: 'test',
      };

      await productsDataController.listProducts(mockRequest, mockResponse, mockNext);

      expect((productsDataController as any).buildFilters).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    const mockUpdatedProduct = {
      _id: 'product-id-123',
      name: 'Updated Product',
      price: 149.99,
    };

    beforeEach(() => {
      mockProductServices.validation.sanitizeProductData.mockReturnValue({
        name: 'Updated Product',
        price: 149.99,
      });
      mockProductServices.validation.validateUpdateProduct.mockReturnValue({
        valid: true,
        errors: [],
      });
      mockProductServices.data.updateProduct.mockResolvedValue(mockUpdatedProduct);
    });

    it('should update product successfully', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };
      mockRequest.validatedBody = {
        name: 'Updated Product',
        price: 149.99,
      };

      await productsDataController.updateProduct(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.updateProduct).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when validation fails', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };
      mockRequest.validatedBody = {
        price: -10,
      };
      mockProductServices.validation.validateUpdateProduct.mockReturnValue({
        valid: false,
        errors: [{ field: 'price', message: 'Price must be positive' }],
      });

      await productsDataController.updateProduct(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteProduct', () => {
    beforeEach(() => {
      mockProductServices.data.deleteProduct.mockResolvedValue(undefined);
    });

    it('should delete product successfully', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };

      await productsDataController.deleteProduct(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.deleteProduct).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('productExists', () => {
    beforeEach(() => {
      mockProductServices.data.productExists.mockResolvedValue(true);
    });

    it('should check if product exists', async () => {
      mockRequest.validatedQuery = {
        productId: 'product-id-123',
      };

      await productsDataController.productExists(mockRequest, mockResponse, mockNext);

      expect(mockProductServices.data.productExists).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when productId is missing', async () => {
      mockRequest.validatedQuery = {};

      await productsDataController.productExists(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Database connection failed',
      };
      mockProductServices.data.getProduct.mockRejectedValue(serviceError);

      await productsDataController.getProductById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedBody = {
        name: 'Test Product',
        price: 99.99,
      };
      mockProductServices.validation.validateCreateProduct.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockProductServices.data.createProduct.mockResolvedValue({ _id: 'product-id-123' });

      await productsDataController.createProduct(mockRequest, mockResponse, mockNext);

      expect((productsDataController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'CREATE_PRODUCT'
      );
    });
  });
});

