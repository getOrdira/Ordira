// src/services/users/core/userData.service.ts

import { queryOptimizationService } from '../../external/query-optimization.service';
import { User } from '../../../models/deprecated/user.model';
import { userCacheService } from '../utils/cache.service';
import { userProfileFormatterService } from '../utils/profileFormatter.service';
import type { UserProfile } from '../utils/types';

export interface UserCacheOptions {
  useCache?: boolean;
}

export interface GetUserByEmailOptions {
  skipCache?: boolean;
}

export class UserDataService {
  private readonly cacheTtl = userCacheService.ttlConfig.default;

  async getUserDocumentById(userId: string, options: UserCacheOptions = {}): Promise<any | null> {
    const { useCache = true } = options;

    if (useCache) {
      const cached = await userCacheService.getCachedUser(userId);
      if (cached) {
        return cached;
      }
    }

    const userDocument = await queryOptimizationService.optimizedUserLookup(userId, User);

    if (!userDocument) {
      return null;
    }

    if (useCache) {
      await userCacheService.cacheUser(userId, userDocument, this.cacheTtl);
    }

    return userDocument;
  }

  async getUserProfileById(userId: string, options: UserCacheOptions = {}): Promise<UserProfile | null> {
    const userDocument = await this.getUserDocumentById(userId, options);
    return userDocument ? userProfileFormatterService.format(userDocument) : null;
  }

  async getUserByEmail(email: string, options: GetUserByEmailOptions = {}): Promise<any | null> {
    const { skipCache = false } = options;

    if (!skipCache) {
      const cached = await userCacheService.getCachedUser(`email:${email}`);
      if (cached) {
        return cached;
      }
    }

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return null;
    }

    if (!skipCache) {
      await userCacheService.cacheUser(`email:${email}`, user, this.cacheTtl);
    }

    return user;
  }

  async batchGetUsers(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) {
      return [];
    }

    const users = await queryOptimizationService.batchUserLookup(userIds, User);
    return users.map(user => userProfileFormatterService.format(user));
  }
}

export const userDataService = new UserDataService();
