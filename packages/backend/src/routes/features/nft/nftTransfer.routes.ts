// src/routes/features/nft/nftTransfer.routes.ts
// NFT transfer routes using modular NFT transfer controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftTransferController } from '../../../controllers/features/nft/nftTransfer.controller';

const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);
const tokenIdSchema = Joi.string().trim().min(1);

const transferNftBodySchema = Joi.object({
  tokenId: tokenIdSchema.required(),
  fromAddress: ethereumAddressSchema.required(),
  toAddress: ethereumAddressSchema.required(),
  contractAddress: ethereumAddressSchema.required()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Transfer an NFT
builder.post(
  '/transfer',
  createHandler(nftTransferController, 'transferNft'),
  {
    validateBody: transferNftBodySchema
  }
);

export default builder.getRouter();

