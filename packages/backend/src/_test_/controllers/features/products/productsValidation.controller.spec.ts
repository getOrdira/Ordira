/**
 * Products Validation Controller Unit Tests
 * 
 * Tests product validation operations: validate product data, validate search queries, validate updates.
 */

import { Response, NextFunction } from 'express';
import { ProductsValidationController } from '../../../../controllers/features/products/productsValidation.controller';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock product services
const mockProductServices = {
  validation: {
    validateCreateProduct: jest.fn(),
    validateUpdateProduct: jest.fn(),
    validateSearchQuery: jest.fn(),
    sanitizeProductData: jest.fn(),
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

describe('ProductsValidationController', () => {
  let productsValidationController: ProductsValidationController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    productsValidationController = new ProductsValidationController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (productsValidationController as any).ensureAuthenticated = jest.fn();
    (productsValidationController as any).recordPerformance = jest.fn();
    (productsValidationController as any).logAction = jest.fn();
    (productsValidationController as any).getRequestMeta = jest.fn().mockReturnValue({});
    (productsValidationController as any).handleAsync = jest.fn(
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

  describe('validateCreateProduct', () => {
    const mockValidation = {
      valid: true,
      errors: [],
    };

    beforeEach(() => {
      mockProductServices.validation.validateCreateProduct.mockResolvedValue(mockValidation);
      mockProductServices.validation.sanitizeProductData.mockImplementation((data: any) => data);
    });

    it('should validate product creation data successfully', async () => {
      mockRequest.validatedBody = {
        name: 'Test Product',
        price: 99.99,
        description: 'Test description',
      };

      await productsValidationController.validateCreateProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.validation.sanitizeProductData).toHaveBeenCalled();
      expect(mockProductServices.validation.validateCreateProduct).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.valid).toBe(true);
    });

    it('should return validation errors when data is invalid', async () => {
      const invalidValidation = {
        valid: false,
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'price', message: 'Price must be positive' },
        ],
      };
      mockProductServices.validation.validateCreateProduct.mockResolvedValue(invalidValidation);
      mockRequest.validatedBody = {
        name: '',
        price: -10,
      };

      await productsValidationController.validateCreateProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.valid).toBe(false);
      expect(responseData.data.errors).toHaveLength(2);
    });
  });

  describe('validateSearchQuery', () => {
    const mockValidation = {
      valid: true,
      error: null,
    };

    beforeEach(() => {
      mockProductServices.validation.validateSearchQuery.mockReturnValue(mockValidation);
    });

    it('should validate search query successfully', async () => {
      mockRequest.validatedBody = {
        query: 'test product',
      };

      await productsValidationController.validateSearchQuery(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.validation.validateSearchQuery).toHaveBeenCalledWith(
        'test product'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return validation errors for invalid queries', async () => {
      const invalidValidation = {
        valid: false,
        error: 'Query contains invalid characters',
      };
      mockProductServices.validation.validateSearchQuery.mockReturnValue(invalidValidation);
      mockRequest.validatedBody = {
        query: '<script>alert("xss")</script>',
      };

      await productsValidationController.validateSearchQuery(
        mockRequest,
        mockResponse,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.validation.valid).toBe(false);
    });
  });

  describe('validateUpdateProduct', () => {
    const mockValidation = {
      valid: true,
      errors: [],
    };

    beforeEach(() => {
      mockProductServices.validation.validateUpdateProduct.mockReturnValue(mockValidation);
      mockProductServices.validation.sanitizeProductData.mockImplementation((data: any) => data);
    });

    it('should validate update data successfully', async () => {
      mockRequest.validatedBody = {
        name: 'Updated Product',
        price: 149.99,
      };

      await productsValidationController.validateUpdateProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.validation.sanitizeProductData).toHaveBeenCalled();
      expect(mockProductServices.validation.validateUpdateProduct).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('sanitizeProductPayload', () => {
    const mockSanitized = {
      name: 'Test Product',
      description: 'Test description',
    };

    beforeEach(() => {
      mockProductServices.validation.sanitizeProductData.mockReturnValue(mockSanitized);
    });

    it('should sanitize product data', async () => {
      mockRequest.validatedBody = {
        name: '<script>alert("xss")</script>Test Product',
        description: 'Test description',
      };

      await productsValidationController.sanitizeProductPayload(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockProductServices.validation.sanitizeProductData).toHaveBeenCalledWith(
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.sanitized).toEqual(mockSanitized);
      // Verify XSS attempt is removed
      expect(JSON.stringify(responseData.data.sanitized)).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        name: 'Test Product',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Validation service unavailable',
      };
      mockProductServices.validation.validateCreateProduct.mockRejectedValue(serviceError);
      mockProductServices.validation.sanitizeProductData.mockImplementation((data: any) => data);

      await productsValidationController.validateCreateProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      mockRequest.validatedBody = {
        name: 'Test Product',
      };
      mockProductServices.validation.validateCreateProduct.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockProductServices.validation.sanitizeProductData.mockImplementation((data: any) => data);

      await productsValidationController.validateCreateProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((productsValidationController as any).recordPerformance).toHaveBeenCalled();
    });
  });
});

