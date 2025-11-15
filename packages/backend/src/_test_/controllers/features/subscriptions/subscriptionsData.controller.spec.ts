/**
 * Subscriptions Data Controller Unit Tests
 * 
 * Tests subscription data operations: get subscription, get usage, reset usage, get contact.
 */

import { Response } from 'express';
import { SubscriptionsDataController } from '../../../../controllers/features/subscriptions/subscriptionsData.controller';
import { getSubscriptionDataService } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock subscription services
jest.mock('../../../../services/container.service', () => ({
  getSubscriptionDataService: jest.fn(() => ({
    getSummaryForBusiness: jest.fn(),
    resetMonthlyUsage: jest.fn(),
    getBusinessContact: jest.fn(),
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

describe('SubscriptionsDataController', () => {
  let subscriptionsDataController: SubscriptionsDataController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockSubscriptionDataService: any;

  beforeEach(() => {
    subscriptionsDataController = new SubscriptionsDataController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockSubscriptionDataService = getSubscriptionDataService();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (subscriptionsDataController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (subscriptionsDataController as any).resolveBusinessId = jest.fn().mockReturnValue('business-id-123');
    (subscriptionsDataController as any).getSubscriptionSummary = jest.fn();
    (subscriptionsDataController as any).recordPerformance = jest.fn();
    (subscriptionsDataController as any).logAction = jest.fn();
    (subscriptionsDataController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (subscriptionsDataController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getSubscription', () => {
    const mockSummary = {
      tier: 'premium',
      status: 'active',
      usage: {
        certificates: 50,
        products: 100,
      },
      limits: {
        certificates: 1000,
        products: 5000,
      },
    };

    beforeEach(() => {
      (subscriptionsDataController as any).getSubscriptionSummary.mockResolvedValue(mockSummary);
    });

    it('should retrieve subscription summary successfully', async () => {
      mockRequest.validatedQuery = {};

      await subscriptionsDataController.getSubscription(mockRequest, mockResponse);

      expect((subscriptionsDataController as any).getSubscriptionSummary).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.summary).toEqual(mockSummary);
    });

    it('should return 400 when businessId is missing', async () => {
      (subscriptionsDataController as any).resolveBusinessId.mockReturnValue(undefined);

      await subscriptionsDataController.getSubscription(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSubscriptionUsage', () => {
    const mockSummary = {
      usage: {
        certificates: 50,
        products: 100,
      },
      limits: {
        certificates: 1000,
        products: 5000,
      },
      usagePercentages: {
        certificates: 5,
        products: 2,
      },
    };

    beforeEach(() => {
      (mockSubscriptionDataService.getSummaryForBusiness as jest.Mock).mockResolvedValue(mockSummary);
    });

    it('should retrieve subscription usage successfully', async () => {
      mockRequest.validatedQuery = {};

      await subscriptionsDataController.getSubscriptionUsage(mockRequest, mockResponse);

      expect(mockSubscriptionDataService.getSummaryForBusiness).toHaveBeenCalledWith('business-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.usage).toEqual(mockSummary.usage);
      expect(responseData.data.limits).toEqual(mockSummary.limits);
    });
  });

  describe('resetSubscriptionUsage', () => {
    const mockResult = {
      reset: true,
    };

    beforeEach(() => {
      (mockSubscriptionDataService.resetMonthlyUsage as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should reset subscription usage successfully', async () => {
      mockRequest.validatedBody = {};

      await subscriptionsDataController.resetSubscriptionUsage(mockRequest, mockResponse);

      expect(mockSubscriptionDataService.resetMonthlyUsage).toHaveBeenCalledWith('business-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
      expect(responseData.data.resetAt).toBeDefined();
    });
  });

  describe('getSubscriptionContact', () => {
    const mockContact = {
      email: 'billing@example.com',
      name: 'Billing Contact',
      phone: '123-456-7890',
    };

    beforeEach(() => {
      (mockSubscriptionDataService.getBusinessContact as jest.Mock).mockResolvedValue(mockContact);
    });

    it('should retrieve subscription contact successfully', async () => {
      mockRequest.validatedQuery = {};

      await subscriptionsDataController.getSubscriptionContact(mockRequest, mockResponse);

      expect(mockSubscriptionDataService.getBusinessContact).toHaveBeenCalledWith('business-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.contact).toEqual(mockContact);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Subscription service unavailable',
      };
      (mockSubscriptionDataService.getSummaryForBusiness as jest.Mock).mockRejectedValue(serviceError);

      await subscriptionsDataController.getSubscriptionUsage(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (subscriptionsDataController as any).getSubscriptionSummary.mockResolvedValue({
        tier: 'premium',
        status: 'active',
      });

      await subscriptionsDataController.getSubscription(mockRequest, mockResponse);

      expect((subscriptionsDataController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_SUBSCRIPTION_SUMMARY'
      );
    });
  });
});

