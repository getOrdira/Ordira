// src/controllers/features/users/usersCache.controller.ts
// Controller exposing user cache management operations

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';

interface InvalidateUserCacheRequest extends UsersBaseRequest {
  validatedBody?: {
    userId?: string;
  };
  validatedParams?: {
    userId?: string;
  };
}

interface GetCachedUserRequest extends UsersBaseRequest {
  validatedQuery?: {
    userId?: string;
    email?: string;
  };
}

/**
 * UsersCacheController exposes cache inspection and invalidation endpoints.
 */
export class UsersCacheController extends UsersBaseController {
  /**
   * Invalidate user cache entries either globally or for a specific user.
   */
  async invalidateUserCaches(req: InvalidateUserCacheRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_CACHE_INVALIDATE');

      const userId =
        req.validatedBody?.userId ??
        req.validatedParams?.userId ??
        this.resolveUserId(req, false);

      await this.userCacheService.invalidateUserCaches(userId);

      this.logAction(req, 'USERS_CACHE_INVALIDATE_SUCCESS', {
        scope: userId ? 'user' : 'global',
        userId,
      });

      return {
        invalidated: true,
        scope: userId ? 'user' : 'global',
        userId: userId ?? null,
        invalidatedAt: new Date().toISOString(),
      };
    }, res, 'User cache invalidated successfully', this.getRequestMeta(req));
  }

  /**
   * Inspect a cached user record by id or email (sanitized before returning).
   */
  async getCachedUser(req: GetCachedUserRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_CACHE_GET');

      const query = req.validatedQuery ?? ((req.query as any) ?? {});
      const userId = this.parseString(query.userId);
      const email = this.parseString(query.email);

      let cacheKey: string | undefined;
      if (userId) {
        cacheKey = userId;
      } else if (email) {
        cacheKey = `email:${email.toLowerCase()}`;
      }

      if (!cacheKey) {
        throw {
          statusCode: 400,
          message: 'A userId or email query parameter is required',
        };
      }

      const cached = await this.userCacheService.getCachedUser(cacheKey);
      const profile = cached ? this.userFormatterService.format(cached as any) : null;

      this.logAction(req, 'USERS_CACHE_GET_SUCCESS', {
        cacheKey,
        hit: Boolean(cached),
      });

      return {
        cacheKey,
        cached: Boolean(cached),
        profile,
      };
    }, res, 'Cached user retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve cache configuration for observability purposes.
   */
  async getCacheConfiguration(req: UsersBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_CACHE_CONFIG');

      const ttlConfig = this.userCacheService.ttlConfig;

      this.logAction(req, 'USERS_CACHE_CONFIG_SUCCESS', {
        ttlConfig,
      });

      return {
        ttl: ttlConfig,
      };
    }, res, 'User cache configuration retrieved successfully', this.getRequestMeta(req));
  }
}

export const usersCacheController = new UsersCacheController();

