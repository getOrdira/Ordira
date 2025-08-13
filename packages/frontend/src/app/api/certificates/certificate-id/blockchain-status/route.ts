// src/routes/certificates/certificate-id/blockchain-status.routes.ts
import { Router } from 'express';
import { validateQuery, validateParams } from '../../../middleware/validation.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../../middleware/metrics.middleware';
import * as blockchainStatusCtrl from '../../../controllers/certificates/blockchainStatus.controller';
import {
  blockchainStatusQuerySchema,
  transactionDetailsSchema,
  networkStatusSchema,
  gasEstimationSchema
} from '../../../validation/certificates/blockchainStatus.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/certificates/:certificateId/blockchain-status
 * Get comprehensive blockchain status for certificate
 */
router.get(
  '/',
  validateParams(blockchainStatusQuerySchema.params),
  validateQuery(blockchainStatusQuerySchema.query),
  blockchainStatusCtrl.getBlockchainStatus
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/transaction
 * Get detailed transaction information
 */
router.get(
  '/transaction',
  validateParams(transactionDetailsSchema.params),
  blockchainStatusCtrl.getTransactionDetails
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/confirmations
 * Get transaction confirmation status and count
 */
router.get(
  '/confirmations',
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getConfirmationStatus
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/network-info
 * Get blockchain network information for certificate
 */
router.get(
  '/network-info',
  validateParams(networkStatusSchema.params),
  blockchainStatusCtrl.getNetworkInfo
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/gas-tracker
 * Get gas usage and cost information
 */
router.get(
  '/gas-tracker',
  validateParams(gasEstimationSchema.params),
  validateQuery(gasEstimationSchema.query),
  blockchainStatusCtrl.getGasTracker
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/ownership-chain
 * Get ownership transfer chain on blockchain
 */
router.get(
  '/ownership-chain',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getOwnershipChain
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/smart-contract
 * Get smart contract details and interactions
 */
router.get(
  '/smart-contract',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(transactionDetailsSchema.params),
  blockchainStatusCtrl.getSmartContractDetails
);

/**
 * POST /api/certificates/:certificateId/blockchain-status/refresh
 * Force refresh blockchain status from network
 */
router.post(
  '/refresh',
  strictRateLimiter(),
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.refreshBlockchainStatus
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/events
 * Get blockchain events related to certificate
 */
router.get(
  '/events',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(blockchainStatusQuerySchema.params),
  validateQuery(blockchainStatusQuerySchema.eventsQuery),
  blockchainStatusCtrl.getBlockchainEvents
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/verification-proof
 * Get cryptographic verification proof
 */
router.get(
  '/verification-proof',
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getVerificationProof
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/explorer-links
 * Get blockchain explorer links for various networks
 */
router.get(
  '/explorer-links',
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getExplorerLinks
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/health-check
 * Check blockchain connectivity and certificate status health
 */
router.get(
  '/health-check',
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.performHealthCheck
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/transfer-history
 * Get detailed transfer history from blockchain
 */
router.get(
  '/transfer-history',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(blockchainStatusQuerySchema.params),
  validateQuery(blockchainStatusQuerySchema.transferHistory),
  blockchainStatusCtrl.getTransferHistory
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/metadata-hash
 * Get metadata hash verification from blockchain
 */
router.get(
  '/metadata-hash',
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getMetadataHash
);

/**
 * POST /api/certificates/:certificateId/blockchain-status/verify-integrity
 * Verify certificate data integrity against blockchain
 */
router.post(
  '/verify-integrity',
  strictRateLimiter(),
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.verifyDataIntegrity
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/real-time
 * Get real-time blockchain status updates
 */
router.get(
  '/real-time',
  requireTenantPlan(['enterprise']),
  validateParams(blockchainStatusQuerySchema.params),
  blockchainStatusCtrl.getRealTimeStatus
);

/**
 * GET /api/certificates/:certificateId/blockchain-status/performance-metrics
 * Get blockchain performance metrics for certificate
 */
router.get(
  '/performance-metrics',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(blockchainStatusQuerySchema.params),
  validateQuery(networkStatusSchema.performanceQuery),
  blockchainStatusCtrl.getPerformanceMetrics
);

export default router;