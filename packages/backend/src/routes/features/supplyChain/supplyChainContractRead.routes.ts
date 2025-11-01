// src/routes/features/supplyChain/supplyChainContractRead.routes.ts
// Supply chain contract read routes using modular supply chain contract read controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainContractReadController } from '../../../controllers/features/supplyChain/supplyChainContractRead.controller';

const contractReadQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  includeInactive: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  page: Joi.number().integer().min(1).optional(),
  offset: Joi.number().integer().min(0).optional()
});

const getEndpointByIdQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  endpointId: Joi.number().integer().required()
});

const getProductByIdQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.number().integer().required()
});

const getProductEventsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.number().integer().required(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  page: Joi.number().integer().min(1).optional(),
  offset: Joi.number().integer().min(0).optional()
});

const getEventByIdQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  eventId: Joi.number().integer().required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get contract stats
builder.get(
  '/stats',
  createHandler(supplyChainContractReadController, 'getContractStats'),
  {
    validateQuery: contractReadQuerySchema
  }
);

// Get contract endpoints
builder.get(
  '/endpoints',
  createHandler(supplyChainContractReadController, 'getContractEndpoints'),
  {
    validateQuery: contractReadQuerySchema
  }
);

// Get contract products
builder.get(
  '/products',
  createHandler(supplyChainContractReadController, 'getContractProducts'),
  {
    validateQuery: contractReadQuerySchema
  }
);

// Get product events
builder.get(
  '/product-events',
  createHandler(supplyChainContractReadController, 'getProductEvents'),
  {
    validateQuery: getProductEventsQuerySchema
  }
);

// Get endpoint by ID
builder.get(
  '/endpoint',
  createHandler(supplyChainContractReadController, 'getEndpointById'),
  {
    validateQuery: getEndpointByIdQuerySchema
  }
);

// Get product by ID
builder.get(
  '/product',
  createHandler(supplyChainContractReadController, 'getProductById'),
  {
    validateQuery: getProductByIdQuerySchema
  }
);

// Get event by ID
builder.get(
  '/event',
  createHandler(supplyChainContractReadController, 'getEventById'),
  {
    validateQuery: getEventByIdQuerySchema
  }
);

export default builder.getRouter();