// src/routes/features/brands/brandCustomerAccess.routes.ts
// Brand customer access routes using modular brand customer access controller

import Joi from 'joi';
import { RequestHandler } from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandCustomerAccessController } from '../../../controllers/features/brands/brandCustomerAccess.controller';
import { uploadMiddleware } from '../../../middleware/upload/upload.middleware';

const builder = createRouteBuilder(RouteConfigs.tenant);

const emailParamSchema = Joi.object({
  email: Joi.string().email().required()
});

const customerIdParamSchema = Joi.object({
  customerId: Joi.string().trim().required()
});

builder.get(
  '/email/:email',
  createHandler(brandCustomerAccessController, 'checkEmailAccess'),
  {
    validateParams: emailParamSchema
  }
);

builder.post(
  '/voting/grant',
  createHandler(brandCustomerAccessController, 'grantVotingAccess'),
  {
    validateBody: Joi.object({
      email: Joi.string().email().required()
    })
  }
);

builder.post(
  '/customers',
  createHandler(brandCustomerAccessController, 'addCustomers'),
  {
    validateBody: Joi.object({
      customers: Joi.array().items(
        Joi.object({
          email: Joi.string().email().required(),
          name: Joi.string().trim().max(120).optional(),
          metadata: Joi.object().optional()
        })
      ).min(1).required()
    })
  }
);

builder.post(
  '/customers/import',
  createHandler(brandCustomerAccessController, 'importFromCSV'),
  {
    middleware: uploadMiddleware.memoryOnly.singleFile as unknown as RequestHandler[]
  }
);

builder.post(
  '/customers/sync/shopify',
  createHandler(brandCustomerAccessController, 'syncFromShopify')
);

builder.get(
  '/customers',
  createHandler(brandCustomerAccessController, 'getCustomers'),
  {
    validateQuery: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().trim().optional(),
      status: Joi.string().valid('pending', 'active', 'revoked', 'deleted').optional(),
      sortBy: Joi.string().valid('createdAt', 'lastVotingAccess', 'totalVotes', 'email').optional(),
      sortOrder: Joi.string().valid('asc', 'desc').optional()
    })
  }
);

builder.get(
  '/settings',
  createHandler(brandCustomerAccessController, 'getEmailGatingSettings')
);

builder.put(
  '/settings',
  createHandler(brandCustomerAccessController, 'updateEmailGatingSettings'),
  {
    validateBody: Joi.object({
      enabled: Joi.boolean().required(),
      allowedDomains: Joi.array().items(Joi.string().domain()).optional(),
      blockedDomains: Joi.array().items(Joi.string().domain()).optional(),
      customMessage: Joi.string().max(500).optional()
    })
  }
);

builder.post(
  '/customers/:customerId/revoke',
  createHandler(brandCustomerAccessController, 'revokeCustomerAccess'),
  {
    validateParams: customerIdParamSchema
  }
);

builder.post(
  '/customers/:customerId/restore',
  createHandler(brandCustomerAccessController, 'restoreCustomerAccess'),
  {
    validateParams: customerIdParamSchema
  }
);

builder.delete(
  '/customers/:customerId',
  createHandler(brandCustomerAccessController, 'deleteCustomer'),
  {
    validateParams: customerIdParamSchema
  }
);

builder.get(
  '/analytics',
  createHandler(brandCustomerAccessController, 'getCustomerAnalytics')
);

builder.post(
  '/customers/bulk-update',
  createHandler(brandCustomerAccessController, 'bulkUpdateAccess'),
  {
    validateBody: Joi.object({
      customerIds: Joi.array().items(Joi.string().trim()).min(1).required(),
      updates: Joi.object({
        status: Joi.string().valid('active', 'inactive', 'revoked').optional(),
        metadata: Joi.object().optional()
      }).required()
    })
  }
);

export default builder.getRouter();
