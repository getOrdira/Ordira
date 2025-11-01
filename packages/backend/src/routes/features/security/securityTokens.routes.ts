// src/routes/features/security/securityTokens.routes.ts
// Security tokens routes using modular security tokens controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securityTokensController } from '../../../controllers/features/security/securityTokens.controller';

const blacklistTokenBodySchema = Joi.object({
  token: Joi.string().trim().required(),
  userId: Joi.string().trim().optional(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').optional(),
  reason: Joi.string().trim().max(500).optional()
});

const tokenQuerySchema = Joi.object({
  token: Joi.string().trim().required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Blacklist token
builder.post(
  '/blacklist',
  createHandler(securityTokensController, 'blacklistToken'),
  {
    validateBody: blacklistTokenBodySchema
  }
);

// Check if token is blacklisted
builder.get(
  '/is-blacklisted',
  createHandler(securityTokensController, 'isTokenBlacklisted'),
  {
    validateQuery: tokenQuerySchema
  }
);

export default builder.getRouter();