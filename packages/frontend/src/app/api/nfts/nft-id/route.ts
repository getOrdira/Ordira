// src/routes/nfts/nft-id.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as nftDetailsCtrl from '../../controllers/nfts/details.controller';
import {
  nftDetailsSchema,
  nftTransferSchema,
  nftMetadataSchema,
  nftUtilitySchema,
  nftAnalyticsSchema,
  nftVerificationSchema
} from '../../validation/nfts/details.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['premium', 'enterprise']));
router.use(validateParams(nftDetailsSchema.params));
router.use(cleanupOnError);

// ===== BASIC NFT INFORMATION =====

/**
 * GET /api/nfts/:nftId
 * Get comprehensive NFT details
 */
router.get(
  '/',
  validateQuery(nftDetailsSchema.basicQuery),
  trackManufacturerAction('view_nft_details'),
  nftDetailsCtrl.getNftDetails
);

/**
 * GET /api/nfts/:nftId/metadata
 * Get NFT metadata with IPFS resolution
 */
router.get(
  '/metadata',
  validateQuery(nftMetadataSchema.query),
  trackManufacturerAction('view_nft_metadata'),
  nftDetailsCtrl.getNftMetadata
);

/**
 * PUT /api/nfts/:nftId/metadata
 * Update NFT metadata (if mutable)
 */
router.put(
  '/metadata',
  strictRateLimiter(),
  validateBody(nftMetadataSchema.update),
  trackManufacturerAction('update_nft_metadata'),
  nftDetailsCtrl.updateNftMetadata
);

/**
 * POST /api/nfts/:nftId/metadata/refresh
 * Refresh metadata from IPFS/external source
 */
router.post(
  '/metadata/refresh',
  strictRateLimiter(),
  validateBody(nftMetadataSchema.refresh),
  trackManufacturerAction('refresh_nft_metadata'),
  nftDetailsCtrl.refreshNftMetadata
);

/**
 * GET /api/nfts/:nftId/attributes
 * Get NFT attributes and traits
 */
router.get(
  '/attributes',
  validateQuery(nftDetailsSchema.attributesQuery),
  trackManufacturerAction('view_nft_attributes'),
  nftDetailsCtrl.getNftAttributes
);

/**
 * PUT /api/nfts/:nftId/attributes
 * Update NFT attributes
 */
router.put(
  '/attributes',
  strictRateLimiter(),
  validateBody(nftMetadataSchema.updateAttributes),
  trackManufacturerAction('update_nft_attributes'),
  nftDetailsCtrl.updateNftAttributes
);

// ===== OWNERSHIP AND TRANSFERS =====

/**
 * GET /api/nfts/:nftId/ownership
 * Get current ownership and transfer history
 */
router.get(
  '/ownership',
  validateQuery(nftDetailsSchema.ownershipQuery),
  trackManufacturerAction('view_nft_ownership'),
  nftDetailsCtrl.getNftOwnership
);

/**
 * GET /api/nfts/:nftId/owner
 * Get current owner information
 */
router.get(
  '/owner',
  trackManufacturerAction('view_nft_owner'),
  nftDetailsCtrl.getNftOwner
);

/**
 * POST /api/nfts/:nftId/transfer
 * Transfer NFT to another address
 */
router.post(
  '/transfer',
  strictRateLimiter(),
  validateBody(nftTransferSchema.basic),
  trackManufacturerAction('transfer_nft'),
  nftDetailsCtrl.transferNft
);

/**
 * POST /api/nfts/:nftId/transfer/batch
 * Batch transfer multiple NFTs
 */
router.post(
  '/transfer/batch',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftTransferSchema.batch),
  trackManufacturerAction('batch_transfer_nfts'),
  nftDetailsCtrl.batchTransferNfts
);

/**
 * POST /api/nfts/:nftId/transfer/schedule
 * Schedule transfer for later execution
 */
router.post(
  '/transfer/schedule',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftTransferSchema.schedule),
  trackManufacturerAction('schedule_nft_transfer'),
  nftDetailsCtrl.scheduleNftTransfer
);

/**
 * GET /api/nfts/:nftId/transfer/estimate-gas
 * Estimate gas for transfer transaction
 */
router.get(
  '/transfer/estimate-gas',
  validateQuery(nftTransferSchema.gasEstimate),
  trackManufacturerAction('estimate_transfer_gas'),
  nftDetailsCtrl.estimateTransferGas
);

/**
 * GET /api/nfts/:nftId/transfer-history
 * Get detailed transfer history
 */
router.get(
  '/transfer-history',
  validateQuery(nftDetailsSchema.transferHistory),
  trackManufacturerAction('view_transfer_history'),
  nftDetailsCtrl.getTransferHistory
);

// ===== VERIFICATION AND AUTHENTICITY =====

/**
 * GET /api/nfts/:nftId/verification
 * Get NFT verification status and authenticity
 */
router.get(
  '/verification',
  validateQuery(nftVerificationSchema.query),
  trackManufacturerAction('view_nft_verification'),
  nftDetailsCtrl.getNftVerification
);

/**
 * POST /api/nfts/:nftId/verify
 * Verify NFT authenticity
 */
router.post(
  '/verify',
  validateBody(nftVerificationSchema.verify),
  trackManufacturerAction('verify_nft'),
  nftDetailsCtrl.verifyNft
);

/**
 * POST /api/nfts/:nftId/verify/blockchain
 * Verify NFT on blockchain
 */
router.post(
  '/verify/blockchain',
  strictRateLimiter(),
  validateBody(nftVerificationSchema.blockchainVerify),
  trackManufacturerAction('verify_nft_blockchain'),
  nftDetailsCtrl.verifyNftOnBlockchain
);

/**
 * GET /api/nfts/:nftId/provenance
 * Get NFT provenance chain
 */
router.get(
  '/provenance',
  requireTenantPlan(['enterprise']),
  validateQuery(nftDetailsSchema.provenanceQuery),
  trackManufacturerAction('view_nft_provenance'),
  nftDetailsCtrl.getNftProvenance
);

/**
 * POST /api/nfts/:nftId/provenance/verify
 * Verify provenance chain integrity
 */
router.post(
  '/provenance/verify',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  trackManufacturerAction('verify_nft_provenance'),
  nftDetailsCtrl.verifyNftProvenance
);

// ===== ANALYTICS AND PERFORMANCE =====

/**
 * GET /api/nfts/:nftId/analytics
 * Get comprehensive NFT analytics
 */
router.get(
  '/analytics',
  requireTenantPlan(['enterprise']),
  validateQuery(nftAnalyticsSchema.comprehensive),
  trackManufacturerAction('view_nft_analytics'),
  nftDetailsCtrl.getNftAnalytics
);

/**
 * GET /api/nfts/:nftId/analytics/performance
 * Get NFT performance metrics
 */
router.get(
  '/analytics/performance',
  requireTenantPlan(['enterprise']),
  validateQuery(nftAnalyticsSchema.performance),
  trackManufacturerAction('view_nft_performance'),
  nftDetailsCtrl.getNftPerformance
);

/**
 * GET /api/nfts/:nftId/analytics/market
 * Get market analytics for NFT
 */
router.get(
  '/analytics/market',
  requireTenantPlan(['enterprise']),
  validateQuery(nftAnalyticsSchema.market),
  trackManufacturerAction('view_nft_market_analytics'),
  nftDetailsCtrl.getNftMarketAnalytics
);

/**
 * GET /api/nfts/:nftId/price-history
 * Get NFT price history and trends
 */
router.get(
  '/price-history',
  validateQuery(nftAnalyticsSchema.priceHistory),
  trackManufacturerAction('view_nft_price_history'),
  nftDetailsCtrl.getNftPriceHistory
);

/**
 * GET /api/nfts/:nftId/valuation
 * Get current NFT valuation
 */
router.get(
  '/valuation',
  requireTenantPlan(['enterprise']),
  validateQuery(nftAnalyticsSchema.valuation),
  trackManufacturerAction('view_nft_valuation'),
  nftDetailsCtrl.getNftValuation
);

// ===== TRANSACTIONS AND BLOCKCHAIN =====

/**
 * GET /api/nfts/:nftId/transactions
 * Get all NFT transactions
 */
router.get(
  '/transactions',
  validateQuery(nftDetailsSchema.transactionHistory),
  trackManufacturerAction('view_nft_transactions'),
  nftDetailsCtrl.getNftTransactions
);

/**
 * GET /api/nfts/:nftId/blockchain-info
 * Get blockchain-specific information
 */
router.get(
  '/blockchain-info',
  validateQuery(nftDetailsSchema.blockchainQuery),
  trackManufacturerAction('view_nft_blockchain_info'),
  nftDetailsCtrl.getNftBlockchainInfo
);

/**
 * GET /api/nfts/:nftId/contract-info
 * Get smart contract information
 */
router.get(
  '/contract-info',
  trackManufacturerAction('view_nft_contract_info'),
  nftDetailsCtrl.getNftContractInfo
);

/**
 * POST /api/nfts/:nftId/refresh-blockchain
 * Refresh NFT data from blockchain
 */
router.post(
  '/refresh-blockchain',
  strictRateLimiter(),
  trackManufacturerAction('refresh_nft_blockchain'),
  nftDetailsCtrl.refreshNftFromBlockchain
);

// ===== UTILITIES AND BENEFITS =====

/**
 * GET /api/nfts/:nftId/utilities
 * Get NFT utilities and benefits
 */
router.get(
  '/utilities',
  validateQuery(nftUtilitySchema.list),
  trackManufacturerAction('view_nft_utilities'),
  nftDetailsCtrl.getNftUtilities
);

/**
 * POST /api/nfts/:nftId/utilities/add
 * Add utility/functionality to NFT
 */
router.post(
  '/utilities/add',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftUtilitySchema.add),
  trackManufacturerAction('add_nft_utility'),
  nftDetailsCtrl.addNftUtility
);

/**
 * PUT /api/nfts/:nftId/utilities/:utilityId
 * Update NFT utility
 */
router.put(
  '/utilities/:utilityId',
  requireTenantPlan(['enterprise']),
  validateParams(nftUtilitySchema.updateParams),
  validateBody(nftUtilitySchema.update),
  trackManufacturerAction('update_nft_utility'),
  nftDetailsCtrl.updateNftUtility
);

/**
 * DELETE /api/nfts/:nftId/utilities/:utilityId
 * Remove NFT utility
 */
router.delete(
  '/utilities/:utilityId',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(nftUtilitySchema.deleteParams),
  trackManufacturerAction('remove_nft_utility'),
  nftDetailsCtrl.removeNftUtility
);

/**
 * POST /api/nfts/:nftId/utilities/:utilityId/redeem
 * Redeem NFT utility
 */
router.post(
  '/utilities/:utilityId/redeem',
  validateParams(nftUtilitySchema.redeemParams),
  strictRateLimiter(),
  validateBody(nftUtilitySchema.redeem),
  trackManufacturerAction('redeem_nft_utility'),
  nftDetailsCtrl.redeemNftUtility
);

/**
 * GET /api/nfts/:nftId/utilities/:utilityId/redemption-history
 * Get utility redemption history
 */
router.get(
  '/utilities/:utilityId/redemption-history',
  validateParams(nftUtilitySchema.historyParams),
  validateQuery(nftUtilitySchema.historyQuery),
  trackManufacturerAction('view_utility_redemption_history'),
  nftDetailsCtrl.getUtilityRedemptionHistory
);

// ===== RARITY AND TRAITS =====

/**
 * GET /api/nfts/:nftId/rarity
 * Get NFT rarity information
 */
router.get(
  '/rarity',
  validateQuery(nftDetailsSchema.rarityQuery),
  trackManufacturerAction('view_nft_rarity'),
  nftDetailsCtrl.getNftRarity
);

/**
 * GET /api/nfts/:nftId/rarity-score
 * Get detailed rarity score breakdown
 */
router.get(
  '/rarity-score',
  requireTenantPlan(['enterprise']),
  validateQuery(nftDetailsSchema.rarityScoreQuery),
  trackManufacturerAction('view_nft_rarity_score'),
  nftDetailsCtrl.getNftRarityScore
);

/**
 * GET /api/nfts/:nftId/traits-analysis
 * Get traits analysis and comparison
 */
router.get(
  '/traits-analysis',
  requireTenantPlan(['enterprise']),
  validateQuery(nftDetailsSchema.traitsQuery),
  trackManufacturerAction('view_nft_traits_analysis'),
  nftDetailsCtrl.getNftTraitsAnalysis
);

/**
 * GET /api/nfts/:nftId/similar
 * Get similar NFTs based on traits
 */
router.get(
  '/similar',
  validateQuery(nftDetailsSchema.similarQuery),
  trackManufacturerAction('view_similar_nfts'),
  nftDetailsCtrl.getSimilarNfts
);

// ===== MARKETPLACE AND LISTING =====

/**
 * GET /api/nfts/:nftId/marketplace-listings
 * Get current marketplace listings
 */
router.get(
  '/marketplace-listings',
  validateQuery(nftDetailsSchema.marketplaceQuery),
  trackManufacturerAction('view_nft_marketplace_listings'),
  nftDetailsCtrl.getNftMarketplaceListings
);

/**
 * POST /api/nfts/:nftId/list
 * List NFT on marketplace
 */
router.post(
  '/list',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.listForSale),
  trackManufacturerAction('list_nft_for_sale'),
  nftDetailsCtrl.listNftForSale
);

/**
 * DELETE /api/nfts/:nftId/list/:listingId
 * Cancel marketplace listing
 */
router.delete(
  '/list/:listingId',
  validateParams(nftDetailsSchema.cancelListingParams),
  strictRateLimiter(),
  trackManufacturerAction('cancel_nft_listing'),
  nftDetailsCtrl.cancelNftListing
);

/**
 * GET /api/nfts/:nftId/offers
 * Get offers for this NFT
 */
router.get(
  '/offers',
  validateQuery(nftDetailsSchema.offersQuery),
  trackManufacturerAction('view_nft_offers'),
  nftDetailsCtrl.getNftOffers
);

/**
 * POST /api/nfts/:nftId/offers/:offerId/accept
 * Accept offer for NFT
 */
router.post(
  '/offers/:offerId/accept',
  validateParams(nftDetailsSchema.acceptOfferParams),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.acceptOffer),
  trackManufacturerAction('accept_nft_offer'),
  nftDetailsCtrl.acceptNftOffer
);

// ===== SOCIAL AND SHARING =====

/**
 * POST /api/nfts/:nftId/favorite
 * Add NFT to favorites
 */
router.post(
  '/favorite',
  trackManufacturerAction('favorite_nft'),
  nftDetailsCtrl.favoriteNft
);

/**
 * DELETE /api/nfts/:nftId/favorite
 * Remove NFT from favorites
 */
router.delete(
  '/favorite',
  trackManufacturerAction('unfavorite_nft'),
  nftDetailsCtrl.unfavoriteNft
);

/**
 * GET /api/nfts/:nftId/share-link
 * Get shareable link for NFT
 */
router.get(
  '/share-link',
  validateQuery(nftDetailsSchema.shareLinkQuery),
  trackManufacturerAction('get_nft_share_link'),
  nftDetailsCtrl.getNftShareLink
);

/**
 * POST /api/nfts/:nftId/share
 * Share NFT with others
 */
router.post(
  '/share',
  validateBody(nftDetailsSchema.share),
  trackManufacturerAction('share_nft'),
  nftDetailsCtrl.shareNft
);

/**
 * GET /api/nfts/:nftId/qr-code
 * Get QR code for NFT
 */
router.get(
  '/qr-code',
  validateQuery(nftDetailsSchema.qrCode),
  trackManufacturerAction('view_nft_qr_code'),
  nftDetailsCtrl.getNftQrCode
);

/**
 * POST /api/nfts/:nftId/report
 * Report NFT for issues
 */
router.post(
  '/report',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.report),
  trackManufacturerAction('report_nft'),
  nftDetailsCtrl.reportNft
);

// ===== CERTIFICATES AND DOCUMENTATION =====

/**
 * GET /api/nfts/:nftId/certificate
 * Get associated certificate data
 */
router.get(
  '/certificate',
  validateQuery(nftDetailsSchema.certificateQuery),
  trackManufacturerAction('view_nft_certificate'),
  nftDetailsCtrl.getNftCertificate
);

/**
 * POST /api/nfts/:nftId/certificate/regenerate
 * Regenerate certificate for NFT
 */
router.post(
  '/certificate/regenerate',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.regenerateCertificate),
  trackManufacturerAction('regenerate_nft_certificate'),
  nftDetailsCtrl.regenerateNftCertificate
);

/**
 * GET /api/nfts/:nftId/certificate/download
 * Download certificate as PDF
 */
router.get(
  '/certificate/download',
  validateQuery(nftDetailsSchema.downloadCertificate),
  trackManufacturerAction('download_nft_certificate'),
  nftDetailsCtrl.downloadNftCertificate
);

/**
 * POST /api/nfts/:nftId/certificate/email
 * Email certificate to recipient
 */
router.post(
  '/certificate/email',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.emailCertificate),
  trackManufacturerAction('email_nft_certificate'),
  nftDetailsCtrl.emailNftCertificate
);

// ===== ADVANCED OPERATIONS =====

/**
 * POST /api/nfts/:nftId/burn
 * Burn NFT permanently
 */
router.post(
  '/burn',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.burn),
  trackManufacturerAction('burn_nft'),
  nftDetailsCtrl.burnNft
);

/**
 * POST /api/nfts/:nftId/freeze-metadata
 * Freeze NFT metadata permanently
 */
router.post(
  '/freeze-metadata',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.freezeMetadata),
  trackManufacturerAction('freeze_nft_metadata'),
  nftDetailsCtrl.freezeNftMetadata
);

/**
 * POST /api/nfts/:nftId/upgrade
 * Upgrade NFT to new version
 */
router.post(
  '/upgrade',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.upgrade),
  trackManufacturerAction('upgrade_nft'),
  nftDetailsCtrl.upgradeNft
);

/**
 * POST /api/nfts/:nftId/clone
 * Clone NFT for new collection
 */
router.post(
  '/clone',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.clone),
  trackManufacturerAction('clone_nft'),
  nftDetailsCtrl.cloneNft
);

/**
 * POST /api/nfts/:nftId/split
 * Split NFT into multiple tokens
 */
router.post(
  '/split',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.split),
  trackManufacturerAction('split_nft'),
  nftDetailsCtrl.splitNft
);

/**
 * POST /api/nfts/:nftId/merge
 * Merge with other NFTs
 */
router.post(
  '/merge',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.merge),
  trackManufacturerAction('merge_nft'),
  nftDetailsCtrl.mergeNft
);

// ===== MEDIA AND ASSETS =====

/**
 * GET /api/nfts/:nftId/media
 * Get NFT media files
 */
router.get(
  '/media',
  validateQuery(nftDetailsSchema.mediaQuery),
  trackManufacturerAction('view_nft_media'),
  nftDetailsCtrl.getNftMedia
);

/**
 * POST /api/nfts/:nftId/media/upload
 * Upload additional media for NFT
 */
router.post(
  '/media/upload',
  strictRateLimiter(),
  uploadMiddleware.array('files', 5),
  validateBody(nftDetailsSchema.uploadMedia),
  trackManufacturerAction('upload_nft_media'),
  nftDetailsCtrl.uploadNftMedia
);

/**
 * DELETE /api/nfts/:nftId/media/:mediaId
 * Remove media from NFT
 */
router.delete(
  '/media/:mediaId',
  validateParams(nftDetailsSchema.deleteMediaParams),
  strictRateLimiter(),
  trackManufacturerAction('delete_nft_media'),
  nftDetailsCtrl.deleteNftMedia
);

/**
 * GET /api/nfts/:nftId/media/gallery
 * Get NFT media gallery
 */
router.get(
  '/media/gallery',
  validateQuery(nftDetailsSchema.galleryQuery),
  trackManufacturerAction('view_nft_gallery'),
  nftDetailsCtrl.getNftMediaGallery
);

// ===== MAINTENANCE AND SUPPORT =====

/**
 * POST /api/nfts/:nftId/refresh
 * Refresh all NFT data
 */
router.post(
  '/refresh',
  strictRateLimiter(),
  validateBody(nftDetailsSchema.refreshAll),
  trackManufacturerAction('refresh_nft_data'),
  nftDetailsCtrl.refreshNftData
);

/**
 * POST /api/nfts/:nftId/request-feature
 * Request new feature for NFT
 */
router.post(
  '/request-feature',
  requireTenantPlan(['enterprise']),
  validateBody(nftDetailsSchema.requestFeature),
  trackManufacturerAction('request_nft_feature'),
  nftDetailsCtrl.requestNftFeature
);

/**
 * GET /api/nfts/:nftId/activity-log
 * Get NFT activity log
 */
router.get(
  '/activity-log',
  validateQuery(nftDetailsSchema.activityLogQuery),
  trackManufacturerAction('view_nft_activity_log'),
  nftDetailsCtrl.getNftActivityLog
);

/**
 * POST /api/nfts/:nftId/backup
 * Create backup of NFT data
 */
router.post(
  '/backup',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftDetailsSchema.backup),
  trackManufacturerAction('backup_nft_data'),
  nftDetailsCtrl.backupNftData
);

/**
 * GET /api/nfts/:nftId/audit-trail
 * Get complete audit trail
 */
router.get(
  '/audit-trail',
  requireTenantPlan(['enterprise']),
  validateQuery(nftDetailsSchema.auditTrailQuery),
  trackManufacturerAction('view_nft_audit_trail'),
  nftDetailsCtrl.getNftAuditTrail
);

export default router;