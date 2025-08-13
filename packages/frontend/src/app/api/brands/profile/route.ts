// src/routes/brands/profile.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as profileCtrl from '../../controllers/brands/profile.controller';
import {
  brandProfileUpdateSchema,
  brandProfileQuerySchema,
  brandVerificationSchema,
  brandPortfolioSchema,
  brandNetworkingSchema,
  brandVisibilitySchema
} from '../../validation/brands/profile.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brands/profile
 * Get comprehensive brand profile information
 */
router.get(
  '/',
  profileCtrl.getBrandProfile
);

/**
 * PUT /api/brands/profile
 * Update brand profile information
 */
router.put(
  '/',
  validateBody(brandProfileUpdateSchema),
  profileCtrl.updateBrandProfile
);

/**
 * GET /api/brands/profile/public/:brandId
 * Get public brand profile view (for manufacturers/visitors)
 */
router.get(
  '/public/:brandId',
  validateParams(brandProfileQuerySchema.params),
  profileCtrl.getPublicBrandProfile
);

/**
 * GET /api/brands/profile/completeness
 * Get profile completion status and recommendations
 */
router.get(
  '/completeness',
  profileCtrl.getProfileCompleteness
);

/**
 * POST /api/brands/profile/upload-assets
 * Upload profile assets (logo, banner, gallery images)
 */
router.post(
  '/upload-assets',
  strictRateLimiter(),
  validateBody(brandPortfolioSchema.uploadAssets),
  profileCtrl.uploadProfileAssets
);

/**
 * DELETE /api/brands/profile/assets/:assetId
 * Remove profile asset
 */
router.delete(
  '/assets/:assetId',
  validateParams(brandPortfolioSchema.assetParams),
  profileCtrl.removeProfileAsset
);

/**
 * GET /api/brands/profile/verification
 * Get brand verification status and requirements
 */
router.get(
  '/verification',
  profileCtrl.getVerificationStatus
);

/**
 * POST /api/brands/profile/verification/submit
 * Submit brand verification documents
 */
router.post(
  '/verification/submit',
  strictRateLimiter(),
  validateBody(brandVerificationSchema.submit),
  profileCtrl.submitVerification
);

/**
 * PUT /api/brands/profile/verification/update
 * Update verification information
 */
router.put(
  '/verification/update',
  validateBody(brandVerificationSchema.update),
  profileCtrl.updateVerification
);

/**
 * GET /api/brands/profile/portfolio
 * Get brand portfolio and showcase
 */
router.get(
  '/portfolio',
  profileCtrl.getBrandPortfolio
);

/**
 * PUT /api/brands/profile/portfolio
 * Update brand portfolio and showcase items
 */
router.put(
  '/portfolio',
  validateBody(brandPortfolioSchema.update),
  profileCtrl.updateBrandPortfolio
);

/**
 * POST /api/brands/profile/portfolio/projects
 * Add new portfolio project
 */
router.post(
  '/portfolio/projects',
  validateBody(brandPortfolioSchema.addProject),
  profileCtrl.addPortfolioProject
);

/**
 * PUT /api/brands/profile/portfolio/projects/:projectId
 * Update portfolio project
 */
router.put(
  '/portfolio/projects/:projectId',
  validateParams(brandPortfolioSchema.projectParams),
  validateBody(brandPortfolioSchema.updateProject),
  profileCtrl.updatePortfolioProject
);

/**
 * DELETE /api/brands/profile/portfolio/projects/:projectId
 * Remove portfolio project
 */
router.delete(
  '/portfolio/projects/:projectId',
  validateParams(brandPortfolioSchema.projectParams),
  profileCtrl.removePortfolioProject
);

/**
 * GET /api/brands/profile/networking
 * Get networking and partnership information
 */
router.get(
  '/networking',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  profileCtrl.getNetworkingInfo
);

/**
 * PUT /api/brands/profile/networking
 * Update networking preferences and partnership criteria
 */
router.put(
  '/networking',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(brandNetworkingSchema),
  profileCtrl.updateNetworkingPreferences
);

/**
 * GET /api/brands/profile/connections
 * Get manufacturer connections and partnerships
 */
router.get(
  '/connections',
  validateQuery(brandNetworkingSchema.connectionsQuery),
  profileCtrl.getManufacturerConnections
);

/**
 * POST /api/brands/profile/connections/:manufacturerId/invite
 * Send connection invitation to manufacturer
 */
router.post(
  '/connections/:manufacturerId/invite',
  validateParams(brandNetworkingSchema.connectionParams),
  validateBody(brandNetworkingSchema.inviteManufacturer),
  profileCtrl.inviteManufacturer
);

/**
 * PUT /api/brands/profile/connections/:connectionId/respond
 * Respond to connection request
 */
router.put(
  '/connections/:connectionId/respond',
  validateParams(brandNetworkingSchema.connectionParams),
  validateBody(brandNetworkingSchema.respondToConnection),
  profileCtrl.respondToConnection
);

/**
 * DELETE /api/brands/profile/connections/:connectionId
 * Remove manufacturer connection
 */
router.delete(
  '/connections/:connectionId',
  validateParams(brandNetworkingSchema.connectionParams),
  profileCtrl.removeConnection
);

/**
 * GET /api/brands/profile/visibility
 * Get profile visibility and discovery settings
 */
router.get(
  '/visibility',
  profileCtrl.getVisibilitySettings
);

/**
 * PUT /api/brands/profile/visibility
 * Update profile visibility and discovery preferences
 */
router.put(
  '/visibility',
  validateBody(brandVisibilitySchema),
  profileCtrl.updateVisibilitySettings
);

/**
 * GET /api/brands/profile/analytics
 * Get profile analytics and insights
 */
router.get(
  '/analytics',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(brandProfileQuerySchema.analytics),
  profileCtrl.getProfileAnalytics
);

/**
 * GET /api/brands/profile/recommendations
 * Get AI-powered profile improvement recommendations
 */
router.get(
  '/recommendations',
  requireTenantPlan(['premium', 'enterprise']),
  profileCtrl.getProfileRecommendations
);

/**
 * GET /api/brands/profile/badges
 * Get earned badges and achievements
 */
router.get(
  '/badges',
  profileCtrl.getProfileBadges
);

/**
 * GET /api/brands/profile/reviews
 * Get manufacturer reviews and ratings
 */
router.get(
  '/reviews',
  validateQuery(brandProfileQuerySchema.reviews),
  profileCtrl.getManufacturerReviews
);

/**
 * POST /api/brands/profile/reviews/:manufacturerId
 * Submit review for manufacturer
 */
router.post(
  '/reviews/:manufacturerId',
  validateParams(brandNetworkingSchema.connectionParams),
  validateBody(brandNetworkingSchema.submitReview),
  profileCtrl.submitManufacturerReview
);

/**
 * GET /api/brands/profile/social
 * Get social media integration and presence
 */
router.get(
  '/social',
  profileCtrl.getSocialPresence
);

/**
 * PUT /api/brands/profile/social
 * Update social media links and integration
 */
router.put(
  '/social',
  validateBody(brandProfileUpdateSchema.social),
  profileCtrl.updateSocialPresence
);

/**
 * POST /api/brands/profile/export
 * Export brand profile data
 */
router.post(
  '/export',
  strictRateLimiter(),
  validateBody(brandProfileQuerySchema.export),
  profileCtrl.exportProfile
);

/**
 * GET /api/brands/profile/activity
 * Get recent profile activity and updates
 */
router.get(
  '/activity',
  validateQuery(brandProfileQuerySchema.activity),
  profileCtrl.getProfileActivity
);

/**
 * POST /api/brands/profile/clone-template
 * Clone profile from template or another brand
 */
router.post(
  '/clone-template',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(brandProfileUpdateSchema.cloneTemplate),
  profileCtrl.cloneProfileTemplate
);

export default router;