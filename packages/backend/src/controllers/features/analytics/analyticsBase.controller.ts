// src/controllers/features/analytics/analyticsBase.controller.ts
// Shared helpers for analytics feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getAnalyticsServices,
  getPlatformAnalyticsDataService,
  getReportingDataService,
  getDashboardAggregationService,
  getPlatformInsightsService,
  getReportGenerationService,
  getSystemHealthService,
  getAnalyticsValidationService
} from '../../../services/container/container.getters';
import type {
  AnalyticsGrouping,
  AnalyticsReportRequest,
  AnalyticsReportType,
  AnalyticsTimeRange
} from '../../../services/analytics/utils/types';

type AnalyticsServices = ReturnType<typeof getAnalyticsServices>;

/**
 * Base controller offering utilities shared across analytics controllers.
 */
export abstract class AnalyticsBaseController extends BaseController {
  protected analyticsServices: AnalyticsServices = getAnalyticsServices();
  protected platformAnalyticsDataService = getPlatformAnalyticsDataService();
  protected reportingDataService = getReportingDataService();
  protected dashboardAggregationService = getDashboardAggregationService();
  protected platformInsightsService = getPlatformInsightsService();
  protected reportGenerationService = getReportGenerationService();
  protected systemHealthService = getSystemHealthService();
  protected analyticsValidationService = getAnalyticsValidationService();

  /**
   * Resolve business identifier from the request body, params, or query.
   */
  protected resolveBusinessId(req: BaseRequest, required: boolean = false): string | undefined {
    const candidate =
      req.businessId ??
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.params as any)?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    const businessId = this.parseString(candidate);
    if (required && !businessId) {
      throw { statusCode: 400, message: 'Business identifier is required for this analytics operation' };
    }
    return businessId;
  }

  /**
   * Resolve manufacturer identifier from the request.
   */
  protected resolveManufacturerId(req: BaseRequest): string | undefined {
    const candidate =
      req.validatedParams?.manufacturerId ??
      req.validatedBody?.manufacturerId ??
      req.validatedQuery?.manufacturerId ??
      (req.params as any)?.manufacturerId ??
      (req.body as any)?.manufacturerId ??
      (req.query as any)?.manufacturerId;

    return this.parseString(candidate);
  }

  /**
   * Parse a string value, trimming whitespace.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Parse a boolean value with fallback.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
      }
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
   * Parse optional numbers with optional bounds.
   */
  protected parseOptionalNumber(
    value: unknown,
    options: { min?: number; max?: number } = {}
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
   * Parse ISO date strings or Date instances.
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
   * Extract analytics time range from request query or body and validate.
   */
  protected extractTimeRange(req: AnalyticsBaseRequest): AnalyticsTimeRange | undefined {
    const explicitTimeRange =
      req.validatedBody?.timeRange ??
      (req.validatedQuery?.timeRange as AnalyticsTimeRange | undefined) ??
      (req.body as any)?.timeRange ??
      (req.query as any)?.timeRange;

    if (explicitTimeRange && typeof explicitTimeRange === 'object') {
      const start = this.parseDate((explicitTimeRange as any).start);
      const end = this.parseDate((explicitTimeRange as any).end);
      return this.buildValidatedTimeRange(start, end);
    }

    const start =
      this.parseDate(req.validatedQuery?.startDate) ??
      this.parseDate(req.validatedBody?.startDate) ??
      this.parseDate((req.query as any)?.startDate) ??
      this.parseDate((req.body as any)?.startDate);

    const end =
      this.parseDate(req.validatedQuery?.endDate) ??
      this.parseDate(req.validatedBody?.endDate) ??
      this.parseDate((req.query as any)?.endDate) ??
      this.parseDate((req.body as any)?.endDate);

    return this.buildValidatedTimeRange(start, end);
  }

  /**
   * Build and validate analytics time range if both start/end are provided.
   */
  private buildValidatedTimeRange(
    start?: Date,
    end?: Date
  ): AnalyticsTimeRange | undefined {
    if (!start && !end) {
      return undefined;
    }

    if (!start || !end) {
      throw { statusCode: 400, message: 'Both startDate and endDate must be provided for analytics time range queries' };
    }

    return this.analyticsValidationService.ensureValidTimeRange({ start, end });
  }

  /**
   * Normalize grouping input into supported analytics grouping values.
   */
  protected parseGrouping(value: unknown, fallback: AnalyticsGrouping = 'day'): AnalyticsGrouping {
    const normalized = this.parseString(value);
    if (!normalized) {
      return fallback;
    }

    if (normalized === 'week' || normalized === 'month') {
      return normalized;
    }
    return 'day';
  }

  /**
   * Build an analytics report request from incoming payload.
   */
  protected buildReportRequest(req: AnalyticsBaseRequest): AnalyticsReportRequest {
    const businessId = this.resolveBusinessId(req, true) as string;

    const reportTypeCandidate =
      this.parseString(req.validatedParams?.reportType) ??
      this.parseString(req.validatedBody?.reportType) ??
      this.parseString(req.validatedQuery?.reportType) ??
      this.parseString((req.params as any)?.reportType) ??
      this.parseString((req.body as any)?.reportType) ??
      this.parseString((req.query as any)?.reportType);

    if (!reportTypeCandidate) {
      throw { statusCode: 400, message: 'reportType is required for analytics reporting' };
    }

    const allowedReportTypes: AnalyticsReportType[] = ['monthly-summary', 'product-performance', 'voting-trends'];
    if (!allowedReportTypes.includes(reportTypeCandidate as AnalyticsReportType)) {
      throw { statusCode: 400, message: 'Unsupported analytics report type requested' };
    }

    const timeRange = this.extractTimeRange(req);
    const includeRawData =
      req.validatedBody?.includeRawData ??
      this.parseOptionalBoolean((req.query as any)?.includeRawData) ??
      false;

    const useReplica =
      req.validatedBody?.useReplica ??
      this.parseOptionalBoolean((req.query as any)?.useReplica) ??
      this.parseOptionalBoolean(req.validatedQuery?.useReplica);

    const request: AnalyticsReportRequest = {
      businessId: this.analyticsValidationService.ensureBusinessContext(businessId),
      reportType: reportTypeCandidate as AnalyticsReportType,
      timeRange,
      includeRawData,
      useReplica: useReplica ?? false
    };

    return this.analyticsValidationService.validateReportRequest(request);
  }

  /**
   * Sanitize request payload prior to service invocation.
   */
  protected sanitizeInput<T>(payload: T): T {
    return super.sanitizeInput(payload);
  }
}

export type AnalyticsBaseRequest = BaseRequest;

