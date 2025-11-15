/**
 * User Analytics Service Unit Tests
 * 
 * Tests user analytics generation with caching support.
 */

import { UserAnalyticsService } from '../../../services/users/features/analytics.service';
import { User } from '../../../models/user';
import { userCacheService } from '../../../services/users/utils/cache.service';

// Mock dependencies
const mockUserCacheService = {
  getCachedAnalytics: jest.fn(),
  cacheAnalytics: jest.fn(),
};

// Mock services
jest.mock('../../../services/users/utils/cache.service', () => ({
  userCacheService: mockUserCacheService,
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

describe('UserAnalyticsService', () => {
  let userAnalyticsService: UserAnalyticsService;
  let mockUserModel: jest.Mocked<typeof User>;

  const mockAnalytics = {
    totalUsers: 100,
    verifiedUsers: 85,
    activeUsers: 90,
    recentSignups: 15,
    verificationRate: 85,
    avgLoginFrequency: 2.5,
    usersByPreferences: {
      emailNotifications: 80,
      smsNotifications: 30,
      marketingEmails: 50,
    },
    usersByLocation: {
      US: 60,
      UK: 25,
      CA: 15,
    },
  };

  beforeEach(() => {
    userAnalyticsService = new UserAnalyticsService();
    jest.clearAllMocks();
    
    mockUserModel = User as jest.Mocked<typeof User>;
  });

  describe('getUserAnalytics', () => {
    it('should return cached analytics when available', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(mockAnalytics);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(mockUserCacheService.getCachedAnalytics).toHaveBeenCalledWith({
        timeRange: null,
      });
      expect(result).toEqual(mockAnalytics);
      expect(User.aggregate).not.toHaveBeenCalled();
    });

    it('should generate analytics when cache is not available', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 100,
            verified: 85,
            active: 90,
            avgLoginFrequency: 2.5,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 80,
            smsNotifications: 30,
            marketingEmails: 50,
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'US', count: 60 },
          { _id: 'UK', count: 25 },
          { _id: 'CA', count: 15 },
        ]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(15);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(mockUserCacheService.getCachedAnalytics).toHaveBeenCalled();
      expect(User.aggregate).toHaveBeenCalled();
      expect(mockUserCacheService.cacheAnalytics).toHaveBeenCalled();
      expect(result.totalUsers).toBe(100);
      expect(result.verifiedUsers).toBe(85);
      expect(result.activeUsers).toBe(90);
    });

    it('should filter analytics by time range when provided', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 50,
            verified: 45,
            active: 48,
            avgLoginFrequency: 2.0,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 40,
            smsNotifications: 15,
            marketingEmails: 25,
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'US', count: 30 },
          { _id: 'UK', count: 15 },
          { _id: 'CA', count: 5 },
        ]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(10);

      const result = await userAnalyticsService.getUserAnalytics(timeRange);

      expect(mockUserCacheService.getCachedAnalytics).toHaveBeenCalledWith({
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
        },
      });
      
      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              createdAt: {
                $gte: timeRange.start,
                $lte: timeRange.end,
              },
            }),
          }),
        ])
      );
      
      expect(result.totalUsers).toBe(50);
    });

    it('should calculate verification rate correctly', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 100,
            verified: 85,
            active: 90,
            avgLoginFrequency: 2.5,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 80,
            smsNotifications: 30,
            marketingEmails: 50,
          },
        ])
        .mockResolvedValueOnce([]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(15);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(result.verificationRate).toBe(85);
    });

    it('should handle zero total users in verification rate calculation', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 0,
            verified: 0,
            active: 0,
            avgLoginFrequency: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 0,
            smsNotifications: 0,
            marketingEmails: 0,
          },
        ])
        .mockResolvedValueOnce([]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(result.verificationRate).toBe(0);
    });

    it('should cache generated analytics', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 100,
            verified: 85,
            active: 90,
            avgLoginFrequency: 2.5,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 80,
            smsNotifications: 30,
            marketingEmails: 50,
          },
        ])
        .mockResolvedValueOnce([]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(15);

      await userAnalyticsService.getUserAnalytics();

      expect(mockUserCacheService.cacheAnalytics).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      const error = new Error('Database error');
      (User.aggregate as jest.Mock).mockRejectedValue(error);

      await expect(userAnalyticsService.getUserAnalytics()).rejects.toThrow('Database error');
    });

    it('should return default values when aggregation returns empty results', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(result.totalUsers).toBe(0);
      expect(result.verifiedUsers).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.avgLoginFrequency).toBe(0);
      expect(result.recentSignups).toBe(0);
    });

    it('should get recent signups count for last 7 days', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 100,
            verified: 85,
            active: 90,
            avgLoginFrequency: 2.5,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 80,
            smsNotifications: 30,
            marketingEmails: 50,
          },
        ])
        .mockResolvedValueOnce([]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(15);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(User.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        })
      );
      expect(result.recentSignups).toBe(15);
    });

    it('should aggregate location statistics', async () => {
      mockUserCacheService.getCachedAnalytics.mockResolvedValue(null);
      
      (User.aggregate as jest.Mock) = jest.fn()
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 100,
            verified: 85,
            active: 90,
            avgLoginFrequency: 2.5,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            emailNotifications: 80,
            smsNotifications: 30,
            marketingEmails: 50,
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'US', count: 60 },
          { _id: 'UK', count: 25 },
          { _id: null, count: 5 },
        ]);
      
      (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(15);

      const result = await userAnalyticsService.getUserAnalytics();

      expect(result.usersByLocation).toEqual({
        US: 60,
        UK: 25,
        unknown: 5,
      });
    });
  });
});

