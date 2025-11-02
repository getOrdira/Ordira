// src/routes/features/nft/nftDeployment.routes.ts
// NFT deployment routes using modular NFT deployment controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftDeploymentController } from '../../../controllers/features/nft/nftDeployment.controller';

const deployContractBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  symbol: Joi.string().trim().min(1).max(20).required(),
  baseUri: Joi.string().uri().required(),
  description: Joi.string().trim().max(1000).optional(),
  royaltyPercentage: Joi.number().min(0).max(100).optional(),
  maxSupply: Joi.number().integer().min(1).optional(),
  mintPrice: Joi.number().min(0).optional(),
  enablePublicMint: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Deploy a new NFT contract
builder.post(
  '/deploy',
  createHandler(nftDeploymentController, 'deployContract'),
  {
    validateBody: deployContractBodySchema
  }
);

export default builder.getRouter();

