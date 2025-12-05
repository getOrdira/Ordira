// src/controllers/features/supplyChain/supplyChainBase.controller.ts
// Shared helpers for supply chain feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getSupplyChainServices,
  getSupplyChainDeploymentService,
  getSupplyChainAssociationService,
  getSupplyChainContractReadService,
  getSupplyChainContractWriteService,
  getSupplyChainQrCodeService,
  getSupplyChainDashboardService,
  getSupplyChainAnalyticsService,
  getSupplyChainProductLifecycleService,
  getSupplyChainValidationService,
  getSupplyChainMappers,
  getSupplyChainLogParsingService,
} from '../../../services/container.service';

type SupplyChainServices = ReturnType<typeof getSupplyChainServices>;

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
 * Base controller exposing shared helpers for supply chain controllers.
 */
export abstract class SupplyChainBaseController extends BaseController {
  protected supplyChainServices: SupplyChainServices = getSupplyChainServices();
  protected deploymentService = getSupplyChainDeploymentService();
  protected associationService = getSupplyChainAssociationService();
  protected contractReadService = getSupplyChainContractReadService();
  protected contractWriteService = getSupplyChainContractWriteService();
  protected qrCodeService = getSupplyChainQrCodeService();
  protected dashboardService = getSupplyChainDashboardService();
  protected analyticsService = getSupplyChainAnalyticsService();
  protected productLifecycleService = getSupplyChainProductLifecycleService();
  protected validationService = getSupplyChainValidationService();
  protected mappers = getSupplyChainMappers();
  protected logParsingService = getSupplyChainLogParsingService();

  /**
   * Ensure a business identifier exists in the request.
   * Supports both brand (businessId) and manufacturer (manufacturerId) contexts.
   */
  protected requireBusinessId(req: BaseRequest): string {
    // Try businessId first (for brands)
    const businessCandidate =
      req.businessId ??
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.params as any)?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    const businessId = this.parseString(businessCandidate);
    if (businessId) {
      return businessId;
    }

    // Fall back to manufacturerId (for manufacturers)
    const manufacturerCandidate =
      req.manufacturerId ??
      req.validatedParams?.manufacturerId ??
      req.validatedBody?.manufacturerId ??
      req.validatedQuery?.manufacturerId ??
      (req.params as any)?.manufacturerId ??
      (req.body as any)?.manufacturerId ??
      (req.query as any)?.manufacturerId;

    const manufacturerId = this.parseString(manufacturerCandidate);
    if (manufacturerId) {
      return manufacturerId;
    }

    throw {
      statusCode: 400,
      message: 'Business or manufacturer identifier is required for supply chain operation',
    };
  }

  /**
   * Ensure a contract address exists and is normalized.
   */
  protected requireContractAddress(req: BaseRequest): string {
    const candidate =
      req.validatedParams?.contractAddress ??
      req.validatedBody?.contractAddress ??
      req.validatedQuery?.contractAddress ??
      (req.params as any)?.contractAddress ??
      (req.body as any)?.contractAddress ??
      (req.query as any)?.contractAddress;

    const contractAddress = this.parseString(candidate);
    if (!contractAddress) {
      throw {
        statusCode: 400,
        message: 'Contract address is required for supply chain operation',
      };
    }
    return contractAddress;
  }

  /**
   * Ensure a product identifier exists.
   */
  protected requireProductId(req: BaseRequest): string {
    const candidate =
      req.validatedParams?.productId ??
      req.validatedBody?.productId ??
      req.validatedQuery?.productId ??
      (req.params as any)?.productId ??
      (req.body as any)?.productId ??
      (req.query as any)?.productId;

    const productId = this.parseString(candidate);
    if (!productId) {
      throw {
        statusCode: 400,
        message: 'Product identifier is required for supply chain operation',
      };
    }
    return productId;
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
   * Parse dates from strings or Date instances.
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
   * Normalize string arrays from array or comma separated string.
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

  /**
   * Compute pagination parameters using limit/page/offset.
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
   * Compute a page value from offset + limit.
   */
  protected computePageFromOffset(offset: number, limit: number): number {
    if (limit <= 0) {
      return 1;
    }
    return Math.floor(offset / limit) + 1;
  }

  /**
   * Convert Mongoose documents to plain objects when available.
   */
  protected toPlainObject<T>(value: T): T {
    if (value && typeof value === 'object' && typeof (value as any).toObject === 'function') {
      return (value as any).toObject();
    }
    return value;
  }
}

export type SupplyChainBaseRequest = BaseRequest;

