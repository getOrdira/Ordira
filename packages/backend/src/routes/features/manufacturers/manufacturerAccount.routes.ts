// src/routes/features/manufacturers/manufacturerAccount.routes.ts
// Manufacturer account routes using modular manufacturer account controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerAccountController } from '../../../controllers/features/manufacturers/manufacturerAccount.controller';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const updateAccountBodySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  profilePictureUrl: Joi.string().uri().max(500).optional(),
  description: Joi.string().trim().max(2000).optional(),
  servicesOffered: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
  moq: Joi.number().integer().min(1).optional(),
  industry: Joi.string().trim().max(100).optional(),
  contactEmail: Joi.string().email().max(255).optional(),
  socialUrls: Joi.array().items(Joi.string().uri()).max(10).optional(),
  businessLicense: Joi.string().trim().max(100).optional(),
  certifications: Joi.array().items(Joi.object({
    name: Joi.string().trim().max(200).required(),
    issuer: Joi.string().trim().max(200).required(),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().optional()
  })).optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  employeeCount: Joi.number().integer().min(1).optional(),
  headquarters: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(500).optional()
  }).optional(),
  preferredContactMethod: Joi.string().valid('email', 'phone', 'message').optional(),
  timezone: Joi.string().trim().max(100).optional()
}).min(1);

const activityQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string().trim().max(100).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  severity: Joi.string().valid('low', 'medium', 'high').optional()
});

const notificationPreferencesBodySchema = Joi.object({
  emailNotifications: Joi.object({
    invitations: Joi.boolean().optional(),
    orderUpdates: Joi.boolean().optional(),
    systemUpdates: Joi.boolean().optional(),
    marketing: Joi.boolean().optional()
  }).optional(),
  pushNotifications: Joi.object({
    invitations: Joi.boolean().optional(),
    orderUpdates: Joi.boolean().optional(),
    systemUpdates: Joi.boolean().optional()
  }).optional(),
  smsNotifications: Joi.object({
    criticalUpdates: Joi.boolean().optional(),
    orderAlerts: Joi.boolean().optional()
  }).optional(),
  frequency: Joi.string().valid('immediate', 'daily', 'weekly').optional(),
  timezone: Joi.string().trim().max(100).optional()
});

const contactInfoBodySchema = Joi.object({
  contactEmail: Joi.string().email().max(255).required()
});

const servicesBodySchema = Joi.object({
  servicesOffered: Joi.array().items(Joi.string().trim().max(100)).max(20).required()
});

const moqBodySchema = Joi.object({
  moq: Joi.number().integer().min(1).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get manufacturer account
builder.get(
  '/:manufacturerId/account',
  createHandler(manufacturerAccountController, 'getManufacturerAccount'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Update manufacturer account
builder.put(
  '/:manufacturerId/account',
  createHandler(manufacturerAccountController, 'updateManufacturerAccount'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: updateAccountBodySchema
  }
);

// Soft delete account
builder.delete(
  '/:manufacturerId/account',
  createHandler(manufacturerAccountController, 'softDeleteAccount'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get account activity
builder.get(
  '/:manufacturerId/account/activity',
  createHandler(manufacturerAccountController, 'getAccountActivity'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: activityQuerySchema
  }
);

// Update notification preferences
builder.put(
  '/:manufacturerId/account/notifications',
  createHandler(manufacturerAccountController, 'updateNotificationPreferences'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: notificationPreferencesBodySchema
  }
);

// Get manufacturer stats
builder.get(
  '/:manufacturerId/account/stats',
  createHandler(manufacturerAccountController, 'getManufacturerStats'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Validate manufacturer ownership
builder.get(
  '/:manufacturerId/account/validate-ownership',
  createHandler(manufacturerAccountController, 'validateManufacturerOwnership'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Deactivate account
builder.post(
  '/:manufacturerId/account/deactivate',
  createHandler(manufacturerAccountController, 'deactivateAccount'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Reactivate account
builder.post(
  '/:manufacturerId/account/reactivate',
  createHandler(manufacturerAccountController, 'reactivateAccount'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get basic info (legacy support)
builder.get(
  '/:manufacturerId/account/basic-info',
  createHandler(manufacturerAccountController, 'getManufacturerBasicInfo'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Update contact info (legacy support)
builder.put(
  '/:manufacturerId/account/contact-info',
  createHandler(manufacturerAccountController, 'updateContactInfo'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: contactInfoBodySchema
  }
);

// Update services offered (legacy support)
builder.put(
  '/:manufacturerId/account/services',
  createHandler(manufacturerAccountController, 'updateServicesOffered'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: servicesBodySchema
  }
);

// Update minimum order quantity (legacy support)
builder.put(
  '/:manufacturerId/account/moq',
  createHandler(manufacturerAccountController, 'updateMinimumOrderQuantity'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: moqBodySchema
  }
);

export default builder.getRouter();