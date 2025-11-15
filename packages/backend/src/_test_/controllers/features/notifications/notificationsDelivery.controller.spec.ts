/**
 * Notifications Delivery Controller Unit Tests
 * 
 * Tests notification delivery operations: deliver notification, test channel configurations.
 */

import { Response, NextFunction } from 'express';
import { NotificationsDeliveryController } from '../../../../controllers/features/notifications/notificationsDelivery.controller';
import { getNotificationsServices } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock notifications services
jest.mock('../../../../services/container.service', () => ({
  getNotificationsServices: jest.fn(() => ({
    features: {
      deliveryService: {
        deliver: jest.fn(),
        testChannelConfigurations: jest.fn(),
      },
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

describe('NotificationsDeliveryController', () => {
  let notificationsDeliveryController: NotificationsDeliveryController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockNotificationsServices: any;

  beforeEach(() => {
    notificationsDeliveryController = new NotificationsDeliveryController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockNotificationsServices = getNotificationsServices();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (notificationsDeliveryController as any).recordPerformance = jest.fn();
    (notificationsDeliveryController as any).logAction = jest.fn();
    (notificationsDeliveryController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (notificationsDeliveryController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('deliverNotification', () => {
    beforeEach(() => {
      (mockNotificationsServices.features.deliveryService.deliver as jest.Mock).mockResolvedValue({});
    });

    it('should deliver notification successfully', async () => {
      mockRequest.validatedBody = {
        event: {
          type: 'order.confirmed',
          recipient: {
            email: 'test@example.com',
            businessId: 'business-id-123',
          },
          payload: {
            orderId: 'order-id-123',
          },
        },
        options: {
          channels: ['email'],
          priority: 'high',
        },
      };

      await notificationsDeliveryController.deliverNotification(mockRequest, mockResponse, mockNext);

      expect(mockNotificationsServices.features.deliveryService.deliver).toHaveBeenCalledWith(
        mockRequest.validatedBody.event,
        mockRequest.validatedBody.options
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.delivered).toBe(true);
    });

    it('should return 400 when event is missing', async () => {
      mockRequest.validatedBody = {
        options: {},
      };

      await notificationsDeliveryController.deliverNotification(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when recipient is missing', async () => {
      mockRequest.validatedBody = {
        event: {
          type: 'order.confirmed',
        },
      };

      await notificationsDeliveryController.deliverNotification(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('testChannelConfigurations', () => {
    const mockResults = {
      email: { success: true, latency: 150 },
      slack: { success: false, error: 'Invalid token' },
    };

    beforeEach(() => {
      (mockNotificationsServices.features.deliveryService.testChannelConfigurations as jest.Mock).mockResolvedValue(
        mockResults
      );
    });

    it('should test channel configurations successfully', async () => {
      await notificationsDeliveryController.testChannelConfigurations(mockRequest, mockResponse, mockNext);

      expect(mockNotificationsServices.features.deliveryService.testChannelConfigurations).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.results).toEqual(mockResults);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Delivery service unavailable',
      };
      (mockNotificationsServices.features.deliveryService.deliver as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedBody = {
        event: {
          type: 'order.confirmed',
          recipient: { email: 'test@example.com' },
        },
      };

      await notificationsDeliveryController.deliverNotification(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockNotificationsServices.features.deliveryService.deliver as jest.Mock).mockResolvedValue({});

      mockRequest.validatedBody = {
        event: {
          type: 'order.confirmed',
          recipient: { email: 'test@example.com' },
        },
      };

      await notificationsDeliveryController.deliverNotification(mockRequest, mockResponse, mockNext);

      expect((notificationsDeliveryController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'DELIVER_NOTIFICATION_EVENT'
      );
    });
  });
});

