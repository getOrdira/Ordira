// src/routes/manufacturer/brands.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as manufacturerBrandsCtrl from '../../controllers/manufacturer/brands.controller';
import {
  brandListQuerySchema,
  brandConnectionSchema,
  brandAnalyticsSchema,
  collaborationSchema,
  invitationSchema,
  brandSearchSchema
} from '../../validation/manufacturer/brands.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticateManufacturer);

/**
 * GET /api/manufacturer/brands
 * Get all connected brands for manufacturer
 */
router.get(
  '/',
  validateQuery(brandListQuerySchema),
  manufacturerBrandsCtrl.getConnectedBrands
);

/**
 * GET /api/manufacturer/brands/search
 * Search for brands to connect with
 */
router.get(
  '/search',
  validateQuery(brandSearchSchema),
  manufacturerBrandsCtrl.searchBrands
);

/**
 * GET /api/manufacturer/brands/discover
 * Discover recommended brands
 */
router.get(
  '/discover',
  validateQuery(brandSearchSchema.discover),
  manufacturerBrandsCtrl.discoverBrands
);

/**
 * GET /api/manufacturer/brands/featured
 * Get featured brands for manufacturers
 */
router.get(
  '/featured',
  validateQuery(brandListQuerySchema.featured),
  manufacturerBrandsCtrl.getFeaturedBrands
);

/**
 * GET /api/manufacturer/brands/:brandId
 * Get specific brand details and relationship status
 */
router.get(
  '/:brandId',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.getBrandDetails
);

/**
 * POST /api/manufacturer/brands/:brandId/connect
 * Send connection request to brand
 */
router.post(
  '/:brandId/connect',
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(brandConnectionSchema.connect),
  manufacturerBrandsCtrl.requestBrandConnection
);

/**
 * DELETE /api/manufacturer/brands/:brandId/disconnect
 * Disconnect from brand
 */
router.delete(
  '/:brandId/disconnect',
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(brandConnectionSchema.disconnect),
  manufacturerBrandsCtrl.disconnectFromBrand
);

/**
 * GET /api/manufacturer/brands/:brandId/connection-status
 * Get connection status with specific brand
 */
router.get(
  '/:brandId/connection-status',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.getConnectionStatus
);

/**
 * GET /api/manufacturer/brands/:brandId/orders
 * Get orders from specific brand
 */
router.get(
  '/:brandId/orders',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.orders),
  manufacturerBrandsCtrl.getBrandOrders
);

/**
 * GET /api/manufacturer/brands/:brandId/products
 * Get products from specific brand
 */
router.get(
  '/:brandId/products',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.products),
  manufacturerBrandsCtrl.getBrandProducts
);

/**
 * GET /api/manufacturer/brands/:brandId/certificates
 * Get certificates issued for specific brand
 */
router.get(
  '/:brandId/certificates',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.certificates),
  manufacturerBrandsCtrl.getBrandCertificates
);

/**
 * GET /api/manufacturer/brands/:brandId/analytics
 * Get detailed analytics for specific brand relationship
 */
router.get(
  '/:brandId/analytics',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.analytics),
  manufacturerBrandsCtrl.getBrandAnalytics
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-stats
 * Get comprehensive voting statistics for brand's products
 */
router.get(
  '/:brandId/voting-stats',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingStats),
  manufacturerBrandsCtrl.getBrandVotingStatistics
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-proposals
 * Get all voting proposals from connected brand
 */
router.get(
  '/:brandId/voting-proposals',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingProposals),
  manufacturerBrandsCtrl.getBrandVotingProposals
);

/**
 * GET /api/manufacturer/brands/:brandId/product-votes
 * Get detailed voting data per product
 */
router.get(
  '/:brandId/product-votes',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.productVotes),
  manufacturerBrandsCtrl.getProductVotingData
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-trends
 * Get voting trends and patterns over time
 */
router.get(
  '/:brandId/voting-trends',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingTrends),
  manufacturerBrandsCtrl.getVotingTrends
);

/**
 * GET /api/manufacturer/brands/:brandId/production-insights
 * Get production alignment insights based on voting data
 */
router.get(
  '/:brandId/production-insights',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.productionInsights),
  manufacturerBrandsCtrl.getProductionInsights
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-leaderboard
 * Get product voting leaderboard for production planning
 */
router.get(
  '/:brandId/voting-leaderboard',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingLeaderboard),
  manufacturerBrandsCtrl.getVotingLeaderboard
);

/**
 * GET /api/manufacturer/brands/:brandId/customer-preferences
 * Get customer voting preferences and demand signals
 */
router.get(
  '/:brandId/customer-preferences',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.customerPreferences),
  manufacturerBrandsCtrl.getCustomerPreferences
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-demographics
 * Get voting demographics and customer segments
 */
router.get(
  '/:brandId/voting-demographics',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingDemographics),
  manufacturerBrandsCtrl.getVotingDemographics
);

/**
 * GET /api/manufacturer/brands/:brandId/demand-forecast
 * Get demand forecasting based on voting patterns
 */
router.get(
  '/:brandId/demand-forecast',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.demandForecast),
  manufacturerBrandsCtrl.getDemandForecast
);

/**
 * GET /api/manufacturer/brands/:brandId/production-recommendations
 * Get AI-powered production recommendations based on voting data
 */
router.get(
  '/:brandId/production-recommendations',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.productionRecommendations),
  manufacturerBrandsCtrl.getProductionRecommendations
);

/**
 * POST /api/manufacturer/brands/:brandId/production-plan
 * Create production plan based on voting insights
 */
router.post(
  '/:brandId/production-plan',
  requireVerifiedManufacturer,
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(brandAnalyticsSchema.createProductionPlan),
  manufacturerBrandsCtrl.createProductionPlan
);

/**
 * GET /api/manufacturer/brands/:brandId/voting-alerts
 * Get alerts for significant voting changes or trends
 */
router.get(
  '/:brandId/voting-alerts',
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.votingAlerts),
  manufacturerBrandsCtrl.getVotingAlerts
);

/**
 * POST /api/manufacturer/brands/:brandId/voting-alerts/subscribe
 * Subscribe to voting alerts for specific products or thresholds
 */
router.post(
  '/:brandId/voting-alerts/subscribe',
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(brandAnalyticsSchema.subscribeVotingAlerts),
  manufacturerBrandsCtrl.subscribeToVotingAlerts
);

/**
 * GET /api/manufacturer/brands/:brandId/market-sentiment
 * Get market sentiment analysis from voting data
 */
router.get(
  '/:brandId/market-sentiment',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.marketSentiment),
  manufacturerBrandsCtrl.getMarketSentiment
);

/**
 * GET /api/manufacturer/brands/:brandId/competitive-voting
 * Get competitive voting analysis across product categories
 */
router.get(
  '/:brandId/competitive-voting',
  requireVerifiedManufacturer,
  validateParams(brandConnectionSchema.params),
  validateQuery(brandAnalyticsSchema.competitiveVoting),
  manufacturerBrandsCtrl.getCompetitiveVotingAnalysis
);

/**
 * GET /api/manufacturer/brands/voting-summary
 * Get voting summary across all connected brands
 */
router.get(
  '/voting-summary',
  validateQuery(brandAnalyticsSchema.votingSummary),
  manufacturerBrandsCtrl.getAllBrandsVotingSummary
);

/**
 * GET /api/manufacturer/brands/top-voted-products
 * Get top voted products across all connected brands
 */
router.get(
  '/top-voted-products',
  validateQuery(brandAnalyticsSchema.topVotedProducts),
  manufacturerBrandsCtrl.getTopVotedProducts
);

/**
 * GET /api/manufacturer/brands/production-opportunities
 * Get production opportunities based on voting gaps
 */
router.get(
  '/production-opportunities',
  requireVerifiedManufacturer,
  validateQuery(brandAnalyticsSchema.productionOpportunities),
  manufacturerBrandsCtrl.getProductionOpportunities
);

/**
 * POST /api/manufacturer/brands/:brandId/voting-export
 * Export voting data for offline analysis
 */
router.post(
  '/:brandId/voting-export',
  requireVerifiedManufacturer,
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(brandAnalyticsSchema.exportVotingData),
  manufacturerBrandsCtrl.exportVotingData
);

/**
 * PUT /api/manufacturer/brands/:brandId/collaboration
 * Update collaboration preferences with brand
 */
router.put(
  '/:brandId/collaboration',
  validateParams(brandConnectionSchema.params),
  validateBody(collaborationSchema),
  manufacturerBrandsCtrl.updateCollaborationSettings
);

/**
 * GET /api/manufacturer/brands/:brandId/collaboration
 * Get collaboration settings with brand
 */
router.get(
  '/:brandId/collaboration',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.getCollaborationSettings
);

/**
 * POST /api/manufacturer/brands/:brandId/favorite
 * Add brand to favorites
 */
router.post(
  '/:brandId/favorite',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.addBrandToFavorites
);

/**
 * DELETE /api/manufacturer/brands/:brandId/favorite
 * Remove brand from favorites
 */
router.delete(
  '/:brandId/favorite',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.removeBrandFromFavorites
);

/**
 * GET /api/manufacturer/brands/favorites
 * Get favorite brands
 */
router.get(
  '/favorites',
  validateQuery(brandListQuerySchema.favorites),
  manufacturerBrandsCtrl.getFavoriteBrands
);

/**
 * GET /api/manufacturer/brands/invitations
 * Get brand invitations (sent and received)
 */
router.get(
  '/invitations',
  validateQuery(invitationSchema.list),
  manufacturerBrandsCtrl.getBrandInvitations
);

/**
 * POST /api/manufacturer/brands/invitations/:invitationId/respond
 * Respond to brand invitation
 */
router.post(
  '/invitations/:invitationId/respond',
  strictRateLimiter(),
  validateParams(invitationSchema.params),
  validateBody(invitationSchema.respond),
  manufacturerBrandsCtrl.respondToInvitation
);

/**
 * GET /api/manufacturer/brands/recommendations
 * Get AI-powered brand recommendations
 */
router.get(
  '/recommendations',
  requireVerifiedManufacturer,
  validateQuery(brandSearchSchema.recommendations),
  manufacturerBrandsCtrl.getBrandRecommendations
);

/**
 * GET /api/manufacturer/brands/compatibility/:brandId
 * Check compatibility with specific brand
 */
router.get(
  '/compatibility/:brandId',
  validateParams(brandConnectionSchema.params),
  manufacturerBrandsCtrl.checkBrandCompatibility
);

/**
 * GET /api/manufacturer/brands/industry-trends
 * Get industry trends and brand insights
 */
router.get(
  '/industry-trends',
  requireVerifiedManufacturer,
  validateQuery(brandAnalyticsSchema.industryTrends),
  manufacturerBrandsCtrl.getIndustryTrends
);

/**
 * GET /api/manufacturer/brands/network-analysis
 * Get network analysis and relationship mapping
 */
router.get(
  '/network-analysis',
  requireVerifiedManufacturer,
  validateQuery(brandAnalyticsSchema.networkAnalysis),
  manufacturerBrandsCtrl.getNetworkAnalysis
);

/**
 * POST /api/manufacturer/brands/:brandId/proposal
 * Submit collaboration proposal to brand
 */
router.post(
  '/:brandId/proposal',
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(collaborationSchema.proposal),
  manufacturerBrandsCtrl.submitCollaborationProposal
);

/**
 * GET /api/manufacturer/brands/proposals
 * Get submitted proposals and their status
 */
router.get(
  '/proposals',
  validateQuery(collaborationSchema.proposalsList),
  manufacturerBrandsCtrl.getCollaborationProposals
);

/**
 * PUT /api/manufacturer/brands/proposals/:proposalId
 * Update collaboration proposal
 */
router.put(
  '/proposals/:proposalId',
  validateParams(collaborationSchema.proposalParams),
  validateBody(collaborationSchema.updateProposal),
  manufacturerBrandsCtrl.updateCollaborationProposal
);

/**
 * DELETE /api/manufacturer/brands/proposals/:proposalId
 * Withdraw collaboration proposal
 */
router.delete(
  '/proposals/:proposalId',
  strictRateLimiter(),
  validateParams(collaborationSchema.proposalParams),
  manufacturerBrandsCtrl.withdrawCollaborationProposal
);

/**
 * GET /api/manufacturer/brands/:brandId/communication
 * Get communication history with brand
 */
router.get(
  '/:brandId/communication',
  validateParams(brandConnectionSchema.params),
  validateQuery(collaborationSchema.communicationHistory),
  manufacturerBrandsCtrl.getCommunicationHistory
);

/**
 * POST /api/manufacturer/brands/:brandId/message
 * Send message to brand
 */
router.post(
  '/:brandId/message',
  strictRateLimiter(),
  validateParams(brandConnectionSchema.params),
  validateBody(collaborationSchema.sendMessage),
  manufacturerBrandsCtrl.sendMessageToBrand
);

/**
 * GET /api/manufacturer/brands/insights
 * Get comprehensive brand relationship insights
 */
router.get(
  '/insights',
  requireVerifiedManufacturer,
  validateQuery(brandAnalyticsSchema.insights),
  manufacturerBrandsCtrl.getBrandInsights
);

/**
 * GET /api/manufacturer/brands/export
 * Export brand relationship data
 */
router.get(
  '/export',
  requireVerifiedManufacturer,
  validateQuery(brandAnalyticsSchema.export),
  manufacturerBrandsCtrl.exportBrandData
);

/**
 * POST /api/manufacturer/brands/bulk-actions
 * Perform bulk actions on brand relationships
 */
router.post(
  '/bulk-actions',
  strictRateLimiter(),
  validateBody(brandConnectionSchema.bulkActions),
  manufacturerBrandsCtrl.performBulkActions
);

export default router;