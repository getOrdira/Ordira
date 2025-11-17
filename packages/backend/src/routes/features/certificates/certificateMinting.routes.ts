// src/routes/features/certificates/certificateMinting.routes.ts
// Certificate minting routes using modular certificate minting controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateMintingController } from '../../../controllers/features/certificates/certificateMinting.controller';
import { safeUploadMiddleware, uploadRateLimit } from '../../../middleware/upload/upload.middleware';

const objectIdSchema = Joi.string().hex().length(24);

const attributeSchema = Joi.object({
  trait_type: Joi.string().trim().max(100).required(),
  value: Joi.alternatives(Joi.string().trim().max(200), Joi.number()).required(),
  display_type: Joi.string().trim().max(50).optional()
});

const metadataSchema = Joi.object({
  customMessage: Joi.string().trim().max(1000).optional(),
  attributes: Joi.array().items(attributeSchema).max(25).optional(),
  certificateLevel: Joi.string().valid('bronze', 'silver', 'gold', 'platinum').optional(),
  expirationDate: Joi.date().optional(),
  imageUrl: Joi.string().uri().optional(),
  templateId: Joi.string().trim().max(64).optional()
}).optional();

const deliveryOptionsSchema = Joi.object({
  scheduleDate: Joi.date().optional(),
  priority: Joi.string().valid('standard', 'priority', 'urgent').optional(),
  notifyRecipient: Joi.boolean().optional()
}).optional();

const web3OptionsSchema = Joi.object({
  autoTransfer: Joi.boolean().optional(),
  transferDelay: Joi.number().integer().min(0).max(604800).optional(),
  brandWallet: Joi.string().trim().max(128).optional(),
  requireCustomerConfirmation: Joi.boolean().optional(),
  gasOptimization: Joi.boolean().optional()
}).optional();

const createCertificateBodySchema = Joi.object({
  productId: objectIdSchema.required(),
  recipient: Joi.string().trim().max(320).required(),
  contactMethod: Joi.string().valid('email', 'sms', 'wallet').required(),
  certificateImage: Joi.any().optional(),
  metadata: metadataSchema,
  deliveryOptions: deliveryOptionsSchema,
  web3Options: web3OptionsSchema
});

const batchCreateBodySchema = Joi.object({
  certificates: Joi.array().items(createCertificateBodySchema).min(1).max(100).required()
});

const certificateIdParamsSchema = Joi.object({
  certificateId: objectIdSchema.required()
});

const strictTenantConfig = {
  ...RouteConfigs.tenant,
  rateLimit: 'strict' as const
};

const builder = createRouteBuilder(strictTenantConfig);

builder.post(
  '/create',
  createHandler(certificateMintingController, 'createCertificate'),
  {
    validateBody: createCertificateBodySchema
  }
);

builder.post(
  '/batch-create',
  createHandler(certificateMintingController, 'createBatchCertificates'),
  {
    validateBody: batchCreateBodySchema
  }
);

builder.put(
  '/:certificateId/image',
  createHandler(certificateMintingController, 'updateCertificateImage'),
  {
    validateParams: certificateIdParamsSchema,
    middleware: [uploadRateLimit, ...safeUploadMiddleware.certificate]
  }
);

builder.delete(
  '/:certificateId/assets',
  createHandler(certificateMintingController, 'deleteCertificateAssets'),
  {
    validateParams: certificateIdParamsSchema
  }
);

export default builder.getRouter();
