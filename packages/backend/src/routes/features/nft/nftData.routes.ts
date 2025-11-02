// src/routes/features/nft/nftData.routes.ts
// NFT data routes using modular NFT data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftDataController } from '../../../controllers/features/nft/nftData.controller';

const objectIdSchema = Joi.string().hex().length(24);
const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);
const tokenIdSchema = Joi.string().trim().min(1);

const listCertificatesQuerySchema = Joi.object({
  productId: objectIdSchema.optional(),
  status: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('createdAt', 'tokenId', 'mintedAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  page: Joi.number().integer().min(1).optional()
});

const contractAddressParamsSchema = Joi.object({
  contractAddress: ethereumAddressSchema.required()
});

const contractAddressQuerySchema = Joi.object({
  contractAddress: ethereumAddressSchema.required()
});

const tokenParamsSchema = Joi.object({
  contractAddress: ethereumAddressSchema.required(),
  tokenId: tokenIdSchema.required()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// List certificates (NFTs) for a business
builder.get(
  '/certificates',
  createHandler(nftDataController, 'listCertificates'),
  {
    validateQuery: listCertificatesQuerySchema
  }
);

// List NFT contracts for a business
builder.get(
  '/contracts',
  createHandler(nftDataController, 'listContracts'),
  {}
);

// Get contract metadata
builder.get(
  '/contracts/:contractAddress',
  createHandler(nftDataController, 'getContractMetadata'),
  {
    validateParams: contractAddressParamsSchema
  }
);

// Alternative route for contract metadata via query
builder.get(
  '/contracts/metadata',
  createHandler(nftDataController, 'getContractMetadata'),
  {
    validateQuery: contractAddressQuerySchema
  }
);

// Get token URI
builder.get(
  '/tokens/:contractAddress/:tokenId/uri',
  createHandler(nftDataController, 'getTokenURI'),
  {
    validateParams: tokenParamsSchema
  }
);

// Get token owner
builder.get(
  '/tokens/:contractAddress/:tokenId/owner',
  createHandler(nftDataController, 'getTokenOwner'),
  {
    validateParams: tokenParamsSchema
  }
);

// Verify NFT authenticity
builder.get(
  '/verify/:contractAddress/:tokenId',
  createHandler(nftDataController, 'verifyNft'),
  {
    validateParams: tokenParamsSchema
  }
);

export default builder.getRouter();

