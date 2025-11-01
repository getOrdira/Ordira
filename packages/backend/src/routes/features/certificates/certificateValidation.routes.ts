// src/routes/features/certificates/certificateValidation.routes.ts
// Certificate validation routes using modular certificate validation controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateValidationController } from '../../../controllers/features/certificates/certificateValidation.controller';

const objectIdSchema = Joi.string().hex().length(24);

const certificateIdParamsSchema = Joi.object({
  certificateId: objectIdSchema.required()
});

const checkDuplicateBodySchema = Joi.object({
  productId: objectIdSchema.required(),
  recipient: Joi.string().trim().max(320).required()
});

const validateProductOwnershipBodySchema = Joi.object({
  productId: objectIdSchema.required()
});

const validateTransferParametersBodySchema = Joi.object({
  contractAddress: Joi.string().trim().max(100).required(),
  tokenId: Joi.string().trim().max(100).required(),
  brandWallet: Joi.string().trim().max(100).required()
});

const validateWalletAddressBodySchema = Joi.object({
  address: Joi.string().trim().max(100).required()
});

const relayerWalletQuerySchema = Joi.object({
  checkConfiguration: Joi.boolean().optional()
});

const validateMetadataBodySchema = Joi.object({
  metadata: Joi.object().unknown(true).required()
});

const batchInputSchema = Joi.object({
  productId: objectIdSchema.required(),
  recipient: Joi.string().trim().max(320).required(),
  contactMethod: Joi.string().valid('email', 'sms', 'wallet').required(),
  metadata: Joi.object().unknown(true).optional()
});

const validateBatchInputsBodySchema = Joi.object({
  inputs: Joi.array().items(batchInputSchema).min(1).max(500).required()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.post(
  '/check-duplicate',
  createHandler(certificateValidationController, 'checkDuplicateCertificate'),
  {
    validateBody: checkDuplicateBodySchema
  }
);

builder.post(
  '/validate-product-ownership',
  createHandler(certificateValidationController, 'validateProductOwnership'),
  {
    validateBody: validateProductOwnershipBodySchema
  }
);

builder.post(
  '/validate-transfer-parameters',
  createHandler(certificateValidationController, 'validateTransferParameters'),
  {
    validateBody: validateTransferParametersBodySchema
  }
);

builder.post(
  '/validate-wallet-address',
  createHandler(certificateValidationController, 'validateWalletAddress'),
  {
    validateBody: validateWalletAddressBodySchema
  }
);

builder.get(
  '/validate-relayer-wallet',
  createHandler(certificateValidationController, 'validateRelayerWallet'),
  {
    validateQuery: relayerWalletQuerySchema
  }
);

builder.post(
  '/validate-metadata',
  createHandler(certificateValidationController, 'validateCertificateMetadata'),
  {
    validateBody: validateMetadataBodySchema
  }
);

builder.post(
  '/validate-batch-inputs',
  createHandler(certificateValidationController, 'validateBatchInputs'),
  {
    validateBody: validateBatchInputsBodySchema
  }
);

builder.get(
  '/:certificateId/validate-ownership',
  createHandler(certificateValidationController, 'validateCertificateOwnership'),
  {
    validateParams: certificateIdParamsSchema
  }
);

builder.get(
  '/:certificateId/validate-transferable',
  createHandler(certificateValidationController, 'validateCertificateTransferable'),
  {
    validateParams: certificateIdParamsSchema
  }
);

export default builder.getRouter();
