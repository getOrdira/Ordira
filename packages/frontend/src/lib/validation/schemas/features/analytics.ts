// src/lib/validation/schemas/features/analytics.ts
// Frontend validation schemas for analytics feature flows.

import Joi from 'joi';

import type {
  AnalyticsReportRequest,
  AnalyticsTimeRange
} from '@/lib/types/features/analytics/analyticsTypes';

import { commonSchemas } from '../commonSchemas';

const ANALYTICS_REPORT_TYPES = ['monthly-summary', 'product-performance', 'voting-trends'] as const;

const createRequiredMongoId = (fieldName: string): Joi.StringSchema =>
  commonSchemas.mongoId
    .required()
    .messages({
      'any.required': `${fieldName} is required`,
      'string.empty': `${fieldName} is required`,
      'string.hex': `${fieldName} must be a valid MongoDB ObjectId`,
      'string.length': `${fieldName} must be a valid MongoDB ObjectId`
    });

const analyticsDateSchema = (type: 'start' | 'end'): Joi.DateSchema =>
  Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': `Invalid ${type} date provided for analytics time range`,
      'date.format': `Invalid ${type} date provided for analytics time range`,
      'any.required': `${type.charAt(0).toUpperCase()}${type.slice(1)} date is required for analytics time range`
    });

const analyticsTimeRangeSchema: Joi.ObjectSchema<AnalyticsTimeRange> = Joi.object<AnalyticsTimeRange>({
  start: analyticsDateSchema('start'),
  end: analyticsDateSchema('end')
})
  .custom((value, helpers) => {
    if (value.start > value.end) {
      return helpers.error('any.invalid', { message: 'Analytics time range start must be before end' });
    }

    return value;
  })
  .messages({
    'any.invalid': 'Analytics time range start must be before end'
  });

const analyticsBusinessContextSchema: Joi.ObjectSchema<{ businessId: string }> = Joi.object({
  businessId: createRequiredMongoId('businessId')
});

const analyticsReportRequestSchema: Joi.ObjectSchema<AnalyticsReportRequest> = Joi.object<AnalyticsReportRequest>({
  businessId: createRequiredMongoId('businessId'),
  reportType: Joi.string()
    .valid(...ANALYTICS_REPORT_TYPES)
    .required()
    .messages({
      'any.only': 'reportType must be one of: monthly-summary, product-performance, voting-trends',
      'any.required': 'reportType is required'
    }),
  timeRange: analyticsTimeRangeSchema.optional(),
  includeRawData: Joi.boolean().optional(),
  useReplica: Joi.boolean().optional()
});

/**
 * Analytics feature specific Joi schemas mirroring backend validation behaviour.
 */
export const analyticsFeatureSchemas = {
  businessContext: analyticsBusinessContextSchema,
  timeRange: analyticsTimeRangeSchema,
  reportRequest: analyticsReportRequestSchema
} as const;
