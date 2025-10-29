// src/controllers/features/users/usersSearch.controller.ts
// Controller exposing user search capabilities

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';
import type { UserSearchParams } from '../../../services/users';

interface SearchUsersRequest extends UsersBaseRequest {
  validatedQuery?: {
    query?: string;
    isActive?: boolean | string;
    isEmailVerified?: boolean | string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

/**
 * UsersSearchController maps HTTP search requests to the user search service.
 */
export class UsersSearchController extends UsersBaseController {
  /**
   * Search users with optional filters and pagination.
   */
  async searchUsers(req: SearchUsersRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_SEARCH');

      const pagination = this.getPaginationParams(req, { defaultLimit: 20, maxLimit: 100 });

      const query = this.parseString(
        req.validatedQuery?.query ?? ((req.query as any)?.query as string | undefined),
      );

      const isActive = this.parseOptionalBoolean(
        req.validatedQuery?.isActive ?? (req.query as any)?.isActive,
      );
      const isEmailVerified = this.parseOptionalBoolean(
        req.validatedQuery?.isEmailVerified ?? (req.query as any)?.isEmailVerified,
      );

      const sortBy = this.parseString(
        req.validatedQuery?.sortBy ?? ((req.query as any)?.sortBy as string | undefined),
      );
      const sortOrder = this.parseString(
        req.validatedQuery?.sortOrder ?? ((req.query as any)?.sortOrder as string | undefined),
      ) as 'asc' | 'desc' | undefined;

      const params: UserSearchParams = {
        query: query ?? undefined,
        isActive,
        isEmailVerified,
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: sortBy ?? undefined,
        sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
      };

      const results = await this.userSearchService.searchUsers(params);
      const paginationMeta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        results.total,
      );

      this.logAction(req, 'USERS_SEARCH_SUCCESS', {
        query: params.query,
        total: results.total,
        page: paginationMeta.page,
      });

      return {
        users: results.users,
        total: results.total,
        hasMore: results.hasMore,
        pagination: paginationMeta,
      };
    }, res, 'User search completed successfully', this.getRequestMeta(req));
  }
}

export const usersSearchController = new UsersSearchController();

