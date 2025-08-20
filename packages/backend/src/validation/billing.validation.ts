// src/validation/billing.validation.ts
import Joi from 'joi';

/**
 * Valid plan keys based on your plan system
 */
const VALID_PLANS = ['foundation', 'growth', 'premium', 'enterprise'] as const;

/**
 * Valid cancellation reasons
 */
const VALID_CANCELLATION_REASONS = [
  'too_expensive',
  'not_using_enough', 
  'missing_features',
  'poor_support',
  'switching_competitors',
  'business_changes',
  'technical_issues',
  'other'
] as const;

/**
 * Valid time periods for usage statistics
 */
const VALID_USAGE_PERIODS = ['7d', '30d', '90d', '1y'] as const;

/**
 * Schema for changing user plan
 */
export const changePlanSchema = Joi.object({
  plan: Joi.string()
    .valid(...VALID_PLANS)
    .required()
    .messages({
      'any.only': 'Plan must be one of: foundation, growth, premium, enterprise',
      'any.required': 'Plan is required'
    }),
  
  changeReason: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Change reason must be less than 200 characters'
    }),
  
  effectiveDate: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Effective date cannot be in the past'
    }),
  
  prorationPreference: Joi.string()
    .valid('immediate', 'next_cycle')
    .default('immediate')
    .optional()
});

/**
 * Schema for creating checkout session
 */
export const checkoutSessionSchema = Joi.object({
  plan: Joi.string()
    .valid(...VALID_PLANS)
    .required()
    .messages({
      'any.only': 'Plan must be one of: foundation, growth, premium, enterprise',
      'any.required': 'Plan is required'
    }),
  
  couponCode: Joi.string()
    .alphanum()
    .max(50)
    .optional()
    .messages({
      'string.alphanum': 'Coupon code must be alphanumeric',
      'string.max': 'Coupon code must be less than 50 characters'
    }),
  
  addons: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([])
    .optional()
    .messages({
      'array.max': 'Maximum 10 addons allowed'
    }),
  
  // Optional success/cancel URLs for custom redirect handling
  successUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Success URL must be a valid URL'
    }),
    
  cancelUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Cancel URL must be a valid URL'
    }),
  
  billingInterval: Joi.string()
    .valid('monthly', 'yearly')
    .default('monthly')
    .optional()
});

/**
 * Schema for updating payment method
 */
export const updatePaymentMethodSchema = Joi.object({
  paymentMethodId: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment method ID is required'
    }),
  
  billingAddress: Joi.object({
    line1: Joi.string()
      .max(100)
      .required()
      .messages({
        'any.required': 'Address line 1 is required',
        'string.max': 'Address line 1 must be less than 100 characters'
      }),
    
    line2: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Address line 2 must be less than 100 characters'
      }),
    
    city: Joi.string()
      .max(50)
      .required()
      .messages({
        'any.required': 'City is required',
        'string.max': 'City must be less than 50 characters'
      }),
    
    state: Joi.string()
      .max(50)
      .required()
      .messages({
        'any.required': 'State is required',
        'string.max': 'State must be less than 50 characters'
      }),
    
    postal_code: Joi.string()
      .max(20)
      .required()
      .messages({
        'any.required': 'Postal code is required',
        'string.max': 'Postal code must be less than 20 characters'
      }),
    
    country: Joi.string()
      .length(2)
      .uppercase()
      .required()
      .messages({
        'any.required': 'Country is required',
        'string.length': 'Country must be a 2-letter ISO code'
      })
  }).optional(),
  
  taxId: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Tax ID must be less than 50 characters'
    })
});

/**
 * Schema for subscription cancellation
 */
export const cancelSubscriptionSchema = Joi.object({
  reason: Joi.string()
    .valid(...VALID_CANCELLATION_REASONS)
    .optional()
    .messages({
      'any.only': `Reason must be one of: ${VALID_CANCELLATION_REASONS.join(', ')}`
    }),
  
  feedback: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Feedback must be less than 1000 characters'
    }),
  
  cancelImmediately: Joi.boolean()
    .default(false)
    .optional(),
  
  cancelAtPeriodEnd: Joi.boolean()
    .default(true)
    .optional(),
  
  whatWouldMakeYouStay: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Response must be less than 500 characters'
    }),
  
  missingFeatures: Joi.array()
    .items(Joi.string().max(100))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 missing features allowed'
    }),
  
  pricePoint: Joi.number()
    .min(0)
    .max(10000)
    .optional()
    .messages({
      'number.min': 'Price point must be positive',
      'number.max': 'Price point must be reasonable'
    }),
  
  acceptRetentionOffer: Joi.boolean()
    .default(false)
    .optional(),
  
  interestedInPause: Joi.boolean()
    .default(false)
    .optional(),
  
  deleteAllData: Joi.boolean()
    .default(false)
    .optional(),
  
  exportDataFirst: Joi.boolean()
    .default(true)
    .optional(),
  
  confirmCancellation: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Must confirm cancellation to proceed',
      'any.required': 'Must confirm cancellation to proceed'
    })
});

/**
 * Schema for usage statistics query parameters
 */
export const usageStatsQuerySchema = Joi.object({
  period: Joi.string()
    .valid(...VALID_USAGE_PERIODS)
    .default('30d')
    .optional()
    .messages({
      'any.only': `Period must be one of: ${VALID_USAGE_PERIODS.join(', ')}`
    }),
  
  includeProjections: Joi.boolean()
    .default(true)
    .optional(),
  
  includeRecommendations: Joi.boolean()
    .default(true)
    .optional(),
  
  detailedBreakdown: Joi.boolean()
    .default(false)
    .optional()
});

/**
 * All billing validation schemas
 */
export const billingValidationSchemas = {
  changePlan: changePlanSchema,
  checkoutSession: checkoutSessionSchema,
  updatePaymentMethod: updatePaymentMethodSchema,
  cancelSubscription: cancelSubscriptionSchema,
  usageStatsQuery: usageStatsQuerySchema
};