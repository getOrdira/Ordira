
// src/routes/nfts.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as nftsCtrl from '../controllers/nfts.controller';
import {
  deployNftSchema,
  mintNftSchema,
  batchMintNftSchema,
  transferNftSchema,
  burnNftSchema,
  nftAnalyticsSchema,
  nftValidationSchemas
} from '../validation/nfts.validation';
import Joi from 'joi';

// ===== ADDITIONAL VALIDATION SCHEMAS =====
// These schemas align with your actual controller functions

// NFT contract parameters schema
const nftContractParamsSchema = Joi.object({
  contractId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Contract ID must contain only alphanumeric characters, underscores, and hyphens',
      'any.required': 'Contract ID is required'
    })
});

// Token ID parameters schema
const tokenIdParamsSchema = Joi.object({
  tokenId: Joi.string()
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Token ID must be a valid number',
      'any.required': 'Token ID is required'
    })
});

// List NFTs query schema - aligned with your controller
const listNftsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  status: Joi.string()
    .valid('pending', 'minted', 'failed', 'transferred', 'pending_transfer', 'transfer_failed', 'revoked')
    .optional(),
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'tokenId', 'mintedAt')
    .default('createdAt')
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});

// Verification request schema - for verifyNft endpoint
const verificationQuerySchema = Joi.object({
  contractAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Contract address must be a valid Ethereum address'
    })
});

const router = Router();

// Apply dynamic rate limiting to all NFT routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes
router.use(authenticate);

// Apply tenant resolution for plan-based features
router.use(resolveTenant);

// ===== NFT CONTRACT MANAGEMENT =====

/**
 * POST /api/nfts/deploy
 * Deploy new NFT contract for the business
 * 
 * @requires authentication & tenant context
 * @requires plan: Premium or Enterprise for NFT features
 * @requires validation: contract deployment parameters
 * @rate-limited: strict to prevent contract deployment spam
 * @returns { contract, deploymentTransaction, estimatedGas }
 */
router.post(
  '/deploy',
  requireTenantPlan(['premium', 'enterprise']), // NFT contracts require premium plans
  asRateLimitHandler(strictRateLimiter()), // Prevent contract deployment spam
  validateBody(deployNftSchema),
  trackManufacturerAction('deploy_nft_contract'),
  asRouteHandler(nftsCtrl.deployNft)
);

/**
 * GET /api/nfts/contracts
 * List all NFT contracts for the business with filtering and pagination
 * 
 * @requires authentication & tenant context
 * @optional query: filtering and pagination parameters
 * @returns { contracts[], stats, blockchain }
 */
router.get(
  '/contracts',
  validateQuery(listNftsQuerySchema),
  trackManufacturerAction('view_nft_contracts'),
  asRouteHandler(nftsCtrl.listNftContracts)
);

// ===== NFT MINTING =====

/**
 * POST /api/nfts/mint
 * Mint single NFT certificate
 * 
 * @requires authentication & tenant context
 * @requires plan: Premium or Enterprise for NFT minting
 * @requires validation: minting parameters
 * @rate-limited: strict to prevent minting spam
 * @returns { nft, transaction, certificate }
 */
router.post(
  '/mint',
  requireTenantPlan(['premium', 'enterprise']), // NFT minting requires premium plans
  asRateLimitHandler(strictRateLimiter()), // Prevent minting spam
  validateBody(mintNftSchema),
  trackManufacturerAction('mint_nft'),
  asRouteHandler(nftsCtrl.mintNft)
);

// ===== CERTIFICATE MANAGEMENT =====

/**
 * GET /api/nfts/certificates
 * List all issued certificates with filtering
 * 
 * @requires authentication & tenant context
 * @optional query: productId, status, pagination, sorting
 * @returns { certificates[], pagination, analytics, filters }
 */
router.get(
  '/certificates',
  validateQuery(listNftsQuerySchema),
  trackManufacturerAction('view_certificates'),
  asRouteHandler(nftsCtrl.listCertificates)
);

/**
 * POST /api/nfts/transfer
 * Transfer NFT ownership
 * 
 * @requires authentication & tenant context
 * @requires validation: transfer parameters
 * @rate-limited: strict for security
 * @returns { transfer, transaction, newOwnership }
 */
router.post(
  '/transfer',
  asRateLimitHandler(strictRateLimiter()), // Security for transfers
  validateBody(transferNftSchema),
  trackManufacturerAction('transfer_nft'),
  asRouteHandler(nftsCtrl.transferNft)
);

// ===== ANALYTICS & REPORTING =====

/**
 * GET /api/nfts/analytics
 * Get comprehensive NFT analytics dashboard
 * 
 * @requires authentication & tenant context
 * @optional query: date ranges, metrics selection
 * @returns { summary, trends, performance, topProducts, recentActivity }
 */
router.get(
  '/analytics',
  validateQuery(nftAnalyticsSchema),
  trackManufacturerAction('view_nft_analytics'),
  asRouteHandler(nftsCtrl.getNftAnalytics)
);

// ===== VERIFICATION =====

/**
 * GET /api/nfts/verify/:tokenId
 * Verify NFT authenticity and get details
 * 
 * @requires authentication & tenant context
 * @requires params: { tokenId: string }
 * @optional query: contract address
 * @returns { verification, authenticity, metadata }
 */
router.get(
  '/verify/:tokenId',
  validateParams(tokenIdParamsSchema),
  validateQuery(verificationQuerySchema),
  trackManufacturerAction('verify_nft'),
  asRouteHandler(nftsCtrl.verifyNft)
);

// ===== NFT BURNING =====

/**
 * DELETE /api/nfts/:tokenId
 * Burn/destroy NFT permanently
 * 
 * @requires authentication & tenant context
 * @requires params: { tokenId: string }
 * @requires body: { contractAddress: string, reason?: string }
 * @rate-limited: strict for security
 * @returns { burned, transaction, reclaimed }
 */
router.delete(
  '/:tokenId',
  asRateLimitHandler(strictRateLimiter() ), // Security for burning
  validateParams(tokenIdParamsSchema),
  validateBody(burnNftSchema.fork(['owner'], (schema) => schema.optional()))  , // Make owner optional since it's from tenant
  trackManufacturerAction('burn_nft'),
  asRouteHandler(nftsCtrl.burnNft)
);

export default router;



