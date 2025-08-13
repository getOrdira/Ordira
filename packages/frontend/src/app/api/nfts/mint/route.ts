// src/routes/nfts/mint.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as nftMintCtrl from '../../controllers/nfts/mint.controller';
import {
  nftMintSchema,
  batchMintSchema,
  mintValidationSchema,
  mintConfigSchema
} from '../../validation/nfts/mint.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * POST /api/nfts/mint/single
 * Mint a single NFT
 */
router.post(
  '/single',
  strictRateLimiter(),
  validateBody(nftMintSchema.single),
  trackManufacturerAction('mint_single_nft'),
  nftMintCtrl.mintSingleNft
);

/**
 * POST /api/nfts/mint/certificate
 * Mint NFT certificate for product
 */
router.post(
  '/certificate',
  strictRateLimiter(),
  validateBody(nftMintSchema.certificate),
  trackManufacturerAction('mint_certificate_nft'),
  nftMintCtrl.mintCertificateNft
);

/**
 * POST /api/nfts/mint/batch
 * Batch mint multiple NFTs
 */
router.post(
  '/batch',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(batchMintSchema.basic),
  trackManufacturerAction('batch_mint_nfts'),
  nftMintCtrl.batchMintNfts
);

/**
 * POST /api/nfts/mint/airdrop
 * Airdrop NFTs to multiple recipients
 */
router.post(
  '/airdrop',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(batchMintSchema.airdrop),
  trackManufacturerAction('airdrop_nfts'),
  nftMintCtrl.airdropNfts
);

/**
 * POST /api/nfts/mint/lazy
 * Create lazy mint voucher
 */
router.post(
  '/lazy',
  requireTenantPlan(['enterprise']),
  validateBody(nftMintSchema.lazy),
  trackManufacturerAction('create_lazy_mint'),
  nftMintCtrl.createLazyMint
);

/**
 * POST /api/nfts/mint/with-media
 * Mint NFT with media upload
 */
router.post(
  '/with-media',
  strictRateLimiter(),
  uploadMiddleware.single('file'),
  validateBody(nftMintSchema.withMedia),
  trackManufacturerAction('mint_nft_with_media'),
  nftMintCtrl.mintNftWithMedia
);

/**
 * POST /api/nfts/mint/from-template
 * Mint NFT from template
 */
router.post(
  '/from-template',
  validateBody(nftMintSchema.fromTemplate),
  trackManufacturerAction('mint_from_template'),
  nftMintCtrl.mintFromTemplate
);

/**
 * POST /api/nfts/mint/generative
 * Mint generative NFT
 */
router.post(
  '/generative',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftMintSchema.generative),
  trackManufacturerAction('mint_generative_nft'),
  nftMintCtrl.mintGenerativeNft
);

/**
 * POST /api/nfts/mint/validate
 * Validate minting parameters before execution
 */
router.post(
  '/validate',
  validateBody(mintValidationSchema.validate),
  trackManufacturerAction('validate_mint_params'),
  nftMintCtrl.validateMintingParams
);

/**
 * GET /api/nfts/mint/quota
 * Get minting quota and usage
 */
router.get(
  '/quota',
  trackManufacturerAction('view_mint_quota'),
  nftMintCtrl.getMintingQuota
);

/**
 * GET /api/nfts/mint/estimate-gas
 * Estimate gas costs for minting
 */
router.get(
  '/estimate-gas',
  validateQuery(mintValidationSchema.gasEstimate),
  trackManufacturerAction('estimate_mint_gas'),
  nftMintCtrl.estimateMintingGas
);

/**
 * GET /api/nfts/mint/jobs
 * Get minting job history
 */
router.get(
  '/jobs',
  validateQuery(mintConfigSchema.jobsList),
  trackManufacturerAction('view_mint_jobs'),
  nftMintCtrl.getMintingJobs
);

/**
 * GET /api/nfts/mint/jobs/:jobId
 * Get specific minting job status
 */
router.get(
  '/jobs/:jobId',
  validateParams(mintConfigSchema.jobParams),
  trackManufacturerAction('view_mint_job'),
  nftMintCtrl.getMintingJobStatus
);

/**
 * POST /api/nfts/mint/jobs/:jobId/retry
 * Retry failed minting job
 */
router.post(
  '/jobs/:jobId/retry',
  validateParams(mintConfigSchema.jobParams),
  strictRateLimiter(),
  trackManufacturerAction('retry_mint_job'),
  nftMintCtrl.retryMintingJob
);

/**
 * DELETE /api/nfts/mint/jobs/:jobId
 * Cancel minting job
 */
router.delete(
  '/jobs/:jobId',
  validateParams(mintConfigSchema.jobParams),
  strictRateLimiter(),
  trackManufacturerAction('cancel_mint_job'),
  nftMintCtrl.cancelMintingJob
);

/**
 * POST /api/nfts/mint/schedule
 * Schedule minting for later execution
 */
router.post(
  '/schedule',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mintConfigSchema.schedule),
  trackManufacturerAction('schedule_minting'),
  nftMintCtrl.scheduleMinting
);

/**
 * GET /api/nfts/mint/templates
 * Get minting templates
 */
router.get(
  '/templates',
  validateQuery(mintConfigSchema.templatesList),
  trackManufacturerAction('view_mint_templates'),
  nftMintCtrl.getMintingTemplates
);

/**
 * POST /api/nfts/mint/templates
 * Create minting template
 */
router.post(
  '/templates',
  requireTenantPlan(['enterprise']),
  validateBody(mintConfigSchema.createTemplate),
  trackManufacturerAction('create_mint_template'),
  nftMintCtrl.createMintingTemplate
);

/**
 * GET /api/nfts/mint/analytics
 * Get minting analytics
 */
router.get(
  '/analytics',
  requireTenantPlan(['enterprise']),
  validateQuery(mintConfigSchema.analytics),
  trackManufacturerAction('view_mint_analytics'),
  nftMintCtrl.getMintingAnalytics
);

export default router;