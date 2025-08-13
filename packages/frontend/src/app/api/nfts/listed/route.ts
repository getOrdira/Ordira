// src/routes/nfts/listed.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as nftListedCtrl from '../../controllers/nfts/listed.controller';
import {
  nftListingSchema,
  marketplaceSchema,
  offerSchema,
  auctionSchema
} from '../../validation/nfts/listed.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * GET /api/nfts/listed
 * Get all listed NFTs for the brand
 */
router.get(
  '/',
  validateQuery(nftListingSchema.list),
  trackManufacturerAction('view_listed_nfts'),
  nftListedCtrl.getListedNfts
);

/**
 * POST /api/nfts/listed/create
 * Create new marketplace listing
 */
router.post(
  '/create',
  strictRateLimiter(),
  validateBody(nftListingSchema.create),
  trackManufacturerAction('create_nft_listing'),
  nftListedCtrl.createListing
);

/**
 * GET /api/nfts/listed/:listingId
 * Get specific listing details
 */
router.get(
  '/:listingId',
  validateParams(nftListingSchema.params),
  trackManufacturerAction('view_listing_details'),
  nftListedCtrl.getListingDetails
);

/**
 * PUT /api/nfts/listed/:listingId
 * Update listing details
 */
router.put(
  '/:listingId',
  validateParams(nftListingSchema.params),
  strictRateLimiter(),
  validateBody(nftListingSchema.update),
  trackManufacturerAction('update_nft_listing'),
  nftListedCtrl.updateListing
);

/**
 * DELETE /api/nfts/listed/:listingId
 * Cancel/delist NFT
 */
router.delete(
  '/:listingId',
  validateParams(nftListingSchema.params),
  strictRateLimiter(),
  trackManufacturerAction('cancel_nft_listing'),
  nftListedCtrl.cancelListing
);

/**
 * GET /api/nfts/listed/:listingId/offers
 * Get offers for listing
 */
router.get(
  '/:listingId/offers',
  validateParams(nftListingSchema.params),
  validateQuery(offerSchema.list),
  trackManufacturerAction('view_listing_offers'),
  nftListedCtrl.getListingOffers
);

/**
 * POST /api/nfts/listed/:listingId/offers/:offerId/accept
 * Accept offer on listing
 */
router.post(
  '/:listingId/offers/:offerId/accept',
  validateParams(offerSchema.params),
  strictRateLimiter(),
  validateBody(offerSchema.accept),
  trackManufacturerAction('accept_nft_offer'),
  nftListedCtrl.acceptOffer
);

/**
 * POST /api/nfts/listed/:listingId/offers/:offerId/reject
 * Reject offer on listing
 */
router.post(
  '/:listingId/offers/:offerId/reject',
  validateParams(offerSchema.params),
  validateBody(offerSchema.reject),
  trackManufacturerAction('reject_nft_offer'),
  nftListedCtrl.rejectOffer
);

/**
 * POST /api/nfts/listed/:listingId/buy
 * Buy NFT directly
 */
router.post(
  '/:listingId/buy',
  validateParams(nftListingSchema.params),
  strictRateLimiter(),
  validateBody(nftListingSchema.buy),
  trackManufacturerAction('buy_nft_direct'),
  nftListedCtrl.buyNftDirect
);

/**
 * GET /api/nfts/listed/:listingId/analytics
 * Get listing performance analytics
 */
router.get(
  '/:listingId/analytics',
  requireTenantPlan(['enterprise']),
  validateParams(nftListingSchema.params),
  validateQuery(marketplaceSchema.analytics),
  trackManufacturerAction('view_listing_analytics'),
  nftListedCtrl.getListingAnalytics
);

/**
 * POST /api/nfts/listed/auction/create
 * Create auction listing
 */
router.post(
  '/auction/create',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(auctionSchema.create),
  trackManufacturerAction('create_nft_auction'),
  nftListedCtrl.createAuction
);

/**
 * GET /api/nfts/listed/auction/:auctionId
 * Get auction details
 */
router.get(
  '/auction/:auctionId',
  validateParams(auctionSchema.params),
  trackManufacturerAction('view_auction_details'),
  nftListedCtrl.getAuctionDetails
);

/**
 * POST /api/nfts/listed/auction/:auctionId/bid
 * Place bid on auction
 */
router.post(
  '/auction/:auctionId/bid',
  validateParams(auctionSchema.params),
  strictRateLimiter(),
  validateBody(auctionSchema.bid),
  trackManufacturerAction('place_auction_bid'),
  nftListedCtrl.placeBid
);

/**
 * POST /api/nfts/listed/auction/:auctionId/end
 * End auction early
 */
router.post(
  '/auction/:auctionId/end',
  validateParams(auctionSchema.params),
  strictRateLimiter(),
  validateBody(auctionSchema.end),
  trackManufacturerAction('end_auction_early'),
  nftListedCtrl.endAuction
);

/**
 * GET /api/nfts/listed/marketplace/stats
 * Get marketplace statistics
 */
router.get(
  '/marketplace/stats',
  requireTenantPlan(['enterprise']),
  validateQuery(marketplaceSchema.stats),
  trackManufacturerAction('view_marketplace_stats'),
  nftListedCtrl.getMarketplaceStats
);

/**
 * GET /api/nfts/listed/marketplace/trending
 * Get trending NFTs
 */
router.get(
  '/marketplace/trending',
  validateQuery(marketplaceSchema.trending),
  trackManufacturerAction('view_trending_nfts'),
  nftListedCtrl.getTrendingNfts
);

/**
 * POST /api/nfts/listed/bulk-list
 * Bulk list multiple NFTs
 */
router.post(
  '/bulk-list',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftListingSchema.bulkList),
  trackManufacturerAction('bulk_list_nfts'),
  nftListedCtrl.bulkListNfts
);

/**
 * POST /api/nfts/listed/bulk-delist
 * Bulk delist multiple NFTs
 */
router.post(
  '/bulk-delist',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(nftListingSchema.bulkDelist),
  trackManufacturerAction('bulk_delist_nfts'),
  nftListedCtrl.bulkDelistNfts
);

/**
 * GET /api/nfts/listed/sales-history
 * Get sales history
 */
router.get(
  '/sales-history',
  validateQuery(marketplaceSchema.salesHistory),
  trackManufacturerAction('view_sales_history'),
  nftListedCtrl.getSalesHistory
);

/**
 * GET /api/nfts/listed/revenue
 * Get listing revenue analytics
 */
router.get(
  '/revenue',
  requireTenantPlan(['enterprise']),
  validateQuery(marketplaceSchema.revenue),
  trackManufacturerAction('view_listing_revenue'),
  nftListedCtrl.getListingRevenue
);

export default router;