// src/controllers/features/domains/domainsBase.controller.ts
// Shared helpers for domain feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getDomainServices,
} from '../../../services/container.service';
import { 
  domainRegistryService,
  domainStorageService,
  domainDnsService,
  domainVerificationService,
  domainCertificateLifecycleService,
  domainHealthService,
  domainAnalyticsService,
  domainCacheService,
  certificateProvisionerService,
  domainValidationService
} from '../../../services/domains';

type DomainServices = ReturnType<typeof getDomainServices>;

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
 * Base controller providing helpers for domain feature controllers.
 */
export abstract class DomainsBaseController extends BaseController {
  protected domainServices: DomainServices = getDomainServices();
  protected domainRegistryService = domainRegistryService;
  protected domainValidationService = domainValidationService;
  protected domainVerificationService = domainVerificationService;
  protected domainDnsService = domainDnsService;
  protected domainCertificateLifecycleService = domainCertificateLifecycleService;
  protected domainHealthService = domainHealthService;
  protected domainAnalyticsService = domainAnalyticsService;
  protected domainCacheService = domainCacheService;
  protected domainStorageService = domainStorageService;
  protected certificateProvisionerService = certificateProvisionerService;

  /**
   * Ensure a business identifier is present.
   */
  protected requireBusinessId(req: BaseRequest): string {
    const candidate =
      req.businessId ??
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.params as any)?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    const businessId = this.parseString(candidate);
    if (!businessId) {
      throw { statusCode: 400, message: 'Business identifier is required for domain operations' };
    }
    return businessId;
  }

  /**
   * Ensure a domain mapping identifier exists.
   */
  protected requireDomainId(req: BaseRequest): string {
    const candidate =
      req.validatedParams?.domainId ??
      req.validatedBody?.domainId ??
      req.validatedQuery?.domainId ??
      (req.params as any)?.domainId ??
      (req.body as any)?.domainId ??
      (req.query as any)?.domainId;

    const domainId = this.parseString(candidate);
    if (!domainId) {
      throw { statusCode: 400, message: 'Domain mapping identifier is required' };
    }
    return domainId;
  }

  /**
   * Normalize and ensure a domain/hostname exists.
   */
  protected requireDomainName(req: BaseRequest): string {
    const candidate =
      req.validatedBody?.domain ??
      req.validatedParams?.domain ??
      req.validatedQuery?.domain ??
      (req.body as any)?.domain ??
      (req.params as any)?.domain ??
      (req.query as any)?.domain ??
      (req.validatedBody as any)?.hostname ??
      (req.body as any)?.hostname;

    const domain = this.parseString(candidate);
    if (!domain) {
      throw { statusCode: 400, message: 'Domain name is required' };
    }
    return domain.toLowerCase();
  }

  /**
   * Parse string values trimming whitespace.
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
   * Parse optional boolean returning undefined when not provided.
   */
  protected parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.parseBoolean(value);
  }

  /**
   * Parse numeric values with optional bounds.
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
   * Normalize arrays of strings.
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
      const parts = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : undefined;
    }

    return undefined;
  }

  /**
   * Compute pagination parameters.
   */
  protected getPaginationParams(req: BaseRequest, options: PaginationOptions = {}): PaginationResult {
    const { defaultLimit = 25, maxLimit = 200 } = options;

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
   * Compute page number from offset & limit.
   */
  protected computePageFromOffset(offset: number, limit: number): number {
    if (limit <= 0) {
      return 1;
    }
    return Math.floor(offset / limit) + 1;
  }

  /**
   * Convert Mongoose documents into plain objects when applicable.
   */
  protected toPlainObject<T>(value: T): T {
    if (value && typeof value === 'object' && typeof (value as any).toObject === 'function') {
      return (value as any).toObject();
    }
    return value;
  }
}

export type DomainsBaseRequest = BaseRequest;
