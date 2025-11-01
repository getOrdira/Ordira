// src/routes/features/supplyChain/supplyChainDeployment.routes.ts
// Supply chain deployment routes using modular supply chain deployment controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainDeploymentController } from '../../../controllers/features/supplyChain/supplyChainDeployment.controller';

const objectIdSchema = Joi.string().hex().length(24);

const deployContractBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerName: Joi.string().trim().min(2).max(200).required(),
  gasLimit: Joi.number().integer().min(100000).optional(),
  value: Joi.string().max(200).optional(),
  metadata: Joi.object().unknown(true).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Deploy contract
builder.post(
  '/deploy',
  createHandler(supplyChainDeploymentController, 'deployContract'),
  {
    validateBody: deployContractBodySchema
  }
);

// Get deployment status
builder.get(
  '/status',
  createHandler(supplyChainDeploymentController, 'getDeploymentStatus')
);

// Validate deployment prerequisites
builder.get(
  '/prerequisites',
  createHandler(supplyChainDeploymentController, 'validateDeploymentPrerequisites')
);

// Get deployment history
builder.get(
  '/history',
  createHandler(supplyChainDeploymentController, 'getDeploymentHistory')
);

export default builder.getRouter();