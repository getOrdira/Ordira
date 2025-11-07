// src/lib/validation/schemas/features/subscriptions.ts
// Frontend validation schemas for subscription tier changes, downgrades, and usage metering.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const BRAND_PLAN_KEYS = ['foundation', 'growth', 'premium', 'enterprise'] as const;
const USAGE_CATEGORIES = ['certificates', 'votes', 'apiCalls', 'storage'] as const;

const tierChangeSchema = Joi.object({
  subscriptionId: commonSchemas.optionalMongoId,
  currentTier: Joi.string().valid(...BRAND_PLAN_KEYS).required().messages({
    'any.only': `currentTier must be one of: ${BRAND_PLAN_KEYS.join(', ')}`
  }),
  targetTier: Joi.string().valid(...BRAND_PLAN_KEYS).required().messages({
    'any.only': `targetTier must be one of: ${BRAND_PLAN_KEYS.join(', ')}`,
    'any.required': 'targetTier is required'
  })
}).custom((value, helpers) => {
  if (value.currentTier === value.targetTier) {
    return helpers.error('any.invalid', { message: 'Target tier must differ from current tier' });
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

const downgradeRequestSchema = Joi.object({
  fromPlan: Joi.string().valid(...BRAND_PLAN_KEYS).required().messages({
    'any.only': `fromPlan must be one of: ${BRAND_PLAN_KEYS.join(', ')}`
  }),
  toPlan: Joi.string().valid(...BRAND_PLAN_KEYS).required().messages({
    'any.only': `toPlan must be one of: ${BRAND_PLAN_KEYS.join(', ')}`
  }),
  businessId: commonSchemas.mongoId.required().messages({
    'any.required': 'businessId is required'
  })
});

const usageOperationSchema = Joi.object({
  businessId: commonSchemas.mongoId.required().messages({
    'any.required': 'businessId is required'
  }),
  operation: Joi.string().valid(...USAGE_CATEGORIES).required().messages({
    'any.only': `operation must be one of: ${USAGE_CATEGORIES.join(', ')}`,
    'any.required': 'operation is required'
  }),
  amount: Joi.number().positive().optional().messages({
    'number.positive': 'Usage amount must be positive'
  })
});

const usageUpdateSchema = Joi.object(
  USAGE_CATEGORIES.reduce<Record<string, Joi.NumberSchema>>((acc, category) => {
    acc[category] = Joi.number().positive().optional();
    return acc;
  }, {})
).custom((value, helpers) => {
  if (!value || Object.keys(value).length === 0) {
    return helpers.error('any.invalid', { message: 'At least one usage metric must be supplied' });
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

/**
 * Subscription feature specific Joi schemas mirroring backend validation behaviour.
 */
export const subscriptionsFeatureSchemas = {
  tierChange: tierChangeSchema,
  downgradeRequest: downgradeRequestSchema,
  usageOperation: usageOperationSchema,
  usageUpdate: usageUpdateSchema
} as const;
