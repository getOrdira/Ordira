/**
 * Manufacturer Account Controller Unit Tests
 * 
 * Tests manufacturer account operations: get, update, delete, deactivate, reactivate, stats.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerAccountController } from '../../../../controllers/features/manufacturers/manufacturerAccount.controller';
import { manufacturerAccountCoreService } from '../../../../services/manufacturers/core/manufacturerAccount.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer account service
jest.mock('../../../../services/manufacturers/core/manufacturerAccount.service', () => ({
  manufacturerAccountCoreService: {
    getManufacturerAccount: jest.fn(),
    updateManufacturerAccount: jest.fn(),
    softDeleteAccount: jest.fn(),
    getAccountActivity: jest.fn(),
    updateNotificationPreferences: jest.fn(),
    getManufacturerStats: jest.fn(),
    validateOwnership: jest.fn(),
    deactivateAccount: jest.fn(),
    reactivateAccount: jest.fn(),
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

describe('ManufacturerAccountController', () => {
  let manufacturerAccountController: ManufacturerAccountController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerAccountController = new ManufacturerAccountController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('getManufacturerAccount', () => {
    const mockAccount = {
      id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      email: 'manufacturer@example.com',
    };

    beforeEach(() => {
      (manufacturerAccountCoreService.getManufacturerAccount as jest.Mock).mockResolvedValue(
        mockAccount
      );
    });

    it('should retrieve manufacturer account by ID', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerAccountController.getManufacturerAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.getManufacturerAccount).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.account).toEqual(mockAccount);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerAccountController.getManufacturerAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });
  });

  describe('updateManufacturerAccount', () => {
    const updateData = {
      name: 'Updated Manufacturer',
      description: 'Updated description',
      moq: 200,
    };

    const updatedAccount = {
      id: 'manufacturer-id-123',
      ...updateData,
    };

    beforeEach(() => {
      (manufacturerAccountCoreService.updateManufacturerAccount as jest.Mock).mockResolvedValue(
        updatedAccount
      );
    });

    it('should update manufacturer account successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = updateData;

      await manufacturerAccountController.updateManufacturerAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.updateManufacturerAccount).toHaveBeenCalledWith(
        'manufacturer-id-123',
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle complex nested updates', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        headquarters: {
          country: 'United States',
          city: 'New York',
        },
        certifications: [
          {
            name: 'ISO 9001',
            issuer: 'ISO',
            issueDate: new Date(),
          },
        ],
      };

      await manufacturerAccountController.updateManufacturerAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.updateManufacturerAccount).toHaveBeenCalled();
    });
  });

  describe('deactivateAccount', () => {
    beforeEach(() => {
      (manufacturerAccountCoreService.deactivateAccount as jest.Mock).mockResolvedValue({
        success: true,
      });
    });

    it('should deactivate manufacturer account', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerAccountController.deactivateAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.deactivateAccount).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('reactivateAccount', () => {
    beforeEach(() => {
      (manufacturerAccountCoreService.reactivateAccount as jest.Mock).mockResolvedValue({
        success: true,
      });
    });

    it('should reactivate manufacturer account', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerAccountController.reactivateAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.reactivateAccount).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getManufacturerStats', () => {
    const mockStats = {
      totalConnections: 10,
      activeOrders: 5,
      completedOrders: 25,
    };

    beforeEach(() => {
      (manufacturerAccountCoreService.getManufacturerStats as jest.Mock).mockResolvedValue(
        mockStats
      );
    });

    it('should retrieve manufacturer statistics', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerAccountController.getManufacturerStats(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.getManufacturerStats).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.stats).toEqual(mockStats);
    });
  });

  describe('updateNotificationPreferences', () => {
    const preferencesData = {
      emailNotifications: {
        invitations: true,
        orderUpdates: true,
      },
      frequency: 'immediate',
    };

    beforeEach(() => {
      (manufacturerAccountCoreService.updateNotificationPreferences as jest.Mock).mockResolvedValue(
        { success: true }
      );
    });

    it('should update notification preferences', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = preferencesData;

      await manufacturerAccountController.updateNotificationPreferences(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerAccountCoreService.updateNotificationPreferences).toHaveBeenCalledWith(
        'manufacturer-id-123',
        preferencesData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Service unavailable',
      };
      (manufacturerAccountCoreService.getManufacturerAccount as jest.Mock).mockRejectedValue(
        serviceError
      );

      await manufacturerAccountController.getManufacturerAccount(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});

