// src/controllers/features/apiKey/apiKeyBase.controller.ts
// Shared helpers for API key feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getApiKeyServicesGroup,
  getApiKeyDataService,
  getApiKeyUsageService,
  getApiKeyManagementService,
  getApiKeyValidationService
} from '../../../services/container.service';

type ApiKeyServices = ReturnType<typeof getApiKeyServicesGroup>;

interface NumberParseOptions {
  min?: number;
  max?: number;
}

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Base controller exposing helpers shared across API key controllers.
 */
export abstract class ApiKeyBaseController extends BaseController {
  protected apiKeyServices: ApiKeyServices = getApiKeyServicesGroup();
  protected apiKeyDataService = getApiKeyDataService();
  protected apiKeyUsageService = getApiKeyUsageService();
  protected apiKeyManagementService = getApiKeyManagementService();
  protected apiKeyValidationService = getApiKeyValidationService();

  /**
   * Resolve a business identifier from the request or throw when missing.
   */
  protected resolveBusinessId(req: BaseRequest, allowFallback: boolean = true): string | undefined {
    if (req.businessId) {
      return req.businessId;
    }

    if (!allowFallback) {
      return undefined;
    }

    const candidate =
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
  }

  /**
   * Ensure a business identifier exists in the request.
   */
  protected requireBusinessId(req: BaseRequest): string {
    const businessId = this.resolveBusinessId(req);
    if (!businessId) {
      throw {
        statusCode: 400,
        message: 'Business identifier is required for this API key operation',
      };
    }
    return businessId;
  }

  /**
   * Resolve an API key identifier from the request or throw when missing.
   */
  protected requireKeyId(req: BaseRequest, allowFallback: boolean = true): string {
    const candidate =
      req.validatedParams?.keyId ??
      req.validatedBody?.keyId ??
      req.validatedQuery?.keyId ??
      (allowFallback ? (req.params as any)?.keyId ?? (req.body as any)?.keyId ?? (req.query as any)?.keyId : undefined);

    const keyId = this.parseString(candidate);
    if (!keyId) {
      throw {
        statusCode: 400,
        message: 'API key identifier is required for this operation',
      };
    }
    return keyId;
  }

  /**
   * Parse optional string returning undefined when empty.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Parse boolean values with fallback.
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
   * Parse optional boolean flags.
   */
  protected parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.parseBoolean(value);
  }

  /**
   * Parse numeric value with optional bounds.
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
   * Parse optional numbers returning undefined when invalid.
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
   * Compute pagination inputs from a request.
   */
  protected getPaginationParams(req: BaseRequest, options: PaginationOptions = {}): PaginationResult {
    const { defaultLimit = 50, maxLimit = 500 } = options;
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
      this.parseOptionalNumber((req.validatedQuery?.offset ?? (req.query as any)?.offset) as unknown, {
        min: 0,
      }) ?? (page - 1) * limit;

    return {
      page: this.computePageFromOffset(offset, limit),
      limit,
      offset,
    };
  }

  /**
   * Helper to compute page number from offset & limit.
   */
  protected computePageFromOffset(offset: number, limit: number): number {
    if (limit <= 0) {
      return 1;
    }
    return Math.floor(offset / limit) + 1;
  }

  /**
   * Create pagination metadata.
   */
  protected createPaginationMeta(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Normalize arrays of string identifiers.
   */
  protected parseStringArray(value: unknown): string[] | undefined {
    if (!value) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (typeof item === 'string' ? item.trim() : undefined))
        .filter((item): item is string => Boolean(item));
      return normalized.length > 0 ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const items = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return items.length > 0 ? items : undefined;
    }

    return undefined;
  }
}

export type ApiKeyBaseRequest = BaseRequest;

