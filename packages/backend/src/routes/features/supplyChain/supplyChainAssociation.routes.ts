// src/routes/features/supplyChain/supplyChainAssociation.routes.ts
// Supply chain association routes using modular supply chain association controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainAssociationController } from '../../../controllers/features/supplyChain/supplyChainAssociation.controller';

const objectIdSchema = Joi.string().hex().length(24);

const storeMappingBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  contractType: Joi.string().valid('supplychain', 'voting', 'nft').required(),
  isActive: Joi.boolean().optional()
});

const getMappingQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  contractType: Joi.string().valid('supplychain', 'voting', 'nft').optional()
});

const updateStatusBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  contractType: Joi.string().valid('supplychain', 'voting', 'nft').required(),
  isActive: Joi.boolean().optional()
});

const validateAssociationQuerySchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  contractType: Joi.string().valid('supplychain', 'voting', 'nft').required()
});

const businessesByContractQuerySchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Store business contract mapping
builder.post(
  '/store-mapping',
  createHandler(supplyChainAssociationController, 'storeBusinessContractMapping'),
  {
    validateBody: storeMappingBodySchema
  }
);

// Get business contract mapping
builder.get(
  '/mapping',
  createHandler(supplyChainAssociationController, 'getBusinessContractMapping'),
  {
    validateQuery: getMappingQuerySchema
  }
);

// Get all business contract mappings
builder.get(
  '/mappings',
  createHandler(supplyChainAssociationController, 'getAllBusinessContractMappings')
);

// Validate business contract association
builder.get(
  '/validate',
  createHandler(supplyChainAssociationController, 'validateBusinessContractAssociation'),
  {
    validateQuery: validateAssociationQuerySchema
  }
);

// Update contract association status
builder.put(
  '/update-status',
  createHandler(supplyChainAssociationController, 'updateContractAssociationStatus'),
  {
    validateBody: updateStatusBodySchema
  }
);

// Get contract statistics
builder.get(
  '/statistics',
  createHandler(supplyChainAssociationController, 'getContractStatistics')
);

// Validate business exists
builder.get(
  '/validate-business',
  createHandler(supplyChainAssociationController, 'validateBusinessExists')
);

// Get businesses by contract address
builder.get(
  '/businesses',
  createHandler(supplyChainAssociationController, 'getBusinessesByContractAddress'),
  {
    validateQuery: businessesByContractQuerySchema
  }
);

export default builder.getRouter();