// src/routes/features/notifications/notificationsTemplate.routes.ts
// Notification template routes using modular notification template controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsTemplateController } from '../../../controllers/features/notifications/notificationsTemplate.controller';

const templateKeyParamsSchema = Joi.object({
  templateKey: Joi.string().trim().max(200).required()
});

const renderTemplateBodySchema = Joi.object({
  context: Joi.object().unknown(true).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Resolve template
builder.get(
  '/:templateKey',
  createHandler(notificationsTemplateController, 'resolveTemplate'),
  {
    validateParams: templateKeyParamsSchema
  }
);

// Render template
builder.post(
  '/:templateKey/render',
  createHandler(notificationsTemplateController, 'renderTemplate'),
  {
    validateParams: templateKeyParamsSchema,
    validateBody: renderTemplateBodySchema
  }
);

export default builder.getRouter();