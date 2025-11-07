// src/lib/validation/schemas/features/supplyChain.ts
// Frontend validation schemas for supply chain deployment, events, and analytics.

import Joi from 'joi';

const SUPPLY_CHAIN_EVENT_TYPES = ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered'] as const;

const deploymentInputSchema = Joi.object({
  businessId: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Business ID is required and must be a non-empty string',
    'string.max': 'Business ID must be 100 characters or less',
    'any.required': 'Business ID is required and must be a non-empty string'
  }),
  manufacturerName: Joi.string().trim().max(200).required().messages({
    'string.empty': 'Manufacturer name is required and must be a non-empty string',
    'string.max': 'Manufacturer name must be 200 characters or less',
    'any.required': 'Manufacturer name is required and must be a non-empty string'
  })
});

const endpointSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Endpoint name is required and must be a non-empty string',
    'string.max': 'Endpoint name must be 100 characters or less'
  }),
  eventType: Joi.string().valid(...SUPPLY_CHAIN_EVENT_TYPES).required().messages({
    'any.only': `Event type must be one of: ${SUPPLY_CHAIN_EVENT_TYPES.join(', ')}`
  }),
  location: Joi.string().trim().max(200).required().messages({
    'string.empty': 'Location is required and must be a non-empty string',
    'string.max': 'Location must be 200 characters or less'
  })
});

const productDataSchema = Joi.object({
  productId: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Product ID must contain only alphanumeric characters, hyphens, and underscores',
      'string.max': 'Product ID must be 100 characters or less',
      'any.required': 'Product ID is required and must be a non-empty string'
    }),
  name: Joi.string().trim().max(200).required().messages({
    'string.empty': 'Product name is required and must be a non-empty string',
    'string.max': 'Product name must be 200 characters or less'
  }),
  description: Joi.string().trim().max(1000).optional().messages({
    'string.max': 'Description must be 1000 characters or less'
  })
});

const eventDataSchema = Joi.object({
  endpointId: Joi.number().integer().min(0).required().messages({
    'number.base': 'Endpoint ID must be a non-negative integer',
    'number.min': 'Endpoint ID must be a non-negative integer',
    'any.required': 'Endpoint ID must be a non-negative integer'
  }),
  productId: Joi.string().trim().max(100).required().messages({
    'string.max': 'Product ID must be 100 characters or less',
    'any.required': 'Product ID is required and must be a non-empty string'
  }),
  eventType: Joi.string().trim().max(50).required().messages({
    'string.max': 'Event type must be 50 characters or less',
    'any.required': 'Event type is required and must be a non-empty string'
  }),
  location: Joi.string().trim().max(200).required().messages({
    'string.max': 'Location must be 200 characters or less',
    'any.required': 'Location is required and must be a non-empty string'
  }),
  details: Joi.string().trim().max(1000).optional().messages({
    'string.max': 'Details must be 1000 characters or less'
  })
});

const contractAddressSchema = Joi.string()
  .trim()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .messages({
    'string.pattern.base': 'Contract address must be a valid Ethereum address (0x followed by 40 hex characters)',
    'any.required': 'Contract address is required and must be a string'
  });

const supplyChainBusinessIdSchema = Joi.string()
  .trim()
  .max(100)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Business ID must contain only alphanumeric characters, hyphens, and underscores',
    'string.max': 'Business ID must be 100 characters or less',
    'any.required': 'Business ID is required and must be a string'
  });

const qrCodeDataSchema = Joi.object({
  type: Joi.string().trim().required(),
  productId: Joi.string().trim().when('type', {
    is: 'supply_chain_tracking',
    then: Joi.required().messages({ 'any.required': 'Product ID is required for supply chain tracking' }),
    otherwise: Joi.optional()
  }),
  manufacturerId: Joi.string().trim().when('type', {
    is: 'supply_chain_tracking',
    then: Joi.required().messages({ 'any.required': 'Manufacturer ID is required for supply chain tracking' }),
    otherwise: Joi.optional()
  }),
  certificateId: Joi.string().trim().when('type', {
    is: 'certificate_verification',
    then: Joi.required().messages({ 'any.required': 'Certificate ID is required for certificate verification' }),
    otherwise: Joi.optional()
  }),
  tokenId: Joi.string().trim().when('type', {
    is: 'certificate_verification',
    then: Joi.required().messages({ 'any.required': 'Token ID is required for certificate verification' }),
    otherwise: Joi.optional()
  }),
  proposalId: Joi.string().trim().when('type', {
    is: 'voting',
    then: Joi.required().messages({ 'any.required': 'Proposal ID is required for voting' }),
    otherwise: Joi.optional()
  }),
  voterEmail: Joi.string().trim().email({ tlds: { allow: false } }).when('type', {
    is: 'voting',
    then: Joi.required().messages({ 'any.required': 'Voter email is required for voting' }),
    otherwise: Joi.optional()
  }),
  timestamp: Joi.alternatives(Joi.date().iso(), Joi.number().integer()).optional()
}).custom((value, helpers) => {
  if (value.timestamp !== undefined) {
    const timestamp = value.timestamp;
    const isValidDate =
      timestamp instanceof Date ||
      (typeof timestamp === 'string' && !Number.isNaN(Date.parse(timestamp))) ||
      (typeof timestamp === 'number' && Number.isFinite(timestamp));

    if (!isValidDate) {
      return helpers.error('any.invalid', { message: 'Invalid timestamp format' });
    }
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

const gasLimitSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive(),
    Joi.string()
      .trim()
      .pattern(/^\d+$/)
      .custom((value, helpers) => {
        try {
          const asBigInt = BigInt(value);
          if (asBigInt <= BigInt(0)) {
            return helpers.error('any.invalid', { message: 'Gas limit must be greater than 0' });
          }
          if (asBigInt > BigInt(30_000_000)) {
            return helpers.error('any.invalid', { message: 'Gas limit exceeds maximum allowed (30,000,000)' });
          }
          return value;
        } catch {
          return helpers.error('any.invalid', { message: 'Gas limit must be a number, string, or BigInt' });
        }
      }),
    Joi.string()
      .trim()
      .pattern(/^0x[a-fA-F0-9]+$/)
      .custom((value, helpers) => {
        try {
          const asBigInt = BigInt(value);
          if (asBigInt <= BigInt(0)) {
            return helpers.error('any.invalid', { message: 'Gas limit must be greater than 0' });
          }
          if (asBigInt > BigInt(30_000_000)) {
            return helpers.error('any.invalid', { message: 'Gas limit exceeds maximum allowed (30,000,000)' });
          }
          return value;
        } catch {
          return helpers.error('any.invalid', { message: 'Gas limit must be a number, string, or BigInt' });
        }
      })
  )
  .optional()
  .messages({
    'any.invalid': '{{#message}}'
  });

const transactionHashSchema = Joi.string()
  .trim()
  .pattern(/^0x[a-fA-F0-9]{64}$/)
  .required()
  .messages({
    'string.pattern.base': 'Transaction hash must be a valid Ethereum transaction hash (0x followed by 64 hex characters)',
    'any.required': 'Transaction hash is required and must be a string'
  });

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.integer': 'Page must be a positive integer',
    'number.min': 'Page must be a positive integer'
  }),
  limit: Joi.number().integer().min(1).max(1000).optional().messages({
    'number.integer': 'Limit must be a positive integer between 1 and 1000',
    'number.min': 'Limit must be a positive integer between 1 and 1000',
    'number.max': 'Limit must be a positive integer between 1 and 1000'
  }),
  offset: Joi.number().integer().min(0).optional().messages({
    'number.integer': 'Offset must be a non-negative integer',
    'number.min': 'Offset must be a non-negative integer'
  })
});

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
}).custom((value, helpers) => {
  const { startDate, endDate } = value;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return helpers.error('any.invalid', { message: 'Start date must be before end date' });
    }

    const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 365) {
      return helpers.error('any.invalid', { message: 'Date range cannot exceed 365 days' });
    }
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

/**
 * Supply chain feature specific Joi schemas mirroring backend validation behaviour.
 */
export const supplyChainFeatureSchemas = {
  deploymentInput: deploymentInputSchema,
  endpoint: endpointSchema,
  productData: productDataSchema,
  eventData: eventDataSchema,
  contractAddress: contractAddressSchema,
  businessId: supplyChainBusinessIdSchema,
  qrCodeData: qrCodeDataSchema,
  gasLimit: gasLimitSchema,
  transactionHash: transactionHashSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema
} as const;
