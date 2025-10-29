// src/controllers/features/users/usersProfile.controller.ts
// Controller exposing user profile operations

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';
import type { UpdateUserData } from '../../../services/users';

interface GetCurrentUserProfileRequest extends UsersBaseRequest {}

interface GetUserProfileRequest extends UsersBaseRequest {
  validatedParams?: {
    userId?: string;
  };
  validatedQuery?: {
    userId?: string;
  };
}

interface UpdateUserProfileRequest extends UsersBaseRequest {
  validatedParams?: {
    userId?: string;
  };
  validatedBody?: Partial<UpdateUserData> & {
    userId?: string;
  };
  validatedQuery?: {
    userId?: string;
  };
}

interface DeleteUserRequest extends UsersBaseRequest {
  validatedParams?: {
    userId?: string;
  };
  validatedBody?: {
    userId?: string;
  };
  validatedQuery?: {
    userId?: string;
  };
}

/**
 * UsersProfileController maps HTTP requests to user profile service methods.
 */
export class UsersProfileController extends UsersBaseController {
  /**
   * Retrieve the profile for the currently authenticated user.
   */
  async getCurrentUserProfile(req: GetCurrentUserProfileRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureUserAuthenticated(req);
      this.recordPerformance(req, 'USERS_GET_CURRENT_PROFILE');

      const userId = this.resolveUserId(req, false);
      if (!userId) {
        throw {
          statusCode: 400,
          message: 'Authenticated user identifier is required',
        };
      }

      const profile = await this.userProfileService.getUserProfile(userId);
      if (!profile) {
        throw {
          statusCode: 404,
          message: 'User profile not found',
        };
      }

      this.logAction(req, 'USERS_GET_CURRENT_PROFILE_SUCCESS', {
        userId,
      });

      return { profile };
    }, res, 'User profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a user profile by identifier (admin/management).
   */
  async getUserProfile(req: GetUserProfileRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_GET_PROFILE');

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

      const profile = await this.userProfileService.getUserProfile(userId);
      if (!profile) {
        throw {
          statusCode: 404,
          message: 'User profile not found',
        };
      }

      this.logAction(req, 'USERS_GET_PROFILE_SUCCESS', {
        userId,
      });

      return { profile };
    }, res, 'User profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update user profile details.
   */
  async updateUserProfile(req: UpdateUserProfileRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_UPDATE_PROFILE');

      const targetUserId =
        req.validatedParams?.userId ??
        req.validatedBody?.userId ??
        this.resolveUserId(req);

      if (!targetUserId) {
        throw {
          statusCode: 400,
          message: 'User identifier is required to update a profile',
        };
      }

      if (req.userId && req.userId !== targetUserId && req.userType === 'customer') {
        throw {
          statusCode: 403,
          message: 'Customers may only update their own profile',
        };
      }

      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const updates: UpdateUserData = {
        firstName: payload.firstName ? String(payload.firstName).trim() : undefined,
        lastName: payload.lastName ? String(payload.lastName).trim() : undefined,
        phoneNumber: payload.phoneNumber ? String(payload.phoneNumber).trim() : undefined,
        dateOfBirth: payload.dateOfBirth ? this.parseDate(payload.dateOfBirth) : undefined,
        profilePictureUrl: payload.profilePictureUrl ? String(payload.profilePictureUrl).trim() : undefined,
        preferences: payload.preferences,
        address: payload.address,
      };

      const profile = await this.userProfileService.updateUserProfile(targetUserId, updates);

      this.logAction(req, 'USERS_UPDATE_PROFILE_SUCCESS', {
        userId: targetUserId,
      });

      return {
        profile,
        updatedAt: new Date().toISOString(),
      };
    }, res, 'User profile updated successfully', this.getRequestMeta(req));
  }

  /**
   * Permanently delete a user account.
   */
  async deleteUser(req: DeleteUserRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_DELETE');

      const targetUserId =
        req.validatedParams?.userId ??
        req.validatedBody?.userId ??
        this.resolveUserId(req);

      if (!targetUserId) {
        throw {
          statusCode: 400,
          message: 'User identifier is required to delete a user',
        };
      }

      if (req.userId && req.userId !== targetUserId && req.userType === 'customer') {
        throw {
          statusCode: 403,
          message: 'Customers may only delete their own account',
        };
      }

      await this.userProfileService.deleteUser(targetUserId);

      this.logAction(req, 'USERS_DELETE_SUCCESS', {
        userId: targetUserId,
      });

      return {
        userId: targetUserId,
        deleted: true,
        deletedAt: new Date().toISOString(),
      };
    }, res, 'User deleted successfully', this.getRequestMeta(req));
  }
}

export const usersProfileController = new UsersProfileController();
