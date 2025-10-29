// src/controllers/features/security/securityBase.controller.ts
// Shared helpers for security feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import { getSecurityServices, getSecurityAuditService } from '../../../services/container.service';
import type { SecurityServices } from '../../../services/infrastructure/security';
import type {
  SecurityActorType,
  SecurityEventType,
  SecuritySeverity,
} from '../../../services/infrastructure/security';

type PermissionName =
  | 'security:audit'
  | 'security:analytics'
  | 'security:events'
  | 'security:sessions'
  | 'security:tokens'
  | 'security:scan'
  | string;

interface ActorOverrides {
  userId?: string;
  userType?: SecurityActorType;
}

interface NumberParseOptions {
  min?: number;
  max?: number;
}

/**
 * Base controller supplying helpers for security feature controllers.
 */
export abstract class SecurityBaseController extends BaseController {
  protected securityServices: SecurityServices = getSecurityServices();
  protected securityAuditService = getSecurityAuditService();

  /**
   * Ensure the request is authenticated with an optional user type constraint.
   */
  protected ensureAuthenticated(
    req: BaseRequest,
    allowedTypes?: Array<'business' | 'manufacturer' | 'customer' | string>,
  ): void {
    if (!req.userId) {
      throw {
        statusCode: 401,
        message: 'Authentication required for security operation',
        code: 'SECURITY_AUTH_REQUIRED',
      };
    }

    if (!req.userType) {
      throw {
        statusCode: 401,
        message: 'User type required for security operation',
        code: 'SECURITY_USER_TYPE_REQUIRED',
      };
    }

    if (allowedTypes && !allowedTypes.includes(req.userType)) {
      throw {
        statusCode: 403,
        message: 'User type is not permitted for this security operation',
        code: 'SECURITY_USER_TYPE_FORBIDDEN',
      };
    }
  }

  /**
   * Ensure the request has the required permission or throw a 403 error.
   */
  protected ensureSecurityPermission(req: BaseRequest, permission: PermissionName): void {
    const tokenPayload = (req as any).tokenPayload;
    const permissions: string[] | undefined = tokenPayload?.permissions;

    if (!permissions || (!permissions.includes(permission) && !permissions.includes('*'))) {
      throw {
        statusCode: 403,
        message: 'Insufficient permissions for security operation',
        code: 'SECURITY_PERMISSION_DENIED',
      };
    }
  }

  /**
   * Resolve the security actor from the request context combined with overrides.
   */
  protected resolveActor(req: BaseRequest, overrides: ActorOverrides = {}): {
    userId: string;
    userType: SecurityActorType;
  } {
    const userId =
      overrides.userId ??
      req.validatedBody?.userId ??
      req.validatedQuery?.userId ??
      req.userId;

    const userType =
      overrides.userType ??
      (req.validatedBody?.userType as SecurityActorType | undefined) ??
      (req.validatedQuery?.userType as SecurityActorType | undefined) ??
      (req.userType as SecurityActorType | undefined);

    return this.securityServices.securityValidationService.ensureActor(userId, userType);
  }

  /**
   * Parse numeric input ensuring sensible bounds.
   */
  protected parseNumber(value: unknown, fallback: number, options: NumberParseOptions = {}): number {
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
   * Parse optional number with optional bounds.
   */
  protected parseOptionalNumber(value: unknown, options: NumberParseOptions = {}): number | undefined {
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
   * Parse boolean flags from query/body values.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return fallback;
  }

  /**
   * Safely trim strings returning undefined when empty.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  /**
   * Narrow down an event type string when provided.
   */
  protected parseSecurityEventType(value: unknown): SecurityEventType | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    return value as SecurityEventType;
  }

  /**
   * Narrow down severity input when provided.
   */
  protected parseSecuritySeverity(value: unknown): SecuritySeverity | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    return value as SecuritySeverity;
  }
}

export type SecurityBaseRequest = BaseRequest;
