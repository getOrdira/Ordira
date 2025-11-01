// src/routes/features/brands/brandVerification.routes.ts
// Brand verification routes using modular brand verification controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandVerificationController } from '../../../controllers/features/brands/brandVerification.controller';

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.get(
  '/status',
  createHandler(brandVerificationController, 'getVerificationStatus')
);

builder.post(
  '/submit',
  createHandler(brandVerificationController, 'submitVerification'),
  {
    validateBody: Joi.object({
      businessLicense: Joi.string().optional(),
      taxId: Joi.string().optional(),
      businessRegistration: Joi.string().optional(),
      bankStatement: Joi.string().optional(),
      identityDocument: Joi.string().optional(),
      additionalDocuments: Joi.array().items(Joi.string().trim()).optional()
    })
  }
);

builder.get(
  '/status/detail',
  createHandler(brandVerificationController, 'getDetailedVerificationStatus')
);

builder.get(
  '/history',
  createHandler(brandVerificationController, 'getVerificationHistory')
);

builder.post(
  '/email/verify',
  createHandler(brandVerificationController, 'verifyEmail'),
  {
    validateBody: Joi.object({
      verificationCode: Joi.string().trim().required()
    })
  }
);

builder.post(
  '/email/send',
  createHandler(brandVerificationController, 'sendEmailVerification')
);

builder.patch(
  '/business/status',
  createHandler(brandVerificationController, 'updateBusinessVerificationStatus'),
  {
    validateBody: Joi.object({
      status: Joi.string().valid('pending', 'approved', 'rejected').required(),
      notes: Joi.string().max(1000).optional(),
      reviewerId: Joi.string().trim().optional()
    })
  }
);

builder.get(
  '/statistics',
  createHandler(brandVerificationController, 'getVerificationStatistics'),
  {
    validateQuery: Joi.object({
      timeframe: Joi.string().trim().optional(),
      status: Joi.string().trim().optional()
    })
  }
);

export default builder.getRouter();
