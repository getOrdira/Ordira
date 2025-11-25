// src/routes/features/nft/nftBurning.routes.ts
// NFT burning routes using modular NFT burning controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftBurningController } from '../../../controllers/features/nft/nftBurning.controller';

const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);
const tokenIdSchema = Joi.string().trim().min(1);

const burnNftBodySchema = Joi.object({
  tokenId: tokenIdSchema.required(),
  contractAddress: ethereumAddressSchema.required(),
  reason: Joi.string().trim().max(500).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Burn an NFT
builder.post(
  '/burn',
  createHandler(nftBurningController, 'burnNft'),
  {
    validateBody: burnNftBodySchema
  }
);

export default builder.getRouter();

