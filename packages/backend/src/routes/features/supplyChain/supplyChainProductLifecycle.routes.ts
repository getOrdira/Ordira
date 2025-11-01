// src/routes/features/supplyChain/supplyChainProductLifecycle.routes.ts
// Supply chain product lifecycle routes using modular supply chain product lifecycle controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainProductLifecycleController } from '../../../controllers/features/supplyChain/supplyChainProductLifecycle.controller';

const getProductLifecycleQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.string().trim().min(1).max(200).required()
});

const logProductEventBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.string().trim().min(1).max(200).required(),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  location: Joi.string().trim().min(1).max(200).required(),
  details: Joi.string().trim().max(2000).optional(),
  endpointId: Joi.number().integer().optional()
});

const getProductStatusQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.string().trim().min(1).max(200).required()
});

const batchLogEventsBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  events: Joi.array().items(Joi.object({
    productId: Joi.string().trim().min(1).max(200).required(),
    eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
    location: Joi.string().trim().min(1).max(200).required(),
    details: Joi.string().trim().max(2000).optional(),
    endpointId: Joi.number().integer().optional()
  })).min(1).max(50).required()
});

const getLifecycleAnalyticsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get product lifecycle
builder.get(
  '/lifecycle',
  createHandler(supplyChainProductLifecycleController, 'getProductLifecycle'),
  {
    validateQuery: getProductLifecycleQuerySchema
  }
);

// Log product event
builder.post(
  '/log-event',
  createHandler(supplyChainProductLifecycleController, 'logProductEvent'),
  {
    validateBody: logProductEventBodySchema
  }
);

// Get product status
builder.get(
  '/status',
  createHandler(supplyChainProductLifecycleController, 'getProductStatus'),
  {
    validateQuery: getProductStatusQuerySchema
  }
);

// Batch log events
builder.post(
  '/batch-log-events',
  createHandler(supplyChainProductLifecycleController, 'logBatchEvents'),
  {
    validateBody: batchLogEventsBodySchema
  }
);

// Get product lifecycle analytics
builder.get(
  '/analytics',
  createHandler(supplyChainProductLifecycleController, 'getProductLifecycleAnalytics'),
  {
    validateQuery: getLifecycleAnalyticsQuerySchema
  }
);

export default builder.getRouter();