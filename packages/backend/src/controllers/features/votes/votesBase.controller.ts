// src/controllers/features/votes/votesBase.controller.ts
// Shared helpers for voting feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getVotingServices,
  getVotingDataService,
  getVotingContractService,
  getVotingStatsService,
  getVotingAnalyticsService,
  getVotingDashboardService,
  getVotingProposalsService,
  getVotingProposalManagementService,
  getVotingContractDeploymentService,
  getVotingValidationService,
} from '../../../services/container.service';

type VotesServices = ReturnType<typeof getVotingServices>;

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
 * Base controller exposing helpers shared across voting controllers.
 */
export abstract class VotesBaseController extends BaseController {
  protected votesServices: VotesServices = getVotingServices();
  protected votingDataService = getVotingDataService();
  protected votingContractService = getVotingContractService();
  protected votingStatsService = getVotingStatsService();
  protected votingAnalyticsService = getVotingAnalyticsService();
  protected votingDashboardService = getVotingDashboardService();
  protected votingProposalsService = getVotingProposalsService();
  protected votingProposalManagementService = getVotingProposalManagementService();
  protected votingContractDeploymentService = getVotingContractDeploymentService();
  protected votingValidationService = getVotingValidationService();

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
        message: 'Business identifier is required for this voting operation',
      };
    }
    return businessId;
  }

  /**
   * Resolve a proposal identifier from the request or throw when missing.
   */
  protected requireProposalId(req: BaseRequest, allowFallback: boolean = true): string {
    const candidate =
      req.validatedParams?.proposalId ??
      req.validatedBody?.proposalId ??
      req.validatedQuery?.proposalId ??
      (allowFallback ? (req.params as any)?.proposalId ?? (req.body as any)?.proposalId ?? (req.query as any)?.proposalId : undefined);

    const proposalId = this.parseString(candidate);
    if (!proposalId) {
      throw {
        statusCode: 400,
        message: 'Proposal identifier is required for this voting operation',
      };
    }
    return proposalId;
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
    const { defaultLimit = 100, maxLimit = 500 } = options;
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

  /**
   * Coerce Mongoose documents into plain objects when present.
   */
  protected toPlainObject<T>(value: T): T {
    if (value && typeof value === 'object' && typeof (value as any).toObject === 'function') {
      return (value as any).toObject();
    }
    return value;
  }
}

export type VotesBaseRequest = BaseRequest;
