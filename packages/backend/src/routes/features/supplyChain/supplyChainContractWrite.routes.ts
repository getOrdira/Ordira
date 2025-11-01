// src/routes/features/supplyChain/supplyChainContractWrite.routes.ts
// Supply chain contract write routes using modular supply chain contract write controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainContractWriteController } from '../../../controllers/features/supplyChain/supplyChainContractWrite.controller';

const contractWriteQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const createEndpointBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  name: Joi.string().trim().min(1).max(200).required(),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  location: Joi.string().trim().min(1).max(200).required()
});

const registerProductBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  productId: Joi.string().trim().min(1).max(200).required(),
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).optional()
});

const logEventBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  endpointId: Joi.number().integer().required(),
  productId: Joi.string().trim().min(1).max(200).required(),
  eventType: Joi.string().trim().min(1).max(200).required(),
  location: Joi.string().trim().min(1).max(200).required(),
  details: Joi.string().trim().max(2000).optional()
});

const batchCreateEndpointsBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  endpoints: Joi.array().items(Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
    location: Joi.string().trim().min(1).max(200).required()
  })).min(1).max(50).required()
});

const batchRegisterProductsBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  products: Joi.array().items(Joi.object({
    productId: Joi.string().trim().min(1).max(200).required(),
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(2000).optional()
  })).min(1).max(50).required()
});

const batchLogEventsBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  events: Joi.array().items(Joi.object({
    endpointId: Joi.number().integer().required(),
    productId: Joi.string().trim().min(1).max(200).required(),
    eventType: Joi.string().trim().min(1).max(200).required(),
    location: Joi.string().trim().min(1).max(200).required(),
    details: Joi.string().trim().max(2000).optional()
  })).min(1).max(50).required()
});

const estimateGasBodySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  name: Joi.string().trim().min(1).max(200).optional(),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').optional(),
  location: Joi.string().trim().min(1).max(200).optional(),
  productId: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(2000).optional(),
  endpointId: Joi.number().integer().optional(),
  details: Joi.string().trim().max(2000).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create endpoint
builder.post(
  '/endpoints',
  createHandler(supplyChainContractWriteController, 'createEndpoint'),
  {
    validateBody: createEndpointBodySchema
  }
);

// Register product
builder.post(
  '/products',
  createHandler(supplyChainContractWriteController, 'registerProduct'),
  {
    validateBody: registerProductBodySchema
  }
);

// Log event
builder.post(
  '/events',
  createHandler(supplyChainContractWriteController, 'logEvent'),
  {
    validateBody: logEventBodySchema
  }
);

// Batch create endpoints
builder.post(
  '/endpoints/batch',
  createHandler(supplyChainContractWriteController, 'batchCreateEndpoints'),
  {
    validateBody: batchCreateEndpointsBodySchema
  }
);

// Batch register products
builder.post(
  '/products/batch',
  createHandler(supplyChainContractWriteController, 'batchRegisterProducts'),
  {
    validateBody: batchRegisterProductsBodySchema
  }
);

// Batch log events
builder.post(
  '/events/batch',
  createHandler(supplyChainContractWriteController, 'batchLogEvents'),
  {
    validateBody: batchLogEventsBodySchema
  }
);

// Estimate endpoint creation gas
builder.post(
  '/estimate-endpoint-gas',
  createHandler(supplyChainContractWriteController, 'estimateCreateEndpointGas'),
  {
    validateBody: estimateGasBodySchema
  }
);

// Estimate product registration gas
builder.post(
  '/estimate-product-gas',
  createHandler(supplyChainContractWriteController, 'estimateRegisterProductGas'),
  {
    validateBody: estimateGasBodySchema
  }
);

// Estimate event logging gas
builder.post(
  '/estimate-event-gas',
  createHandler(supplyChainContractWriteController, 'estimateLogEventGas'),
  {
    validateBody: estimateGasBodySchema
  }
);

export default builder.getRouter();