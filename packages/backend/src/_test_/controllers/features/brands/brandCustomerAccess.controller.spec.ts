/**
 * Brand Customer Access Controller Unit Tests
 * 
 * Tests customer access operations: check email access, grant voting access, add customers, import from CSV, get customers, update email gating, revoke/restore access, delete customer, bulk update.
 */

import { Response, NextFunction } from 'express';
import { BrandCustomerAccessController } from '../../../../controllers/features/brands/brandCustomerAccess.controller';
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
    customerAccess: {
      isEmailAllowed: jest.fn().mockResolvedValue({
        allowed: true,
      }),
      grantVotingAccess: jest.fn().mockResolvedValue({}),
      addCustomers: jest.fn().mockResolvedValue({}),
      importFromCSV: jest.fn().mockResolvedValue({
        imported: 0,
        errors: [],
      }),
      getCustomers: jest.fn().mockResolvedValue({
        customers: [],
        total: 0,
      }),
      updateEmailGatingSettings: jest.fn().mockResolvedValue({}),
      revokeCustomerAccess: jest.fn().mockResolvedValue({}),
      restoreCustomerAccess: jest.fn().mockResolvedValue({}),
      deleteCustomer: jest.fn().mockResolvedValue({}),
      bulkUpdateAccess: jest.fn().mockResolvedValue({}),
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

describe('BrandCustomerAccessController', () => {
  let brandCustomerAccessController: BrandCustomerAccessController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandCustomerAccessController = new BrandCustomerAccessController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockBrandServices = getBrandsServices();
    jest.clearAllMocks();

    // Set default return values for all mocks to prevent undefined errors
    (mockBrandServices.customerAccess.isEmailAllowed as jest.Mock).mockResolvedValue({
      allowed: true,
    });
    (mockBrandServices.customerAccess.grantVotingAccess as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.addCustomers as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.importFromCSV as jest.Mock).mockResolvedValue({
      imported: 0,
      errors: [],
    });
    (mockBrandServices.customerAccess.getCustomers as jest.Mock).mockResolvedValue({
      customers: [],
      total: 0,
    });
    (mockBrandServices.customerAccess.updateEmailGatingSettings as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.revokeCustomerAccess as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.restoreCustomerAccess as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.deleteCustomer as jest.Mock).mockResolvedValue({});
    (mockBrandServices.customerAccess.bulkUpdateAccess as jest.Mock).mockResolvedValue({});

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandCustomerAccessController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandCustomerAccessController as any).recordPerformance = jest.fn();
    (brandCustomerAccessController as any).logAction = jest.fn();
    (brandCustomerAccessController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandCustomerAccessController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('checkEmailAccess', () => {
    const mockResult = {
      allowed: true,
      reason: 'Email is whitelisted',
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.isEmailAllowed as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should check email access successfully', async () => {
      mockRequest.validatedParams = {
        email: 'test@example.com',
      };

      await brandCustomerAccessController.checkEmailAccess(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.isEmailAllowed).toHaveBeenCalledWith(
        'test@example.com',
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
    });
  });

  describe('grantVotingAccess', () => {
    const mockAccess = {
      accessId: 'access-id-123',
      granted: true,
      email: 'test@example.com',
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.grantVotingAccess as jest.Mock).mockResolvedValue(
        mockAccess
      );
    });

    it('should grant voting access successfully', async () => {
      mockRequest.validatedBody = {
        email: 'test@example.com',
      };

      await brandCustomerAccessController.grantVotingAccess(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.grantVotingAccess).toHaveBeenCalledWith(
        'test@example.com',
        'business-id-123',
        'user-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockAccess);
    });
  });

  describe('addCustomers', () => {
    const mockResult = {
      imported: 2,
      customers: [{ id: 'customer-id-1' }, { id: 'customer-id-2' }],
      errors: [],
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.addCustomers as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should add customers successfully', async () => {
      mockRequest.validatedBody = {
        customers: [
          { email: 'customer1@example.com', name: 'Customer 1' },
          { email: 'customer2@example.com', name: 'Customer 2' },
        ],
      };

      await brandCustomerAccessController.addCustomers(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.addCustomers).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.validatedBody.customers
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('importFromCSV', () => {
    const mockResult = {
      imported: 10,
      errors: [],
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.importFromCSV as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should import customers from CSV successfully', async () => {
      mockRequest.file = {
        buffer: Buffer.from('email,name\ntest@example.com,Test User'),
        originalname: 'customers.csv',
        mimetype: 'text/csv',
        size: 1024,
      };

      await brandCustomerAccessController.importFromCSV(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.importFromCSV).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.file.buffer.toString()
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return error when file is missing', async () => {
      mockRequest.file = undefined;

      await brandCustomerAccessController.importFromCSV(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCustomers', () => {
    const mockCustomers = [
      { id: 'customer-id-1', email: 'customer1@example.com' },
      { id: 'customer-id-2', email: 'customer2@example.com' },
    ];

    beforeEach(() => {
      (mockBrandServices.customerAccess.getCustomers as jest.Mock).mockResolvedValue({
        customers: mockCustomers,
        total: 2,
      });
    });

    it('should retrieve customers with pagination', async () => {
      mockRequest.validatedQuery = {
        page: 1,
        limit: 20,
        search: 'customer',
        status: 'active',
      };

      await brandCustomerAccessController.getCustomers(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.getCustomers).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          page: 1,
          limit: 20,
          search: 'customer',
          status: 'active',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateEmailGatingSettings', () => {
    const mockUpdatedSettings = {
      enabled: true,
      allowedDomains: ['example.com'],
      blockedDomains: ['spam.com'],
      customMessage: 'Welcome message',
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.updateEmailGatingSettings as jest.Mock).mockResolvedValue(
        mockUpdatedSettings
      );
    });

    it('should update email gating settings successfully', async () => {
      mockRequest.validatedBody = {
        enabled: true,
        allowedDomains: ['example.com'],
        blockedDomains: ['spam.com'],
        customMessage: 'Welcome message',
      };

      await brandCustomerAccessController.updateEmailGatingSettings(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.customerAccess.updateEmailGatingSettings).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('revokeCustomerAccess', () => {
    const mockCustomer = {
      id: 'customer-id-123',
      email: 'customer@example.com',
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.revokeCustomerAccess as jest.Mock).mockResolvedValue(
        mockCustomer
      );
    });

    it('should revoke customer access successfully', async () => {
      mockRequest.validatedParams = {
        customerId: 'customer-id-123',
      };

      await brandCustomerAccessController.revokeCustomerAccess(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.revokeCustomerAccess).toHaveBeenCalledWith(
        'business-id-123',
        'customer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('restoreCustomerAccess', () => {
    const mockCustomer = {
      id: 'customer-id-123',
      email: 'customer@example.com',
      restored: true,
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.restoreCustomerAccess as jest.Mock).mockResolvedValue(
        mockCustomer
      );
    });

    it('should restore customer access successfully', async () => {
      mockRequest.validatedParams = {
        customerId: 'customer-id-123',
      };

      await brandCustomerAccessController.restoreCustomerAccess(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.customerAccess.restoreCustomerAccess).toHaveBeenCalledWith(
        'business-id-123',
        'customer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteCustomer', () => {
    beforeEach(() => {
      (mockBrandServices.customerAccess.deleteCustomer as jest.Mock).mockResolvedValue({
        deleted: true,
      });
    });

    it('should delete customer successfully', async () => {
      mockRequest.validatedParams = {
        customerId: 'customer-id-123',
      };

      await brandCustomerAccessController.deleteCustomer(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.deleteCustomer).toHaveBeenCalledWith(
        'business-id-123',
        'customer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('bulkUpdateAccess', () => {
    const mockResult = {
      updated: 5,
      failed: 0,
    };

    beforeEach(() => {
      (mockBrandServices.customerAccess.bulkUpdateAccess as jest.Mock).mockResolvedValue(
        mockResult
      );
    });

    it('should bulk update customer access successfully', async () => {
      mockRequest.validatedBody = {
        customerIds: ['customer-id-1', 'customer-id-2', 'customer-id-3'],
        updates: {
          status: 'active',
          metadata: { updatedBy: 'user-id-123' },
        },
      };

      await brandCustomerAccessController.bulkUpdateAccess(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.customerAccess.bulkUpdateAccess).toHaveBeenCalledWith(
        'business-id-123',
        ['customer-id-1', 'customer-id-2', 'customer-id-3'],
        true
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Access service unavailable',
      };
      (mockBrandServices.customerAccess.isEmailAllowed as jest.Mock).mockRejectedValue(
        serviceError
      );

      mockRequest.validatedParams = {
        email: 'test@example.com',
      };

      await brandCustomerAccessController.checkEmailAccess(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.customerAccess.isEmailAllowed as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      mockRequest.validatedParams = {
        email: 'test@example.com',
      };

      await brandCustomerAccessController.checkEmailAccess(mockRequest, mockResponse, mockNext);

      expect((brandCustomerAccessController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'CHECK_EMAIL_ACCESS'
      );
    });
  });
});
