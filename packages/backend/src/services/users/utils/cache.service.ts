// src/services/users/utils/cache.service.ts

import { User } from '../../../models/user';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import { logger } from '../../../utils/logger';

export interface CacheTtlConfig {
  default: number;
  short: number;
  long: number;
}

const DEFAULT_TTL_CONFIG: CacheTtlConfig = {
  default: 300,
  short: 60,
  long: 3600
};

export class UserCacheService {
  constructor(private readonly ttl: CacheTtlConfig = DEFAULT_TTL_CONFIG) {}

  get ttlConfig(): CacheTtlConfig {
    return this.ttl;
  }

  async getCachedUser(key: string): Promise<any | null> {
    return enhancedCacheService.getCachedUser(key);
  }

  async cacheUser(key: string, user: any, ttl: number = this.ttl.default): Promise<void> {
    await enhancedCacheService.cacheUser(key, user, {
      ttl,
      tags: [key.startsWith('email:') ? key : `user:${key}`]
    });
  }

  async getCachedAnalytics(params: any): Promise<any | null> {
    return enhancedCacheService.getCachedAnalytics('user', params, {
      ttl: this.ttl.default
    });
  }

  async cacheAnalytics(params: any, analytics: any): Promise<void> {
    await enhancedCacheService.cacheAnalytics('user', params, analytics, {
      ttl: this.ttl.default,
      tags: ['user_analytics']
    });
  }

  async invalidateUserCaches(userId?: string): Promise<void> {
    const tags = ['user_analytics'];

    if (userId) {
      tags.push(`user:${userId}`);

      try {
        const user = await User.findById(userId).select('email').lean();
        if (user?.email) {
          tags.push(`email:${user.email}`);
        }
      } catch (error) {
        logger.warn('Failed to resolve user email during cache invalidation', {
          userId,
          error
        });
      }
    }

    await enhancedCacheService.invalidateByTags(tags);
  }
}

export const userCacheService = new UserCacheService();
