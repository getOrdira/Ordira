// src/routes/features/security/captcha.routes.ts
// Captcha routes using modular captcha controller

import Joi from 'joi';
import { RequestHandler } from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { captchaController } from '../../../controllers/features/security/captcha.controller';

const captchaVerifyBodySchema = Joi.object({
  token: Joi.string().trim().optional(),
  action: Joi.string().trim().max(100).optional(),
  bypassToken: Joi.string().trim().max(500).optional(),
  failureCount: Joi.number().integer().min(0).optional(),
  metadata: Joi.object().unknown(true).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Verify captcha
builder.post(
  '/verify',
  captchaController.verifyCaptcha as unknown as RequestHandler,
  {
    validateBody: captchaVerifyBodySchema
  }
);

// Get captcha status
builder.get(
  '/status',
  captchaController.getCaptchaStatus as unknown as RequestHandler
);

export default builder.getRouter();