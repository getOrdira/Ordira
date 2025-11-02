// src/services/users/features/search.service.ts

import { logger } from '../../../utils/logger';
import { User } from '../../../models/deprecated/user.model';
import { userProfileFormatterService } from '../utils/profileFormatter.service';
import type { UserProfile, UserSearchParams } from '../utils/types';

export interface SearchUsersResult {
  users: UserProfile[];
  total: number;
  hasMore: boolean;
}

export class UserSearchService {
  async searchUsers(params: UserSearchParams): Promise<SearchUsersResult> {
    const startTime = Date.now();

    try {
      const searchCriteria: Record<string, unknown> = {};

      if (params.query) {
        searchCriteria.$text = { $search: params.query };
      }

      if (params.isActive !== undefined) {
        searchCriteria.isActive = params.isActive;
      }

      if (params.isEmailVerified !== undefined) {
        searchCriteria.isEmailVerified = params.isEmailVerified;
      }

      const sortCriteria: Record<string, 1 | -1 | { $meta: 'textScore' }> = {};
      if (params.query) {
        sortCriteria.score = { $meta: 'textScore' };
      } else {
        const sortField = params.sortBy ?? 'createdAt';
        sortCriteria[sortField] = params.sortOrder === 'asc' ? 1 : -1;
      }

      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;

      const [users, total] = await Promise.all([
        User.find(searchCriteria)
          .select('firstName lastName fullName email profilePictureUrl isActive isEmailVerified lastLoginAt createdAt preferences votingHistory brandInteractions')
          .sort(sortCriteria)
          .limit(limit)
          .skip(offset)
          .lean(),
        User.countDocuments(searchCriteria)
      ]);

      const duration = Date.now() - startTime;
      logger.info(`User search completed in ${duration}ms`, {
        query: params.query,
        resultsCount: users.length,
        totalCount: total,
        duration
      });

      return {
        users: users.map(user => userProfileFormatterService.format(user as any)),
        total,
        hasMore: offset + users.length < total
      };
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw error;
    }
  }
}

export const userSearchService = new UserSearchService();
