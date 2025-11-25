// src/routes/features/certificates/certificateData.routes.ts
// Certificate data routes using modular certificate data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateDataController } from '../../../controllers/features/certificates/certificateData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const listCertificatesQuerySchema = Joi.object({
  status: Joi.string().trim().max(50).optional(),
  transferStatus: Joi.string().valid('relayer', 'brand', 'failed').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  productId: objectIdSchema.optional(),
  recipient: Joi.string().trim().max(320).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().trim().max(64).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  ownershipType: Joi.string().valid('relayer', 'brand', 'all').optional(),
  hasWeb3: Joi.boolean().optional()
})
  .with('dateFrom', 'dateTo')
  .with('dateTo', 'dateFrom');

const certificateIdParamsSchema = Joi.object({
  certificateId: objectIdSchema.required()
});

const updateCertificateBodySchema = Joi.object({
  status: Joi.string()
    .valid('revoked', 'minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed')
    .optional(),
  metadata: Joi.object().optional(),
  transferScheduled: Joi.boolean().optional(),
  nextTransferAttempt: Joi.date().optional(),
  transferAttempts: Joi.number().integer().min(0).optional(),
  transferFailed: Joi.boolean().optional(),
  transferredToBrand: Joi.boolean().optional(),
  transferredAt: Joi.date().optional(),
  revoked: Joi.boolean().optional(),
  revokedAt: Joi.date().optional(),
  revokedReason: Joi.string().trim().max(500).optional()
}).min(1);

const updateCertificateStatusBodySchema = Joi.object({
  status: Joi.string()
    .valid('revoked', 'minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed')
    .required(),
  additionalData: Joi.object().optional()
});

const productParamsSchema = Joi.object({
  productId: objectIdSchema.required()
});

const recipientQuerySchema = Joi.object({
  recipient: Joi.string().trim().max(320).required(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const batchQuerySchema = Joi.object({
  batchId: Joi.string().trim().max(64).required()
});

const searchQuerySchema = Joi.object({
  searchTerm: Joi.string().trim().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const bulkUpdateBodySchema = Joi.object({
  certificateIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  updates: Joi.object().min(1).required().unknown(true)
});

const dateRangeQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(500).optional()
}).with('endDate', 'startDate');

const limitedQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/',
  createHandler(certificateDataController, 'listCertificates'),
  {
    validateQuery: listCertificatesQuerySchema
  }
);

builder.get(
  '/count-by-status',
  createHandler(certificateDataController, 'getCertificateCountByStatus')
);

builder.get(
  '/date-range',
  createHandler(certificateDataController, 'getCertificatesInDateRange'),
  {
    validateQuery: dateRangeQuerySchema
  }
);

builder.get(
  '/failed-transfers',
  createHandler(certificateDataController, 'getFailedTransferCertificates'),
  {
    validateQuery: limitedQuerySchema
  }
);

builder.get(
  '/pending-transfers',
  createHandler(certificateDataController, 'getPendingTransferCertificates'),
  {
    validateQuery: limitedQuerySchema
  }
);

builder.get(
  '/product/:productId',
  createHandler(certificateDataController, 'getCertificatesByProduct'),
  {
    validateParams: productParamsSchema,
    validateQuery: paginationQuerySchema
  }
);

builder.get(
  '/recipient',
  createHandler(certificateDataController, 'getCertificatesByRecipient'),
  {
    validateQuery: recipientQuerySchema
  }
);

builder.get(
  '/batch',
  createHandler(certificateDataController, 'getCertificatesByBatch'),
  {
    validateQuery: batchQuerySchema
  }
);

builder.get(
  '/search',
  createHandler(certificateDataController, 'searchCertificates'),
  {
    validateQuery: searchQuerySchema
  }
);

builder.put(
  '/bulk-update',
  createHandler(certificateDataController, 'bulkUpdateCertificates'),
  {
    validateBody: bulkUpdateBodySchema
  }
);

builder.get(
  '/:certificateId',
  createHandler(certificateDataController, 'getCertificate'),
  {
    validateParams: certificateIdParamsSchema
  }
);

builder.put(
  '/:certificateId',
  createHandler(certificateDataController, 'updateCertificate'),
  {
    validateParams: certificateIdParamsSchema,
    validateBody: updateCertificateBodySchema
  }
);

builder.put(
  '/:certificateId/status',
  createHandler(certificateDataController, 'updateCertificateStatus'),
  {
    validateParams: certificateIdParamsSchema,
    validateBody: updateCertificateStatusBodySchema
  }
);

builder.delete(
  '/:certificateId',
  createHandler(certificateDataController, 'deleteCertificate'),
  {
    validateParams: certificateIdParamsSchema
  }
);

export default builder.getRouter();
