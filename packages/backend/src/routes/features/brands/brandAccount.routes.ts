// src/routes/features/brands/brandAccount.routes.ts
// Brand account routes using modular brand account controller

import Joi from 'joi';
import { RequestHandler } from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandAccountController } from '../../../controllers/features/brands/brandAccount.controller';
import { uploadMiddleware } from '../../../middleware/deprecated/upload.middleware';

const builder = createRouteBuilder(RouteConfigs.tenant);

const profileQuerySchema = Joi.object({
  includeAnalytics: Joi.boolean().optional(),
  includeMetadata: Joi.boolean().optional()
});

const updateBrandAccountSchema = Joi.object({
  profilePictureUrl: Joi.string().uri().optional(),
  description: Joi.string().max(2000).optional(),
  industry: Joi.string().max(100).optional(),
  contactEmail: Joi.string().email().optional(),
  socialUrls: Joi.array().items(Joi.string().uri()).max(10).optional(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  headquarters: Joi.object({
    country: Joi.string().max(100).optional(),
    city: Joi.string().max(100).optional(),
    address: Joi.string().max(200).optional(),
    timezone: Joi.string().max(50).optional()
  }).optional(),
  businessInformation: Joi.object({
    establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
    employeeCount: Joi.string().max(50).optional(),
    annualRevenue: Joi.string().max(50).optional(),
    businessLicense: Joi.string().max(100).optional(),
    certifications: Joi.array().items(Joi.string().max(100)).max(20).optional()
  }).optional(),
  communicationPreferences: Joi.object({
    preferredMethod: Joi.string().valid('email', 'phone', 'sms').optional(),
    responseTime: Joi.string().max(50).optional(),
    languages: Joi.array().items(Joi.string().max(10)).max(5).optional()
  }).optional(),
  marketingPreferences: Joi.object({
    allowEmails: Joi.boolean().optional(),
    allowSms: Joi.boolean().optional(),
    allowPushNotifications: Joi.boolean().optional()
  }).optional()
});

const submitVerificationSchema = Joi.object({
  businessLicense: Joi.string().optional(),
  taxId: Joi.string().optional(),
  businessRegistration: Joi.string().optional(),
  bankStatement: Joi.string().optional(),
  identityDocument: Joi.string().optional(),
  additionalDocuments: Joi.array().items(Joi.string()).optional()
}).min(1);

const deactivateAccountSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  feedback: Joi.string().max(2000).optional(),
  deleteData: Joi.boolean().optional()
});

builder.get(
  '/',
  createHandler(brandAccountController, 'getProfile'),
  {
    validateQuery: profileQuerySchema
  }
);

builder.put(
  '/',
  createHandler(brandAccountController, 'updateProfile'),
  {
    validateBody: updateBrandAccountSchema
  }
);

builder.post(
  '/picture',
  createHandler(brandAccountController, 'uploadProfilePicture'),
  {
    middleware: uploadMiddleware.singleImage as unknown as RequestHandler[]
  }
);

builder.delete(
  '/picture',
  createHandler(brandAccountController, 'removeProfilePicture')
);

builder.post(
  '/verification',
  createHandler(brandAccountController, 'submitVerification'),
  {
    validateBody: submitVerificationSchema
  }
);

builder.get(
  '/verification',
  createHandler(brandAccountController, 'getVerificationStatus')
);

builder.get(
  '/completeness',
  createHandler(brandAccountController, 'getProfileCompleteness')
);

builder.get(
  '/recommendations',
  createHandler(brandAccountController, 'getProfileRecommendations')
);

builder.post(
  '/deactivate',
  createHandler(brandAccountController, 'deactivateAccount'),
  {
    validateBody: deactivateAccountSchema
  }
);

builder.post(
  '/reactivate',
  createHandler(brandAccountController, 'reactivateAccount')
);

export default builder.getRouter();

