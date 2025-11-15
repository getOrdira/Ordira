/**
 * Users Cache Controller Unit Tests
 * 
 * Tests cache management operations: invalidation, get cached user, get cache configuration.
 */

import { Response } from 'express';
import { UsersCacheController } from '../../../../controllers/features/users/usersCache.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserCacheService = {
  invalidateUserCaches: jest.fn(),
  getCachedUser: jest.fn(),
  getCacheConfiguration: jest.fn(),
};

const mockUserFormatterService = {
  format: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserAuthService: jest.fn(),
  getUserProfileService: jest.fn(),
  getUserSearchService: jest.fn(),
  getUserAnalyticsService: jest.fn(),
  getUserDataService: jest.fn(),
  getUserFormatterService: () => mockUserFormatterService,
  getUserCacheService: () => mockUserCacheService,
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

describe('UsersCacheController', () => {
  let usersCacheController: UsersCacheController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersCacheController = new UsersCacheController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('invalidateUserCaches', () => {
    beforeEach(() => {
      mockUserCacheService.invalidateUserCaches.mockResolvedValue(undefined);
    });

    it('should invalidate cache for specific user from params', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = {};

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('invalidated', true);
      expect(responseData.data).toHaveProperty('scope', 'user');
      expect(responseData.data).toHaveProperty('userId', 'user-id-123');
      expect(responseData.data).toHaveProperty('invalidatedAt');
    });

    it('should invalidate cache for specific user from body', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedBody = { userId: 'user-id-456' };

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-456');
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.scope).toBe('user');
    });

    it('should invalidate global cache when userId is not provided', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedBody = {};
      mockRequest.userId = undefined;

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith(undefined);
      
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.scope).toBe('global');
      expect(responseData.data.userId).toBeNull();
    });

    it('should use request userId as fallback', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedBody = {};
      mockRequest.userId = 'user-id-789';

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-789');
    });

    it('should include timestamp in response', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = {};

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty('invalidatedAt');
      expect(typeof responseData.data.invalidatedAt).toBe('string');
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      const serviceError = {
        statusCode: 500,
        message: 'Cache service unavailable',
      };
      mockUserCacheService.invalidateUserCaches.mockRejectedValue(serviceError);

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCachedUser', () => {
    const mockCachedUser = {
      _id: 'user-id-123',
      email: 'cached@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockFormattedProfile = {
      id: 'user-id-123',
      email: 'cached@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserFormatterService.format.mockReturnValue(mockFormattedProfile);
    });

    it('should retrieve cached user by userId', async () => {
      mockRequest.validatedQuery = {
        userId: 'user-id-123',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(mockCachedUser);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
      expect(mockUserFormatterService.format).toHaveBeenCalledWith(mockCachedUser);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('cacheKey', 'user-id-123');
      expect(responseData.data).toHaveProperty('cached', true);
      expect(responseData.data).toHaveProperty('profile', mockFormattedProfile);
    });

    it('should retrieve cached user by email', async () => {
      mockRequest.validatedQuery = {
        email: 'cached@example.com',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(mockCachedUser);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith(
        'email:cached@example.com'
      );
    });

    it('should normalize email to lowercase for cache key', async () => {
      mockRequest.validatedQuery = {
        email: 'Cached@Example.COM',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(mockCachedUser);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith(
        'email:cached@example.com'
      );
    });

    it('should return 400 when both userId and email are missing', async () => {
      mockRequest.validatedQuery = {};

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserCacheService.getCachedUser).not.toHaveBeenCalled();
    });

    it('should handle cache miss correctly', async () => {
      mockRequest.validatedQuery = {
        userId: 'user-id-123',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(null);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.cached).toBe(false);
      expect(responseData.data.profile).toBeNull();
    });

    it('should prioritize userId over email', async () => {
      mockRequest.validatedQuery = {
        userId: 'user-id-123',
        email: 'user@example.com',
      };

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
      expect(mockUserCacheService.getCachedUser).not.toHaveBeenCalledWith(
        expect.stringContaining('email:')
      );
    });

    it('should fallback to req.query when validatedQuery is missing', async () => {
      mockRequest.validatedQuery = undefined;
      mockRequest.query = {
        userId: 'user-id-123',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(mockCachedUser);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
    });

    it('should sanitize cached user before returning', async () => {
      mockRequest.validatedQuery = {
        userId: 'user-id-123',
      };
      mockUserCacheService.getCachedUser.mockResolvedValue(mockCachedUser);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      // Verify formatter was called (which should sanitize)
      expect(mockUserFormatterService.format).toHaveBeenCalled();
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      // Verify sensitive data is not exposed
      expect(JSON.stringify(responseData)).not.toContain('password');
    });
  });

  describe('getCacheConfiguration', () => {
    const mockConfig = {
      ttl: 3600,
      maxSize: 10000,
      strategy: 'LRU',
    };

    beforeEach(() => {
      mockUserCacheService.getCacheConfiguration.mockResolvedValue(mockConfig);
    });

    it('should retrieve cache configuration', async () => {
      await usersCacheController.getCacheConfiguration(mockRequest, mockResponse);

      expect(mockUserCacheService.getCacheConfiguration).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('configuration');
      expect(responseData.data.configuration).toEqual(mockConfig);
    });

    it('should include timestamp in response', async () => {
      await usersCacheController.getCacheConfiguration(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty('retrievedAt');
      expect(typeof responseData.data.retrievedAt).toBe('string');
    });

    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Configuration service unavailable',
      };
      mockUserCacheService.getCacheConfiguration.mockRejectedValue(serviceError);

      await usersCacheController.getCacheConfiguration(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics for invalidateUserCaches', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersCacheController,
        'recordPerformance' as any
      );
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockUserCacheService.invalidateUserCaches.mockResolvedValue(undefined);

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_CACHE_INVALIDATE'
      );
    });

    it('should record performance metrics for getCachedUser', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersCacheController,
        'recordPerformance' as any
      );
      mockRequest.validatedQuery = { userId: 'user-id-123' };
      mockUserCacheService.getCachedUser.mockResolvedValue(null);

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_CACHE_GET');
    });
  });

  describe('Logging', () => {
    it('should log cache invalidation with scope information', async () => {
      const logActionSpy = jest.spyOn(usersCacheController, 'logAction' as any);
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockUserCacheService.invalidateUserCaches.mockResolvedValue(undefined);

      await usersCacheController.invalidateUserCaches(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_CACHE_INVALIDATE_SUCCESS',
        expect.objectContaining({
          scope: 'user',
          userId: 'user-id-123',
        })
      );
    });

    it('should log cache get with hit/miss information', async () => {
      const logActionSpy = jest.spyOn(usersCacheController, 'logAction' as any);
      mockRequest.validatedQuery = { userId: 'user-id-123' };
      mockUserCacheService.getCachedUser.mockResolvedValue({ _id: 'user-id-123' });

      await usersCacheController.getCachedUser(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_CACHE_GET_SUCCESS',
        expect.objectContaining({
          cacheKey: 'user-id-123',
          hit: true,
        })
      );
    });
  });
});

