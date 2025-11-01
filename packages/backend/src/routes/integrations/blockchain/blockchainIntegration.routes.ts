// src/routes/integrations/blockchain/blockchainIntegration.routes.ts
// Blockchain integration routes using modular blockchain integration controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { blockchainIntegrationController } from '../../../controllers/integrations/blockchain/blockchainIntegration.controller';

const transactionLookupQuerySchema = Joi.object({
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required()
});

const balanceLookupQuerySchema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get network status
builder.get(
  '/network/status',
  createHandler(blockchainIntegrationController, 'getNetworkStatus')
);

// Get gas price
builder.get(
  '/gas/price',
  createHandler(blockchainIntegrationController, 'getGasPrice')
);

// Get transaction receipt
builder.get(
  '/transaction/receipt',
  createHandler(blockchainIntegrationController, 'getTransactionReceipt'),
  {
    validateQuery: transactionLookupQuerySchema
  }
);

// Get address balance
builder.get(
  '/address/balance',
  createHandler(blockchainIntegrationController, 'getAddressBalance'),
  {
    validateQuery: balanceLookupQuerySchema
  }
);

export default builder.getRouter();