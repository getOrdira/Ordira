// src/validation/emailGating.validation.ts
import Joi from 'joi';

export const emailGatingSettingsSchema = Joi.object({
  enabled: Joi.boolean(),
  mode: Joi.string().valid('whitelist', 'blacklist', 'disabled'),
  allowUnregistered: Joi.boolean(),
  requireApproval: Joi.boolean(),
  autoSyncEnabled: Joi.boolean(),
  syncSources: Joi.array().items(Joi.string().valid('shopify', 'woocommerce', 'csv', 'api')),
  welcomeEmailEnabled: Joi.boolean(),
  accessDeniedMessage: Joi.string().max(500).allow('')
});

export const customersImportSchema = Joi.object({
  customers: Joi.array().items(
    Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().max(50).allow(''),
      lastName: Joi.string().max(50).allow(''),
      tags: Joi.array().items(Joi.string().max(30)),
      vipStatus: Joi.boolean(),
      externalCustomerId: Joi.string().max(100).allow('')
    })
  ).min(1).max(1000).required(),
  source: Joi.string().valid('manual', 'api_import').default('manual')
});

export const csvImportSchema = Joi.object({
  csvData: Joi.string().min(1).max(10000000).required() // Max 10MB of text
});

export const customerListQuerySchema = Joi.object({
  source: Joi.string().valid('manual', 'shopify', 'woocommerce', 'csv_import', 'api_import'),
  hasAccess: Joi.boolean(),
  isActive: Joi.boolean(),
  vipStatus: Joi.boolean(),
  engagementLevel: Joi.string().valid('none', 'low', 'medium', 'high'),
  tags: Joi.array().items(Joi.string()),
  search: Joi.string().min(2).max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'lastVotingAccess', 'totalVotes', 'email').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const customerAccessParamsSchema = Joi.object({
  customerId: Joi.string().hex().length(24).required(),
  revoke: Joi.object({
    reason: Joi.string().max(500).allow('')
  })
});

export const bulkAccessSchema = Joi.object({
  customerIds: Joi.array().items(Joi.string().hex().length(24)).min(1).max(100).required(),
  hasAccess: Joi.boolean().required(),
  reason: Joi.string().max(500).allow('')
});

export const emailCheckParamsSchema = Joi.object({
  email: Joi.string().email().required()
});