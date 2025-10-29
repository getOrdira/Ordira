// src/controllers/features/users/usersBase.controller.ts
// Shared helpers for user feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getUserServices,
  getUserAuthService,
  getUserProfileService,
  getUserSearchService,
  getUserAnalyticsService,
  getUserDataService,
  getUserCacheService,
  getUserFormatterService,
  getUserValidationService,
} from '../../../services/container.service';

type UserServices = ReturnType<typeof getUserServices>;

interface NumberParseOptions {
  min?: number;
  max?: number;
}

interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Base controller exposing shared helpers for user feature controllers.
 */
export abstract class UsersBaseController extends BaseController {
  protected userServices: UserServices = getUserServices();
  protected userAuthService = getUserAuthService();
  protected userProfileService = getUserProfileService();
  protected userSearchService = getUserSearchService();
  protected userAnalyticsService = getUserAnalyticsService();
  protected userDataService = getUserDataService();
  protected userCacheService = getUserCacheService();
  protected userFormatterService = getUserFormatterService();
  protected userValidationService = getUserValidationService();

  /**
   * Ensure the current request is authenticated with optional type restrictions.
   */
  protected ensureUserAuthenticated(
    req: BaseRequest,
    allowedTypes: Array<BaseRequest['userType']> = [],
  ): void {
    if (!req.userId) {
      throw {
        statusCode: 401,
        message: 'Authentication required for user operation',
        code: 'USER_AUTH_REQUIRED',
      };
    }

    if (allowedTypes.length > 0) {
      const userType = req.userType;
      if (!userType || !allowedTypes.includes(userType)) {
        throw {
          statusCode: 403,
          message: 'User type is not permitted for this operation',
          code: 'USER_TYPE_FORBIDDEN',
        };
      }
    }
  }

  /**
   * Resolve a user identifier from the request context.
   */
  protected resolveUserId(req: BaseRequest, allowFallback: boolean = true): string | undefined {
    if (req.userId) {
      return req.userId;
    }

    if (!allowFallback) {
      return undefined;
    }

    const candidate =
      req.validatedParams?.userId ??
      req.validatedBody?.userId ??
      req.validatedQuery?.userId ??
      (req.body as any)?.userId ??
      (req.query as any)?.userId;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  /**
   * Resolve an email address from the request context.
   */
  protected resolveEmail(req: BaseRequest, allowFallback: boolean = true): string | undefined {
    const fromBody =
      req.validatedBody?.email ??
      req.validatedQuery?.email ??
      (allowFallback ? (req.body as any)?.email ?? (req.query as any)?.email : undefined);

    if (typeof fromBody === 'string') {
      const normalized = fromBody.trim().toLowerCase();
      return normalized.length > 0 ? normalized : undefined;
    }

    return undefined;
  }

  /**
   * Parse a boolean flag with a fallback value.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return fallback;
  }

  /**
   * Parse an optional boolean flag returning undefined when not provided.
   */
  protected parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return undefined;
  }

  /**
   * Parse a number while respecting optional bounds.
   */
  protected parseNumber(
    value: unknown,
    fallback: number,
    options: NumberParseOptions = {},
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    let result = parsed;
    if (options.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options.max !== undefined && result > options.max) {
      result = options.max;
    }
    return result;
  }

  /**
   * Parse an optional number returning undefined when invalid.
   */
  protected parseOptionalNumber(
    value: unknown,
    options: NumberParseOptions = {},
  ): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }
    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }

    return parsed;
  }

  /**
   * Parse optional string values with trimming.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Parse optional ISO date strings into Date instances.
   */
  protected parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value : undefined;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed : undefined;
    }

    return undefined;
  }

  /**
   * Compute pagination parameters from a request.
   */
  protected getPaginationParams(
    req: BaseRequest,
    options: PaginationOptions = {},
  ): PaginationParams {
    const { defaultLimit = 20, maxLimit = 100 } = options;

    const limit = this.parseNumber(
      (req.validatedQuery?.limit ?? (req.query as any)?.limit) as unknown,
      defaultLimit,
      { min: 1, max: maxLimit },
    );

    const page = this.parseNumber(
      (req.validatedQuery?.page ?? (req.query as any)?.page) as unknown,
      1,
      { min: 1 },
    );

    const offset =
      this.parseOptionalNumber(
        (req.validatedQuery?.offset ?? (req.query as any)?.offset) as unknown,
        { min: 0 },
      ) ?? (page - 1) * limit;

    return {
      page: this.computePageFromOffset(offset, limit),
      limit,
      offset,
    };
  }

  /**
   * Compute the current page number from offset + limit.
   */
  protected computePageFromOffset(offset: number, limit: number): number {
    if (limit <= 0) {
      return 1;
    }
    return Math.floor(offset / limit) + 1;
  }
}

export type UsersBaseRequest = BaseRequest;

