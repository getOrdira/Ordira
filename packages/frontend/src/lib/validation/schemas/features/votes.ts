// src/lib/validation/schemas/features/votes.ts
// Frontend validation schemas for voting filters and analytics options.

import Joi from 'joi';

const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 500;

const businessVotesOptionsSchema = Joi.object({
  useCache: Joi.boolean().default(true),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT).messages({
    'number.min': `limit must be between 1 and ${MAX_PAGE_LIMIT}`,
    'number.max': `limit must be between 1 and ${MAX_PAGE_LIMIT}`
  }),
  offset: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'offset must be a non-negative integer'
  }),
  sortBy: Joi.string().valid('timestamp', 'proposalId').default('timestamp').messages({
    'any.only': 'Invalid sortBy value for votes listing'
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Invalid sortOrder value for votes listing'
  })
});

const pendingVotesFiltersSchema = Joi.object({
  proposalId: Joi.string().trim().optional(),
  userId: Joi.string().trim().optional(),
  useCache: Joi.boolean().default(true),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT).messages({
    'number.min': `limit must be between 1 and ${MAX_PAGE_LIMIT}`,
    'number.max': `limit must be between 1 and ${MAX_PAGE_LIMIT}`
  }),
  offset: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'offset must be a non-negative integer'
  })
});

const businessProposalsOptionsSchema = Joi.object({
  useCache: Joi.boolean().default(true),
  searchQuery: Joi.string().trim().optional(),
  status: Joi.string().valid('active', 'completed', 'failed').optional().messages({
    'any.only': 'Invalid proposal status filter'
  }),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_LIMIT).default(50).messages({
    'number.min': `limit must be between 1 and ${MAX_PAGE_LIMIT}`,
    'number.max': `limit must be between 1 and ${MAX_PAGE_LIMIT}`
  })
});

const votingAnalyticsOptionsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  includeRecommendations: Joi.boolean().default(true),
  includeTrends: Joi.boolean().default(true),
  useCache: Joi.boolean().default(true),
  proposalId: Joi.string().trim().optional()
}).custom((value, helpers) => {
  const { startDate, endDate } = value;
  if (startDate && endDate && startDate > endDate) {
    return helpers.error('any.invalid', { message: 'startDate must be before endDate for analytics range' });
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

/**
 * Voting feature specific Joi schemas mirroring backend validation behaviour.
 */
export const votesFeatureSchemas = {
  businessVotesOptions: businessVotesOptionsSchema,
  pendingVotesFilters: pendingVotesFiltersSchema,
  businessProposalsOptions: businessProposalsOptionsSchema,
  analyticsOptions: votingAnalyticsOptionsSchema
} as const;
