// src/routes/features/nft/nftMinting.routes.ts
// NFT minting routes using modular NFT minting controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftMintingController } from '../../../controllers/features/nft/nftMinting.controller';

const objectIdSchema = Joi.string().hex().length(24);
const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);

const mintNftBodySchema = Joi.object({
  productId: objectIdSchema.required(),
  recipient: ethereumAddressSchema.required(),
  quantity: Joi.number().integer().min(1).max(100).optional(),
  metadata: Joi.object({
    name: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(1000).optional(),
    attributes: Joi.array().items(
      Joi.object({
        trait_type: Joi.string().trim().max(50).required(),
        value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        display_type: Joi.string().trim().optional()
      })
    ).optional()
  }).optional(),
  certificateTemplate: Joi.string().trim().optional(),
  customMessage: Joi.string().trim().max(500).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Mint an NFT (certificate)
builder.post(
  '/mint',
  createHandler(nftMintingController, 'mintNft'),
  {
    validateBody: mintNftBodySchema
  }
);

export default builder.getRouter();

