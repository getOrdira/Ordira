// src/lib/validation/schemas/features/blockchain.ts
// Frontend validation schemas for blockchain contract utility flows.

import Joi from 'joi';

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TRANSACTION_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

const ethereumAddressSchema = Joi.string()
  .trim()
  .pattern(ETHEREUM_ADDRESS_REGEX)
  .messages({
    'string.pattern.base': '{{#label}} must be a valid Ethereum address',
    'string.empty': '{{#label}} is required'
  });

const transactionHashSchema = Joi.string()
  .trim()
  .pattern(TRANSACTION_HASH_REGEX)
  .messages({
    'string.pattern.base': '{{#label}} must be a valid transaction hash',
    'string.empty': '{{#label}} is required'
  });

const abiSchema = Joi.array()
  .items(Joi.any())
  .min(1)
  .messages({
    'array.min': 'ABI must contain at least one entry',
    'array.base': 'ABI must be an array'
  });

const paramsSchema = Joi.array().items(Joi.any());

const contractCallSchema = Joi.object({
  contractAddress: ethereumAddressSchema.label('contractAddress').required(),
  abi: abiSchema.required(),
  methodName: Joi.string()
    .trim()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.empty': 'methodName is required',
      'string.min': 'methodName must contain at least 1 character',
      'string.max': 'methodName cannot exceed 128 characters'
    }),
  params: paramsSchema.optional()
});

const addressesBodySchema = Joi.object({
  addresses: Joi.array()
    .items(ethereumAddressSchema.label('addresses[]'))
    .min(1)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one address is required',
      'array.unique': 'Addresses must be unique',
      'array.base': 'addresses must be an array'
    })
});

const tokenBalanceQuerySchema = Joi.object({
  address: ethereumAddressSchema.label('address').required()
});

const transactionReceiptQuerySchema = Joi.object({
  txHash: transactionHashSchema.label('txHash').required(),
  maxRetries: Joi.number()
    .integer()
    .min(0)
    .max(10)
    .optional()
    .messages({
      'number.integer': 'maxRetries must be an integer',
      'number.min': 'maxRetries must be between 0 and 10',
      'number.max': 'maxRetries must be between 0 and 10'
    })
});

const transactionStatusQuerySchema = Joi.object({
  txHash: transactionHashSchema.label('txHash').required()
});

const waitForTransactionQuerySchema = Joi.object({
  txHash: transactionHashSchema.label('txHash').required(),
  confirmations: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
    .messages({
      'number.min': 'confirmations must be at least 1',
      'number.max': 'confirmations cannot exceed 12'
    }),
  timeout: Joi.number()
    .integer()
    .min(1_000)
    .max(900_000)
    .optional()
    .messages({
      'number.min': 'timeout must be at least 1,000 milliseconds',
      'number.max': 'timeout cannot exceed 900,000 milliseconds'
    })
});

const gasPriceQuerySchema = Joi.object({
  priority: Joi.string()
    .valid('slow', 'standard', 'fast')
    .optional()
    .messages({
      'any.only': "priority must be one of 'slow', 'standard', or 'fast'"
    })
});

const gasEstimateBodySchema = Joi.object({
  contractAddress: ethereumAddressSchema.label('contractAddress').required(),
  abi: abiSchema.required(),
  methodName: Joi.string()
    .trim()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.empty': 'methodName is required',
      'string.min': 'methodName must contain at least 1 character',
      'string.max': 'methodName cannot exceed 128 characters'
    }),
  params: paramsSchema.optional()
});

const batchCallBodySchema = Joi.object({
  calls: Joi.array()
    .items(contractCallSchema)
    .min(1)
    .required()
    .messages({
      'array.base': 'calls must be an array of contract call descriptors',
      'array.min': 'At least one contract call is required'
    })
});

const integrationTransactionQuerySchema = Joi.object({
  txHash: transactionHashSchema.label('txHash').required()
});

const integrationBalanceQuerySchema = Joi.object({
  address: ethereumAddressSchema.label('address').required()
});

/**
 * Blockchain feature specific Joi schemas mirroring backend validation behaviour.
 */
export const blockchainFeatureSchemas = {
  tokenBalanceQuery: tokenBalanceQuerySchema,
  multipleTokenBalancesBody: addressesBodySchema,
  ethBalanceQuery: tokenBalanceQuerySchema,
  transactionReceiptQuery: transactionReceiptQuerySchema,
  transactionStatusQuery: transactionStatusQuerySchema,
  waitForTransactionQuery: waitForTransactionQuerySchema,
  gasPriceQuery: gasPriceQuerySchema,
  gasEstimateBody: gasEstimateBodySchema,
  contractCheckQuery: tokenBalanceQuerySchema,
  batchCallBody: batchCallBodySchema,
  integrationTransactionQuery: integrationTransactionQuerySchema,
  integrationBalanceQuery: integrationBalanceQuerySchema
} as const;
