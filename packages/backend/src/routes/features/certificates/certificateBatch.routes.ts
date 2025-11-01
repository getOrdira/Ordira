// src/routes/features/certificates/certificateBatch.routes.ts
// Certificate batch routes using modular certificate batch controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateBatchController } from '../../../controllers/features/certificates/certificateBatch.controller';

const objectIdSchema = Joi.string().hex().length(24);

const batchIdParamsSchema = Joi.object({
  batchId: Joi.string().trim().max(64).required()
});

const batchOptionsSchema = Joi.object({
  delayBetweenCerts: Joi.number().integer().min(0).max(600).optional(),
  maxConcurrent: Joi.number().integer().min(1).max(100).optional(),
  continueOnError: Joi.boolean().optional(),
  batchTransfer: Joi.boolean().optional(),
  transferBatchSize: Joi.number().integer().min(1).max(500).optional(),
  gasOptimization: Joi.boolean().optional()
}).optional();

const recipientSchema = Joi.object({
  address: Joi.string().trim().max(320).required(),
  contactMethod: Joi.string().valid('email', 'sms', 'wallet').required(),
  customData: Joi.object().optional().unknown(true),
  certificateImage: Joi.any().optional()
});

const createBatchJobBodySchema = Joi.object({
  productId: objectIdSchema.required(),
  recipients: Joi.array().items(recipientSchema).min(1).max(500).required(),
  batchOptions: batchOptionsSchema,
  planLevel: Joi.string().trim().max(50).optional(),
  hasWeb3: Joi.boolean().optional(),
  shouldAutoTransfer: Joi.boolean().optional(),
  transferSettings: Joi.object().optional().unknown(true),
  jobMetadata: Joi.object({
    webhookUrl: Joi.string().uri().optional(),
    description: Joi.string().trim().max(256).optional()
  }).optional()
});

const batchLimitsQuerySchema = Joi.object({
  plan: Joi.string().trim().max(50).required()
});

const calculateDurationBodySchema = Joi.object({
  recipientCount: Joi.number().integer().min(1).max(5000).required(),
  batchOptions: Joi.object({
    delayBetweenCerts: Joi.number().integer().min(0).max(600).optional(),
    maxConcurrent: Joi.number().integer().min(1).max(100).optional()
  }).optional(),
  hasWeb3: Joi.boolean().required()
});

const priorityQuerySchema = Joi.object({
  plan: Joi.string().trim().max(50).default('foundation')
});

const strictTenantConfig = {
  ...RouteConfigs.tenant,
  rateLimit: 'strict' as const
};

const builder = createRouteBuilder(strictTenantConfig);

builder.post(
  '/create-job',
  createHandler(certificateBatchController, 'createBatchCertificateJob'),
  {
    validateBody: createBatchJobBodySchema
  }
);

builder.get(
  '/:batchId/progress',
  createHandler(certificateBatchController, 'getBatchProgress'),
  {
    validateParams: batchIdParamsSchema
  }
);

builder.delete(
  '/:batchId/cancel',
  createHandler(certificateBatchController, 'cancelBatchJob'),
  {
    validateParams: batchIdParamsSchema
  }
);

builder.post(
  '/:batchId/retry-failed',
  createHandler(certificateBatchController, 'retryFailedBatchItems'),
  {
    validateParams: batchIdParamsSchema
  }
);

builder.get(
  '/active-jobs',
  createHandler(certificateBatchController, 'getActiveBatchJobs')
);

builder.get(
  '/statistics',
  createHandler(certificateBatchController, 'getBatchJobStatistics')
);

builder.get(
  '/limits',
  createHandler(certificateBatchController, 'getBatchLimits'),
  {
    validateQuery: batchLimitsQuerySchema
  }
);

builder.post(
  '/calculate-duration',
  createHandler(certificateBatchController, 'calculateBatchDuration'),
  {
    validateBody: calculateDurationBodySchema
  }
);

builder.get(
  '/priority',
  createHandler(certificateBatchController, 'determineBatchPriority'),
  {
    validateQuery: priorityQuerySchema
  }
);

export default builder.getRouter();
