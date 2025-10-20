// src/services/business/user.service.ts

import { userAuthService } from '../users/features/auth.service';
import { userProfileService } from '../users/features/profile.service';
import { userSearchService } from '../users/features/search.service';
import { userAnalyticsService } from '../users/features/analytics.service';
import { userDataService } from '../users/core/userData.service';
import type {
  CreateUserData,
  UpdateUserData,
  UserSearchParams,
  UserProfile,
  UserAnalytics
} from '../users/utils/types';

export type {
  CreateUserData,
  UpdateUserData,
  UserSearchParams,
  UserProfile,
  UserAnalytics
} from '../users/utils/types';

export class OptimizedUserService {
  async registerUser(userData: CreateUserData): Promise<any> {
    return userAuthService.registerUser(userData);
  }

  async loginUser(email: string, password: string): Promise<{ token: string; user: any }> {
    return userAuthService.loginUser(email, password);
  }

  async getUserById(userId: string, useCache: boolean = true): Promise<UserProfile | null> {
    return userDataService.getUserProfileById(userId, { useCache });
  }

  async getUserByEmail(email: string, skipCache: boolean = false): Promise<any | null> {
    return userDataService.getUserByEmail(email, { skipCache });
  }

  async updateUserProfile(userId: string, updates: UpdateUserData): Promise<UserProfile> {
    return userProfileService.updateUserProfile(userId, updates);
  }

  async searchUsers(params: UserSearchParams): Promise<{
    users: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    return userSearchService.searchUsers(params);
  }

  async batchGetUsers(userIds: string[]): Promise<UserProfile[]> {
    return userDataService.batchGetUsers(userIds);
  }

  async getUserAnalytics(timeRange?: { start: Date; end: Date }): Promise<UserAnalytics> {
    return userAnalyticsService.getUserAnalytics(timeRange);
  }

  async verifyUserEmail(userId: string, verificationToken: string): Promise<void> {
    return userAuthService.verifyUserEmail(userId, verificationToken);
  }

  async deleteUser(userId: string): Promise<void> {
    return userProfileService.deleteUser(userId);
  }
}

export const optimizedUserService = new OptimizedUserService();
