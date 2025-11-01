// src/routes/features/blockchain/blockchainContracts.routes.ts
// Blockchain contracts routes using modular blockchain contracts controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { blockchainContractsController } from '../../../controllers/features/blockchain/blockchainContracts.controller';

const ethereumAddressSchema = Joi.string()
  .trim()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .message('address must be a valid Ethereum address');

const transactionHashSchema = Joi.string()
  .trim()
  .pattern(/^0x[a-fA-F0-9]{64}$/)
  .message('txHash must be a valid transaction hash');

const abiSchema = Joi.array().min(1).required();
const paramsSchema = Joi.array().items(Joi.any());

const batchCallItemSchema = Joi.object({
  contractAddress: ethereumAddressSchema.required(),
  abi: abiSchema,
  methodName: Joi.string().trim().min(1).max(128).required(),
  params: paramsSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/token/balance',
  createHandler(blockchainContractsController, 'getTokenBalance'),
  {
    validateQuery: Joi.object({
      address: ethereumAddressSchema.required()
    })
  }
);

builder.post(
  '/token/balances',
  createHandler(blockchainContractsController, 'getMultipleTokenBalances'),
  {
    validateBody: Joi.object({
      addresses: Joi.array()
        .items(ethereumAddressSchema)
        .min(1)
        .unique()
        .required()
    })
  }
);

builder.get(
  '/eth/balance',
  createHandler(blockchainContractsController, 'getETHBalance'),
  {
    validateQuery: Joi.object({
      address: ethereumAddressSchema.required()
    })
  }
);

builder.get(
  '/transactions/receipt',
  createHandler(blockchainContractsController, 'getTransactionReceipt'),
  {
    validateQuery: Joi.object({
      txHash: transactionHashSchema.required(),
      maxRetries: Joi.number().integer().min(0).max(10).optional()
    })
  }
);

builder.get(
  '/transactions/status',
  createHandler(blockchainContractsController, 'getTransactionStatus'),
  {
    validateQuery: Joi.object({
      txHash: transactionHashSchema.required()
    })
  }
);

builder.get(
  '/transactions/wait',
  createHandler(blockchainContractsController, 'waitForTransaction'),
  {
    validateQuery: Joi.object({
      txHash: transactionHashSchema.required(),
      confirmations: Joi.number().integer().min(1).max(12).optional(),
      timeout: Joi.number().integer().min(1_000).max(900_000).optional()
    })
  }
);

builder.get(
  '/network',
  createHandler(blockchainContractsController, 'getNetworkInfo')
);

builder.get(
  '/gas-price',
  createHandler(blockchainContractsController, 'getOptimalGasPrice'),
  {
    validateQuery: Joi.object({
      priority: Joi.string().valid('slow', 'standard', 'fast').optional()
    })
  }
);

builder.post(
  '/gas/estimate',
  createHandler(blockchainContractsController, 'estimateGas'),
  {
    validateBody: Joi.object({
      contractAddress: ethereumAddressSchema.required(),
      abi: abiSchema,
      methodName: Joi.string().trim().min(1).max(128).required(),
      params: paramsSchema.optional()
    })
  }
);

builder.get(
  '/contract/check',
  createHandler(blockchainContractsController, 'isContract'),
  {
    validateQuery: Joi.object({
      address: ethereumAddressSchema.required()
    })
  }
);

builder.post(
  '/batch-call',
  createHandler(blockchainContractsController, 'batchCall'),
  {
    validateBody: Joi.object({
      calls: Joi.array().items(batchCallItemSchema).min(1).required()
    })
  }
);

export default builder.getRouter();

