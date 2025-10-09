import { createAppError } from '../../../middleware/error.middleware';
import type {
  BusinessProposalsOptions,
  BusinessVotesOptions,
  PendingVotesFilters,
  VotingAnalyticsOptions
} from '../utils/types';

const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;

export class VotingValidationService {
  ensureBusinessId(businessId: string | undefined | null): string {
    const trimmed = (businessId || '').trim();
    if (!trimmed) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }
    return trimmed;
  }

  normalizeBusinessVotesOptions(options: BusinessVotesOptions = {}): Required<BusinessVotesOptions> {
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, MAX_PAGE_LIMIT) : DEFAULT_PAGE_LIMIT;
    const offset = options.offset && options.offset > 0 ? options.offset : 0;
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';

    if (!['timestamp', 'proposalId'].includes(sortBy)) {
      throw createAppError('Invalid sortBy value for votes listing', 400, 'INVALID_SORT');
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw createAppError('Invalid sortOrder value for votes listing', 400, 'INVALID_SORT_ORDER');
    }

    return {
      useCache: options.useCache !== false,
      limit,
      offset,
      sortBy,
      sortOrder
    };
  }

  normalizePendingVotesFilters(filters: PendingVotesFilters = {}): Required<PendingVotesFilters> {
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, MAX_PAGE_LIMIT) : DEFAULT_PAGE_LIMIT;
    const offset = filters.offset && filters.offset > 0 ? filters.offset : 0;

    return {
      proposalId: filters.proposalId?.trim() || undefined,
      userId: filters.userId?.trim() || undefined,
      limit,
      offset,
      useCache: filters.useCache !== false
    };
  }

  normalizeBusinessProposalsOptions(options: BusinessProposalsOptions = {}): Required<BusinessProposalsOptions> {
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, MAX_PAGE_LIMIT) : 50;
    const status = options.status;
    if (status && !['active', 'completed', 'failed'].includes(status)) {
      throw createAppError('Invalid proposal status filter', 400, 'INVALID_STATUS_FILTER');
    }

    return {
      useCache: options.useCache !== false,
      searchQuery: options.searchQuery?.trim() || undefined,
      status,
      limit
    };
  }

  normalizeAnalyticsOptions(options: VotingAnalyticsOptions = {}) {
    const normalized = {
      startDate: options.startDate,
      endDate: options.endDate,
      includeRecommendations: options.includeRecommendations !== false,
      includeTrends: options.includeTrends !== false,
      useCache: options.useCache !== false,
      proposalId: options.proposalId?.trim() || undefined
    } as const;

    if (normalized.startDate && normalized.endDate && normalized.startDate > normalized.endDate) {
      throw createAppError('startDate must be before endDate for analytics range', 400, 'INVALID_DATE_RANGE');
    }

    return normalized;
  }
}

export const votingValidationService = new VotingValidationService();
