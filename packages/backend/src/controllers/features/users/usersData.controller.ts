// src/controllers/features/users/usersData.controller.ts
// Controller exposing user data retrieval operations

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';
import type { UserProfile } from '../../../services/users';

interface GetUserDocumentRequest extends UsersBaseRequest {
  validatedParams?: {
    userId?: string;
  };
  validatedQuery?: {
    userId?: string;
    useCache?: boolean;
  };
}

interface GetUserByEmailRequest extends UsersBaseRequest {
  validatedQuery?: {
    email?: string;
    skipCache?: boolean;
  };
}

interface BatchGetUsersRequest extends UsersBaseRequest {
  validatedBody?: {
    userIds?: string[];
    useCache?: boolean;
  };
}

/**
 * UsersDataController maps HTTP requests to user data service methods.
 */
export class UsersDataController extends UsersBaseController {
  /**
   * Retrieve a raw user document (sanitized before returning).
   */
  async getUserDocument(req: GetUserDocumentRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_GET_DOCUMENT');

      const userId =
        req.validatedParams?.userId ??
        req.validatedQuery?.userId ??
        this.resolveUserId(req);

      if (!userId) {
        throw {
          statusCode: 400,
          message: 'User identifier is required',
        };
      }

      const useCache = this.parseBoolean(req.validatedQuery?.useCache, true);
      const userDocument = await this.userDataService.getUserDocumentById(userId, { useCache });

      if (!userDocument) {
        throw {
          statusCode: 404,
          message: 'User not found',
        };
      }

      const profile = this.userFormatterService.format(userDocument as any);

      this.logAction(req, 'USERS_GET_DOCUMENT_SUCCESS', {
        userId,
        fromCache: useCache,
      });

      return { profile };
    }, res, 'User document retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a formatted user profile by identifier.
   */
  async getUserProfileById(req: GetUserDocumentRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_GET_PROFILE_BY_ID');

      const userId =
        req.validatedParams?.userId ??
        req.validatedQuery?.userId ??
        this.resolveUserId(req);

      if (!userId) {
        throw {
          statusCode: 400,
          message: 'User identifier is required',
        };
      }

      const useCache = this.parseBoolean(req.validatedQuery?.useCache, true);
      const profile = await this.userDataService.getUserProfileById(userId, { useCache });

      if (!profile) {
        throw {
          statusCode: 404,
          message: 'User profile not found',
        };
      }

      this.logAction(req, 'USERS_GET_PROFILE_BY_ID_SUCCESS', {
        userId,
        fromCache: useCache,
      });

      return { profile };
    }, res, 'User profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a user by email address.
   */
  async getUserByEmail(req: GetUserByEmailRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_GET_BY_EMAIL');

      const email = this.resolveEmail(req);
      if (!email) {
        throw {
          statusCode: 400,
          message: 'Email address is required',
        };
      }

      const skipCache = this.parseBoolean(req.validatedQuery?.skipCache, false);
      const userDocument = await this.userDataService.getUserByEmail(email, { skipCache });

      if (!userDocument) {
        throw {
          statusCode: 404,
          message: 'User not found',
        };
      }

      const profile = this.userFormatterService.format(userDocument as any);

      this.logAction(req, 'USERS_GET_BY_EMAIL_SUCCESS', {
        email,
        skipCache,
      });

      return { profile };
    }, res, 'User retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve multiple user profiles by identifiers.
   */
  async batchGetUsers(req: BatchGetUsersRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_BATCH_GET');

      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const userIds: string[] = Array.isArray(payload.userIds) ? payload.userIds : [];

      if (userIds.length === 0) {
        throw {
          statusCode: 400,
          message: 'At least one user identifier is required',
        };
      }

      const profiles: UserProfile[] = await this.userDataService.batchGetUsers(userIds);

      this.logAction(req, 'USERS_BATCH_GET_SUCCESS', {
        requested: userIds.length,
        returned: profiles.length,
      });

      return {
        profiles,
        total: profiles.length,
      };
    }, res, 'User profiles retrieved successfully', this.getRequestMeta(req));
  }
}

export const usersDataController = new UsersDataController();
