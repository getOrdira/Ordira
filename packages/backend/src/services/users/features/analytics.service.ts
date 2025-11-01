// src/services/users/features/analytics.service.ts

import { logger } from '../../../utils/logger';
import { User } from '../../../models/deprecated/user.model';
import { userCacheService } from '../utils/cache.service';
import type { UserAnalytics } from '../utils/types';

interface TimeRange {
  start: Date;
  end: Date;
}

export class UserAnalyticsService {
  async getUserAnalytics(timeRange?: TimeRange): Promise<UserAnalytics> {
    const cacheKey = { timeRange: timeRange ? {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    } : null };

    const cached = await userCacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      return cached as UserAnalytics;
    }

    const startTime = Date.now();

    try {
      const matchStage: Record<string, unknown> = {};
      if (timeRange) {
        matchStage.createdAt = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      const [basicStats, preferencesStats, recentSignups, locationStats] = await Promise.all([
        this.getUserBasicStats(matchStage),
        this.getUserPreferencesStats(matchStage),
        this.getRecentSignupsCount(7),
        this.getUserLocationStats(matchStage)
      ]);

      const analytics: UserAnalytics = {
        totalUsers: basicStats.total,
        verifiedUsers: basicStats.verified,
        activeUsers: basicStats.active,
        recentSignups,
        verificationRate: basicStats.total > 0 ? (basicStats.verified / basicStats.total) * 100 : 0,
        avgLoginFrequency: basicStats.avgLoginFrequency,
        usersByPreferences: preferencesStats,
        usersByLocation: locationStats
      };

      await userCacheService.cacheAnalytics(cacheKey, analytics);

      const duration = Date.now() - startTime;
      logger.info(`User analytics generated in ${duration}ms`, {
        duration,
        totalUsers: analytics.totalUsers
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to generate user analytics:', error);
      throw error;
    }
  }

  private async getUserBasicStats(matchStage: Record<string, unknown>): Promise<{
    total: number;
    verified: number;
    active: number;
    avgLoginFrequency: number;
  }> {
    const results = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgLoginFrequency: { $avg: { $ifNull: ['$loginCount', 0] } }
        }
      }
    ]);

    return results[0] ?? { total: 0, verified: 0, active: 0, avgLoginFrequency: 0 };
  }

  private async getUserPreferencesStats(matchStage: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          emailNotifications: { $sum: { $cond: ['$preferences.emailNotifications', 1, 0] } },
          smsNotifications: { $sum: { $cond: ['$preferences.smsNotifications', 1, 0] } },
          marketingEmails: { $sum: { $cond: ['$preferences.marketingEmails', 1, 0] } }
        }
      }
    ]);

    const data = results[0] ?? { emailNotifications: 0, smsNotifications: 0, marketingEmails: 0 };
    return {
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      marketingEmails: data.marketingEmails
    };
  }

  private async getUserLocationStats(matchStage: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await User.aggregate([
      { $match: matchStage },
      { $group: { _id: '$address.country', count: { $sum: 1 } } }
    ]);

    return results.reduce<Record<string, number>>((acc, item) => {
      acc[item._id ?? 'unknown'] = item.count;
      return acc;
    }, {});
  }

  private async getRecentSignupsCount(days: number): Promise<number> {
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return User.countDocuments({
      createdAt: { $gte: dateThreshold }
    });
  }
}

export const userAnalyticsService = new UserAnalyticsService();
