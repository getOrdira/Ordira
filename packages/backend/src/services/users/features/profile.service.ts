// src/services/users/features/profile.service.ts

import { logger } from '../../../utils/logger';
import { User } from '../../../models/user.model';
import { userDataService } from '../core/userData.service';
import { userCacheService } from '../utils/cache.service';
import { userProfileFormatterService } from '../utils/profileFormatter.service';
import type { UpdateUserData, UserProfile } from '../utils/types';

export class UserProfileService {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return userDataService.getUserProfileById(userId, { useCache: true });
  }

  async updateUserProfile(userId: string, updates: UpdateUserData): Promise<UserProfile> {
    const startTime = Date.now();

    if (updates.firstName || updates.lastName) {
      const currentUser = await User.findById(userId).select('firstName lastName').lean();
      if (currentUser) {
        const firstName = updates.firstName ?? currentUser.firstName;
        const lastName = updates.lastName ?? currentUser.lastName;
        (updates as any).fullName = `${firstName} ${lastName}`.trim();
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .select('-password -emailVerificationToken')
      .lean();

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    await userCacheService.invalidateUserCaches(userId);

    const duration = Date.now() - startTime;
    logger.info(`User profile updated successfully in ${duration}ms`, {
      userId,
      duration
    });

    return userProfileFormatterService.format(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const startTime = Date.now();

    const result = await User.deleteOne({ _id: userId });

    if (result.deletedCount === 0) {
      throw { statusCode: 404, message: 'User not found' };
    }

    await userCacheService.invalidateUserCaches(userId);

    const duration = Date.now() - startTime;
    logger.info(`User deleted successfully in ${duration}ms`, {
      userId,
      duration
    });
  }
}

export const userProfileService = new UserProfileService();
