/**
 * User Cache Service Unit Tests
 * 
 * Tests user caching operations with TTL configuration.
 */

import { UserCacheService } from '../../../services/users/utils/cache.service';
import { User } from '../../../models/user';
import { enhancedCacheService } from '../../../services/external/enhanced-cache.service';

// Mock dependencies
const mockEnhancedCacheService = {
  getCachedUser: jest.fn(),
  cacheUser: jest.fn(),
  getCachedAnalytics: jest.fn(),
  cacheAnalytics: jest.fn(),
  invalidateByTags: jest.fn(),
};

// Mock services
jest.mock('../../../services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));

// Mock User model
jest.mock('../../../models/user');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('UserCacheService', () => {
  let userCacheService: UserCacheService;

  const mockUser = {
    _id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockAnalytics = {
    totalUsers: 100,
    verifiedUsers: 85,
  };

  beforeEach(() => {
    userCacheService = new UserCacheService();
    jest.clearAllMocks();
  });

  describe('ttlConfig', () => {
    it('should return default TTL configuration', () => {
      expect(userCacheService.ttlConfig).toEqual({
        default: 300,
        short: 60,
        long: 3600,
      });
    });

    it('should use custom TTL configuration when provided', () => {
      const customTtl = {
        default: 600,
        short: 120,
        long: 7200,
      };
      const customService = new UserCacheService(customTtl);
      
      expect(customService.ttlConfig).toEqual(customTtl);
    });
  });

  describe('getCachedUser', () => {
    it('should retrieve cached user from enhanced cache service', async () => {
      mockEnhancedCacheService.getCachedUser.mockResolvedValue(mockUser);

      const result = await userCacheService.getCachedUser('user-id-123');

      expect(mockEnhancedCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not cached', async () => {
      mockEnhancedCacheService.getCachedUser.mockResolvedValue(null);

      const result = await userCacheService.getCachedUser('user-id-123');

      expect(result).toBeNull();
    });
  });

  describe('cacheUser', () => {
    it('should cache user with default TTL', async () => {
      await userCacheService.cacheUser('user-id-123', mockUser);

      expect(mockEnhancedCacheService.cacheUser).toHaveBeenCalledWith(
        'user-id-123',
        mockUser,
        {
          ttl: 300,
          tags: ['user:user-id-123'],
        }
      );
    });

    it('should cache user with custom TTL', async () => {
      await userCacheService.cacheUser('user-id-123', mockUser, 600);

      expect(mockEnhancedCacheService.cacheUser).toHaveBeenCalledWith(
        'user-id-123',
        mockUser,
        {
          ttl: 600,
          tags: ['user:user-id-123'],
        }
      );
    });

    it('should use email tag when key starts with email:', async () => {
      await userCacheService.cacheUser('email:test@example.com', mockUser);

      expect(mockEnhancedCacheService.cacheUser).toHaveBeenCalledWith(
        'email:test@example.com',
        mockUser,
        {
          ttl: 300,
          tags: ['email:test@example.com'],
        }
      );
    });
  });

  describe('getCachedAnalytics', () => {
    it('should retrieve cached analytics from enhanced cache service', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(mockAnalytics);

      const params = { timeRange: null };
      const result = await userCacheService.getCachedAnalytics(params);

      expect(mockEnhancedCacheService.getCachedAnalytics).toHaveBeenCalledWith(
        'user',
        params,
        {
          ttl: 300,
        }
      );
      expect(result).toEqual(mockAnalytics);
    });

    it('should return null when analytics are not cached', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);

      const params = { timeRange: null };
      const result = await userCacheService.getCachedAnalytics(params);

      expect(result).toBeNull();
    });
  });

  describe('cacheAnalytics', () => {
    it('should cache analytics with default TTL and tags', async () => {
      const params = { timeRange: null };

      await userCacheService.cacheAnalytics(params, mockAnalytics);

      expect(mockEnhancedCacheService.cacheAnalytics).toHaveBeenCalledWith(
        'user',
        params,
        mockAnalytics,
        {
          ttl: 300,
          tags: ['user_analytics'],
        }
      );
    });
  });

  describe('invalidateUserCaches', () => {
    it('should invalidate user analytics cache when no userId provided', async () => {
      await userCacheService.invalidateUserCaches();

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
      ]);
    });

    it('should invalidate user-specific caches when userId is provided', async () => {
      await userCacheService.invalidateUserCaches('user-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
        'user:user-id-123',
      ]);
    });

    it('should include email tag when user email is found', async () => {
      (User.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            email: 'test@example.com',
          }),
        }),
      });

      await userCacheService.invalidateUserCaches('user-id-123');

      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
        'user:user-id-123',
        'email:test@example.com',
      ]);
    });

    it('should handle errors when resolving user email gracefully', async () => {
      (User.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await userCacheService.invalidateUserCaches('user-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
        'user:user-id-123',
      ]);
    });

    it('should handle case when user email is not found', async () => {
      (User.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await userCacheService.invalidateUserCaches('user-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
        'user:user-id-123',
      ]);
    });

    it('should handle case when user has no email field', async () => {
      (User.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'user-id-123',
            // No email field
          }),
        }),
      });

      await userCacheService.invalidateUserCaches('user-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalledWith([
        'user_analytics',
        'user:user-id-123',
      ]);
    });
  });
});

