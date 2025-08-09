// src/validation/billing.validation.ts
import Joi from 'joi';

/**
 * Valid plan keys based on your plan system
 */
const VALID_PLANS = ['foundation', 'growth', 'premium', 'enterprise'] as const;

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
    })
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
    })
});

/**
 * All billing validation schemas
 */
export const billingValidationSchemas = {
  changePlan: changePlanSchema,
  checkoutSession: checkoutSessionSchema
};