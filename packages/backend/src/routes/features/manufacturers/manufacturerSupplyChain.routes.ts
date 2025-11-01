// src/routes/features/manufacturers/manufacturerSupplyChain.routes.ts
// Manufacturer supply chain routes using modular manufacturer supply chain controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerSupplyChainController } from '../../../controllers/features/manufacturers/manufacturerSupplyChain.controller';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const deployContractBodySchema = Joi.object({
  manufacturerName: Joi.string().trim().min(2).max(200).required()
});

const createEndpointBodySchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  location: Joi.string().trim().max(200).required()
});

const registerProductBodySchema = Joi.object({
  productId: Joi.string().trim().max(200).required(),
  name: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000).required()
});

const logEventBodySchema = Joi.object({
  endpointId: Joi.number().integer().min(0).required(),
  productId: Joi.string().trim().max(200).required(),
  eventType: Joi.string().trim().max(100).required(),
  location: Joi.string().trim().max(200).required(),
  details: Joi.string().trim().max(2000).required()
});

const getProductEventsQuerySchema = Joi.object({
  productId: Joi.string().trim().max(200).required()
});

const qrCodeQuerySchema = Joi.object({
  productId: Joi.string().trim().max(200).required()
});

const batchQRCodesBodySchema = Joi.object({
  productIds: Joi.array().items(Joi.string().trim().max(200)).min(1).max(100).required()
});

const updateEndpointBodySchema = Joi.object({
  endpointId: Joi.number().integer().min(0).required(),
  isActive: Joi.boolean().required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Deploy supply chain contract
builder.post(
  '/:manufacturerId/contract/deploy',
  createHandler(manufacturerSupplyChainController, 'deploySupplyChainContract'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: deployContractBodySchema
  }
);

// Get contract info
builder.get(
  '/:manufacturerId/contract',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainContractInfo'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Deactivate contract
builder.post(
  '/:manufacturerId/contract/deactivate',
  createHandler(manufacturerSupplyChainController, 'deactivateSupplyChainContract'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Create endpoint
builder.post(
  '/:manufacturerId/endpoints',
  createHandler(manufacturerSupplyChainController, 'createSupplyChainEndpoint'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: createEndpointBodySchema
  }
);

// Get endpoints
builder.get(
  '/:manufacturerId/endpoints',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainEndpoints'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Update endpoint status
builder.put(
  '/:manufacturerId/endpoints/status',
  createHandler(manufacturerSupplyChainController, 'updateEndpointStatus'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: updateEndpointBodySchema
  }
);

// Register product
builder.post(
  '/:manufacturerId/products',
  createHandler(manufacturerSupplyChainController, 'registerSupplyChainProduct'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: registerProductBodySchema
  }
);

// Get products
builder.get(
  '/:manufacturerId/products',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainProducts'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Log event
builder.post(
  '/:manufacturerId/events',
  createHandler(manufacturerSupplyChainController, 'logSupplyChainEvent'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: logEventBodySchema
  }
);

// Get product events
builder.get(
  '/:manufacturerId/events',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainProductEvents'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: getProductEventsQuerySchema
  }
);

// Get dashboard
builder.get(
  '/:manufacturerId/dashboard',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainDashboard'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Generate product QR code
builder.get(
  '/:manufacturerId/qr-code',
  createHandler(manufacturerSupplyChainController, 'generateProductQrCode'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: qrCodeQuerySchema
  }
);

// Batch generate QR codes
builder.post(
  '/:manufacturerId/qr-code/batch-generate',
  createHandler(manufacturerSupplyChainController, 'generateBatchProductQrCodes'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: batchQRCodesBodySchema
  }
);

// Get QR code info
builder.get(
  '/:manufacturerId/qr-code/info',
  createHandler(manufacturerSupplyChainController, 'getProductQrCodeInfo'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: qrCodeQuerySchema
  }
);

// Get statistics
builder.get(
  '/:manufacturerId/statistics',
  createHandler(manufacturerSupplyChainController, 'getSupplyChainStatistics'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

export default builder.getRouter();