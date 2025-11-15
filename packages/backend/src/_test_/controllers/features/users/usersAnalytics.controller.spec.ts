/**
 * Users Analytics Controller Unit Tests
 * 
 * Tests user analytics retrieval with time range filtering.
 */

import { Response } from 'express';
import { UsersAnalyticsController } from '../../../../controllers/features/users/usersAnalytics.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserAnalyticsService = {
  getUserAnalytics: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserAuthService: jest.fn(),
  getUserProfileService: jest.fn(),
  getUserSearchService: jest.fn(),
  getUserAnalyticsService: () => mockUserAnalyticsService,
  getUserDataService: jest.fn(),
  getUserFormatterService: jest.fn(),
  getUserCacheService: jest.fn(),
  getUserValidationService: jest.fn(),
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

describe('UsersAnalyticsController', () => {
  let usersAnalyticsController: UsersAnalyticsController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersAnalyticsController = new UsersAnalyticsController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('getUserAnalytics', () => {
    const mockAnalytics: any = {
      totalUsers: 1000,
      activeUsers: 750,
      newUsers: 50,
      verifiedUsers: 900,
      engagement: {
        averageSessionDuration: 15.5,
        totalSessions: 5000,
      },
    };

    beforeEach(() => {
      mockUserAnalyticsService.getUserAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should retrieve analytics without time range', async () => {
      mockRequest.validatedQuery = {};

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(mockUserAnalyticsService.getUserAnalytics).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('analytics');
      expect(responseData.data.analytics).toEqual(mockAnalytics);
      expect(responseData.data).toHaveProperty('generatedAt');
    });

    it('should retrieve analytics with 7d range', async () => {
      mockRequest.validatedQuery = {
        range: '7d',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs).toHaveProperty('start');
      expect(callArgs).toHaveProperty('end');
      expect(callArgs.start).toBeInstanceOf(Date);
      expect(callArgs.end).toBeInstanceOf(Date);
    });

    it('should retrieve analytics with 30d range', async () => {
      mockRequest.validatedQuery = {
        range: '30d',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.start.getTime()).toBeLessThan(callArgs.end.getTime());
      const daysDiff =
        (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(30, 0);
    });

    it('should retrieve analytics with 90d range', async () => {
      mockRequest.validatedQuery = {
        range: '90d',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      const daysDiff =
        (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(90, 0);
    });

    it('should retrieve analytics with 365d range', async () => {
      mockRequest.validatedQuery = {
        range: '365d',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      const daysDiff =
        (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(365, 0);
    });

    it('should retrieve analytics with 1y range (same as 365d)', async () => {
      mockRequest.validatedQuery = {
        range: '1y',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      const daysDiff =
        (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(365, 0);
    });

    it('should retrieve analytics with custom start and end dates', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      mockRequest.validatedQuery = {
        start: startDate,
        end: endDate,
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs.start).toBeInstanceOf(Date);
      expect(callArgs.end).toBeInstanceOf(Date);
    });

    it('should handle swapped start and end dates', async () => {
      const startDate = '2024-01-31';
      const endDate = '2024-01-01';
      mockRequest.validatedQuery = {
        start: startDate,
        end: endDate,
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      // Should swap them so start < end
      expect(callArgs.start.getTime()).toBeLessThanOrEqual(callArgs.end.getTime());
    });

    it('should use current date as end when only start is provided', async () => {
      const startDate = '2024-01-01';
      mockRequest.validatedQuery = {
        start: startDate,
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.end.getTime()).toBeGreaterThan(callArgs.start.getTime());
    });

    it('should ignore invalid range values', async () => {
      mockRequest.validatedQuery = {
        range: 'invalid-range',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      // Should fall back to undefined or custom dates
      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      // Either undefined or custom dates
      expect(callArgs === undefined || callArgs.start).toBeTruthy();
    });

    it('should handle "all" range as no time range', async () => {
      mockRequest.validatedQuery = {
        range: 'all',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(mockUserAnalyticsService.getUserAnalytics).toHaveBeenCalledWith(undefined);
    });

    it('should prioritize range over start/end dates', async () => {
      mockRequest.validatedQuery = {
        range: '30d',
        start: '2024-01-01',
        end: '2024-01-31',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
        .calls[0][0];
      // Should use range (30d) not the custom dates
      const daysDiff =
        (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(30, 0);
    });

    it('should include generatedAt timestamp in response', async () => {
      mockRequest.validatedQuery = {};

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty('generatedAt');
      expect(typeof responseData.data.generatedAt).toBe('string');
      expect(new Date(responseData.data.generatedAt).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });

    it('should fallback to req.query when validatedQuery is missing', async () => {
      mockRequest.validatedQuery = undefined;
      mockRequest.query = {
        range: '7d',
      };

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(mockUserAnalyticsService.getUserAnalytics).toHaveBeenCalled();
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Analytics service unavailable',
      };
      mockUserAnalyticsService.getUserAnalytics.mockRejectedValue(serviceError);

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Time Range Resolution', () => {
    it('should correctly calculate date ranges for all predefined ranges', async () => {
      const ranges = ['7d', '30d', '90d', '180d', '365d', '1y'];
      const expectedDays = [7, 30, 90, 180, 365, 365];

      for (let i = 0; i < ranges.length; i++) {
        mockRequest.validatedQuery = { range: ranges[i] };
        await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

        const callArgs = (mockUserAnalyticsService.getUserAnalytics as jest.Mock).mock
          .calls[i][0];
        const daysDiff =
          (callArgs.end.getTime() - callArgs.start.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeCloseTo(expectedDays[i], 0);
      }
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersAnalyticsController,
        'recordPerformance' as any
      );
      mockRequest.validatedQuery = {};
      mockUserAnalyticsService.getUserAnalytics.mockResolvedValue({});

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_ANALYTICS');
    });
  });

  describe('Logging', () => {
    it('should log analytics operation with time range info', async () => {
      const logActionSpy = jest.spyOn(usersAnalyticsController, 'logAction' as any);
      mockRequest.validatedQuery = {
        range: '30d',
      };
      mockUserAnalyticsService.getUserAnalytics.mockResolvedValue({});

      await usersAnalyticsController.getUserAnalytics(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_ANALYTICS_SUCCESS',
        expect.objectContaining({
          hasTimeRange: true,
        })
      );
    });
  });
});

