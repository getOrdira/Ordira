// src/routes/features/nft/nftAnalytics.routes.ts
// NFT analytics routes using modular NFT analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { nftAnalyticsController } from '../../../controllers/features/nft/nftAnalytics.controller';

const ethereumAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  contractAddress: ethereumAddressSchema.optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get certificate analytics
builder.get(
  '/analytics/certificates',
  createHandler(nftAnalyticsController, 'getCertificateAnalytics'),
  {}
);

// Get comprehensive NFT analytics
builder.get(
  '/analytics',
  createHandler(nftAnalyticsController, 'getAnalytics'),
  {
    validateQuery: analyticsQuerySchema
  }
);

export default builder.getRouter();

