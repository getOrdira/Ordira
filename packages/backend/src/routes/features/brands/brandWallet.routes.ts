// src/routes/features/brands/brandWallet.routes.ts
// Brand wallet routes using modular brand wallet controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandWalletController } from '../../../controllers/features/brands/brandWallet.controller';

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.post(
  '/validate',
  createHandler(brandWalletController, 'validateWalletAddress'),
  {
    validateBody: Joi.object({
      address: Joi.string().trim().required(),
      options: Joi.object({
        checkBalance: Joi.boolean().optional(),
        validateFormat: Joi.boolean().optional()
      }).optional()
    })
  }
);

builder.post(
  '/verify',
  createHandler(brandWalletController, 'verifyWalletOwnership'),
  {
    validateBody: Joi.object({
      walletAddress: Joi.string().trim().required(),
      signature: Joi.string().trim().required(),
      message: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/status',
  createHandler(brandWalletController, 'getWalletVerificationStatus')
);

builder.put(
  '/token-discounts',
  createHandler(brandWalletController, 'updateTokenDiscounts'),
  {
    validateBody: Joi.object({
      walletAddress: Joi.string().trim().required(),
      discounts: Joi.array().items(
        Joi.object({
          tokenAddress: Joi.string().trim().required(),
          discountPercentage: Joi.number().min(0).max(100).required(),
          minAmount: Joi.number().min(0).optional()
        })
      ).min(1).required()
    })
  }
);

builder.put(
  '/certificate',
  createHandler(brandWalletController, 'updateCertificateWallet'),
  {
    validateBody: Joi.object({
      walletAddress: Joi.string().trim().required(),
      isDefault: Joi.boolean().optional(),
      metadata: Joi.object().optional()
    })
  }
);

builder.post(
  '/token-discounts/batch',
  createHandler(brandWalletController, 'batchUpdateTokenDiscounts'),
  {
    validateBody: Joi.object({
      businessIds: Joi.array().items(Joi.string().trim()).min(1).required(),
      discounts: Joi.array().items(
        Joi.object({
          tokenAddress: Joi.string().trim().required(),
          discountPercentage: Joi.number().min(0).max(100).required(),
          minAmount: Joi.number().min(0).optional()
        })
      ).min(1).required()
    })
  }
);

builder.post(
  '/change',
  createHandler(brandWalletController, 'handleWalletAddressChange'),
  {
    validateBody: Joi.object({
      newWallet: Joi.string().trim().required(),
      oldWallet: Joi.string().trim().required(),
      signature: Joi.string().trim().required()
    })
  }
);

builder.post(
  '/verification-message',
  createHandler(brandWalletController, 'generateVerificationMessage'),
  {
    validateBody: Joi.object({
      timestamp: Joi.number().integer().optional()
    })
  }
);

builder.get(
  '/statistics',
  createHandler(brandWalletController, 'getWalletStatistics')
);

export default builder.getRouter();
