// src/routes/brands/wallet.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as walletCtrl from '../../controllers/brands/wallet.controller';
import {
  walletConnectionSchema,
  walletTransactionSchema,
  walletConfigSchema,
  walletSecuritySchema,
  walletAnalyticsSchema,
  contractInteractionSchema
} from '../../validation/brands/wallet.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['premium', 'enterprise'])); // Web3 features require premium+

/**
 * GET /api/brands/wallet
 * Get wallet connection status and overview
 */
router.get(
  '/',
  walletCtrl.getWalletOverview
);

/**
 * POST /api/brands/wallet/connect
 * Connect or update wallet address
 */
router.post(
  '/connect',
  strictRateLimiter(), // Prevent wallet connection abuse
  validateBody(walletConnectionSchema.connect),
  walletCtrl.connectWallet
);

/**
 * POST /api/brands/wallet/verify
 * Verify wallet ownership through signature
 */
router.post(
  '/verify',
  strictRateLimiter(),
  validateBody(walletConnectionSchema.verify),
  walletCtrl.verifyWalletOwnership
);

/**
 * DELETE /api/brands/wallet/disconnect
 * Disconnect wallet from brand account
 */
router.delete(
  '/disconnect',
  strictRateLimiter(),
  validateBody(walletConnectionSchema.disconnect),
  walletCtrl.disconnectWallet
);

/**
 * GET /api/brands/wallet/balance
 * Get wallet balance and token holdings
 */
router.get(
  '/balance',
  walletCtrl.getWalletBalance
);

/**
 * GET /api/brands/wallet/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  validateQuery(walletTransactionSchema.query),
  walletCtrl.getTransactionHistory
);

/**
 * GET /api/brands/wallet/transactions/:txHash
 * Get specific transaction details
 */
router.get(
  '/transactions/:txHash',
  validateParams(walletTransactionSchema.params),
  walletCtrl.getTransactionDetails
);

/**
 * POST /api/brands/wallet/transactions/estimate
 * Estimate transaction gas and costs
 */
router.post(
  '/transactions/estimate',
  validateBody(walletTransactionSchema.estimate),
  walletCtrl.estimateTransaction
);

/**
 * GET /api/brands/wallet/certificates
 * Get certificates owned by the wallet
 */
router.get(
  '/certificates',
  validateQuery(walletTransactionSchema.certificatesQuery),
  walletCtrl.getWalletCertificates
);

/**
 * POST /api/brands/wallet/certificates/transfer
 * Transfer certificates to another wallet
 */
router.post(
  '/certificates/transfer',
  strictRateLimiter(),
  validateBody(walletTransactionSchema.transferCertificates),
  walletCtrl.transferCertificates
);

/**
 * POST /api/brands/wallet/certificates/batch-transfer
 * Batch transfer multiple certificates
 */
router.post(
  '/certificates/batch-transfer',
  strictRateLimiter(),
  validateBody(walletTransactionSchema.batchTransfer),
  walletCtrl.batchTransferCertificates
);

/**
 * GET /api/brands/wallet/config
 * Get wallet configuration and preferences
 */
router.get(
  '/config',
  walletCtrl.getWalletConfig
);

/**
 * PUT /api/brands/wallet/config
 * Update wallet configuration
 */
router.put(
  '/config',
  validateBody(walletConfigSchema),
  walletCtrl.updateWalletConfig
);

/**
 * GET /api/brands/wallet/security
 * Get wallet security settings and status
 */
router.get(
  '/security',
  walletCtrl.getWalletSecurity
);

/**
 * PUT /api/brands/wallet/security
 * Update wallet security settings
 */
router.put(
  '/security',
  validateBody(walletSecuritySchema),
  walletCtrl.updateWalletSecurity
);

/**
 * POST /api/brands/wallet/security/backup
 * Create wallet configuration backup
 */
router.post(
  '/security/backup',
  strictRateLimiter(),
  walletCtrl.createWalletBackup
);

/**
 * GET /api/brands/wallet/analytics
 * Get wallet analytics and insights
 */
router.get(
  '/analytics',
  validateQuery(walletAnalyticsSchema),
  walletCtrl.getWalletAnalytics
);

/**
 * GET /api/brands/wallet/discounts
 * Get token-based discounts and benefits
 */
router.get(
  '/discounts',
  walletCtrl.getTokenDiscounts
);

/**
 * POST /api/brands/wallet/discounts/apply
 * Apply token discount to billing
 */
router.post(
  '/discounts/apply',
  strictRateLimiter(),
  validateBody(walletConfigSchema.applyDiscount),
  walletCtrl.applyTokenDiscount
);

/**
 * GET /api/brands/wallet/contracts
 * Get deployed smart contracts
 */
router.get(
  '/contracts',
  requireTenantPlan(['enterprise']), // Contract management requires enterprise
  walletCtrl.getSmartContracts
);

/**
 * POST /api/brands/wallet/contracts/deploy
 * Deploy new smart contract
 */
router.post(
  '/contracts/deploy',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(contractInteractionSchema.deploy),
  walletCtrl.deploySmartContract
);

/**
 * GET /api/brands/wallet/contracts/:contractAddress
 * Get specific contract details
 */
router.get(
  '/contracts/:contractAddress',
  requireTenantPlan(['enterprise']),
  validateParams(contractInteractionSchema.params),
  walletCtrl.getContractDetails
);

/**
 * POST /api/brands/wallet/contracts/:contractAddress/call
 * Call smart contract function
 */
router.post(
  '/contracts/:contractAddress/call',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(contractInteractionSchema.params),
  validateBody(contractInteractionSchema.call),
  walletCtrl.callContractFunction
);

/**
 * PUT /api/brands/wallet/contracts/:contractAddress/update
 * Update contract configuration
 */
router.put(
  '/contracts/:contractAddress/update',
  requireTenantPlan(['enterprise']),
  validateParams(contractInteractionSchema.params),
  validateBody(contractInteractionSchema.update),
  walletCtrl.updateContractConfig
);

/**
 * GET /api/brands/wallet/governance
 * Get governance token holdings and voting power
 */
router.get(
  '/governance',
  walletCtrl.getGovernanceTokens
);

/**
 * POST /api/brands/wallet/governance/vote
 * Submit governance vote
 */
router.post(
  '/governance/vote',
  strictRateLimiter(),
  validateBody(contractInteractionSchema.governanceVote),
  walletCtrl.submitGovernanceVote
);

/**
 * GET /api/brands/wallet/governance/proposals
 * Get governance proposals
 */
router.get(
  '/governance/proposals',
  validateQuery(contractInteractionSchema.proposalsQuery),
  walletCtrl.getGovernanceProposals
);

/**
 * POST /api/brands/wallet/governance/delegate
 * Delegate voting power
 */
router.post(
  '/governance/delegate',
  strictRateLimiter(),
  validateBody(contractInteractionSchema.delegate),
  walletCtrl.delegateVotingPower
);

/**
 * GET /api/brands/wallet/staking
 * Get staking information and rewards
 */
router.get(
  '/staking',
  walletCtrl.getStakingInfo
);

/**
 * POST /api/brands/wallet/staking/stake
 * Stake tokens
 */
router.post(
  '/staking/stake',
  strictRateLimiter(),
  validateBody(contractInteractionSchema.stake),
  walletCtrl.stakeTokens
);

/**
 * POST /api/brands/wallet/staking/unstake
 * Unstake tokens
 */
router.post(
  '/staking/unstake',
  strictRateLimiter(),
  validateBody(contractInteractionSchema.unstake),
  walletCtrl.unstakeTokens
);

/**
 * POST /api/brands/wallet/staking/claim-rewards
 * Claim staking rewards
 */
router.post(
  '/staking/claim-rewards',
  strictRateLimiter(),
  walletCtrl.claimStakingRewards
);

/**
 * GET /api/brands/wallet/defi
 * Get DeFi integrations and opportunities
 */
router.get(
  '/defi',
  requireTenantPlan(['enterprise']),
  walletCtrl.getDeFiIntegrations
);

/**
 * POST /api/brands/wallet/defi/liquidity/add
 * Add liquidity to DEX
 */
router.post(
  '/defi/liquidity/add',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(contractInteractionSchema.addLiquidity),
  walletCtrl.addLiquidity
);

/**
 * POST /api/brands/wallet/defi/liquidity/remove
 * Remove liquidity from DEX
 */
router.post(
  '/defi/liquidity/remove',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(contractInteractionSchema.removeLiquidity),
  walletCtrl.removeLiquidity
);

/**
 * GET /api/brands/wallet/alerts
 * Get wallet monitoring alerts
 */
router.get(
  '/alerts',
  validateQuery(walletAnalyticsSchema.alertsQuery),
  walletCtrl.getWalletAlerts
);

/**
 * POST /api/brands/wallet/alerts
 * Configure wallet monitoring alerts
 */
router.post(
  '/alerts',
  validateBody(walletAnalyticsSchema.alertConfig),
  walletCtrl.configureWalletAlerts
);

/**
 * GET /api/brands/wallet/health
 * Get wallet health status and diagnostics
 */
router.get(
  '/health',
  walletCtrl.getWalletHealth
);

/**
 * POST /api/brands/wallet/recovery/initiate
 * Initiate wallet recovery process
 */
router.post(
  '/recovery/initiate',
  strictRateLimiter(),
  validateBody(walletSecuritySchema.initiateRecovery),
  walletCtrl.initiateWalletRecovery
);

/**
 * POST /api/brands/wallet/recovery/verify
 * Verify wallet recovery
 */
router.post(
  '/recovery/verify',
  strictRateLimiter(),
  validateBody(walletSecuritySchema.verifyRecovery),
  walletCtrl.verifyWalletRecovery
);

/**
 * POST /api/brands/wallet/emergency-stop
 * Emergency stop all wallet operations
 */
router.post(
  '/emergency-stop',
  strictRateLimiter(),
  validateBody(walletSecuritySchema.emergencyStop),
  walletCtrl.emergencyStopWallet
);

export default router;