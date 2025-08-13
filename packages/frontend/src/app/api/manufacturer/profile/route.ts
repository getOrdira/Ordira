// src/routes/manufacturer/profile.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as manufacturerProfileCtrl from '../../controllers/manufacturer/profile.controller';
import {
  manufacturerProfileUpdateSchema,
  profileCompletionSchema,
  portfolioSchema,
  businessInfoSchema,
  contactSettingsSchema,
  profileVisibilitySchema,
  profileAnalyticsSchema
} from '../../validation/manufacturer/profile.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticateManufacturer);

/**
 * GET /api/manufacturer/profile
 * Get complete manufacturer profile
 */
router.get(
  '/',
  manufacturerProfileCtrl.getManufacturerProfile
);

/**
 * PUT /api/manufacturer/profile
 * Update manufacturer profile information
 */
router.put(
  '/',
  validateBody(manufacturerProfileUpdateSchema),
  manufacturerProfileCtrl.updateManufacturerProfile
);

/**
 * GET /api/manufacturer/profile/completion
 * Get profile completion status and recommendations
 */
router.get(
  '/completion',
  manufacturerProfileCtrl.getProfileCompletion
);

/**
 * POST /api/manufacturer/profile/complete-step
 * Mark profile completion step as done
 */
router.post(
  '/complete-step',
  validateBody(profileCompletionSchema.completeStep),
  manufacturerProfileCtrl.completeProfileStep
);

/**
 * GET /api/manufacturer/profile/public/:manufacturerId
 * Get public manufacturer profile view
 */
router.get(
  '/public/:manufacturerId',
  validateParams(profileAnalyticsSchema.publicParams),
  manufacturerProfileCtrl.getPublicProfile
);

/**
 * GET /api/manufacturer/profile/business-info
 * Get business information section
 */
router.get(
  '/business-info',
  manufacturerProfileCtrl.getBusinessInfo
);

/**
 * PUT /api/manufacturer/profile/business-info
 * Update business information
 */
router.put(
  '/business-info',
  validateBody(businessInfoSchema),
  manufacturerProfileCtrl.updateBusinessInfo
);

/**
 * GET /api/manufacturer/profile/portfolio
 * Get manufacturer portfolio and showcase
 */
router.get(
  '/portfolio',
  manufacturerProfileCtrl.getPortfolio
);

/**
 * PUT /api/manufacturer/profile/portfolio
 * Update portfolio information
 */
router.put(
  '/portfolio',
  validateBody(portfolioSchema.update),
  manufacturerProfileCtrl.updatePortfolio
);

/**
 * POST /api/manufacturer/profile/portfolio/projects
 * Add new portfolio project
 */
router.post(
  '/portfolio/projects',
  strictRateLimiter(),
  validateBody(portfolioSchema.addProject),
  manufacturerProfileCtrl.addPortfolioProject
);

/**
 * PUT /api/manufacturer/profile/portfolio/projects/:projectId
 * Update portfolio project
 */
router.put(
  '/portfolio/projects/:projectId',
  validateParams(portfolioSchema.projectParams),
  validateBody(portfolioSchema.updateProject),
  manufacturerProfileCtrl.updatePortfolioProject
);

/**
 * DELETE /api/manufacturer/profile/portfolio/projects/:projectId
 * Remove portfolio project
 */
router.delete(
  '/portfolio/projects/:projectId',
  strictRateLimiter(),
  validateParams(portfolioSchema.projectParams),
  manufacturerProfileCtrl.removePortfolioProject
);

/**
 * POST /api/manufacturer/profile/upload-assets
 * Upload profile assets (photos, documents, certificates)
 */
router.post(
  '/upload-assets',
  strictRateLimiter(),
  validateBody(portfolioSchema.uploadAssets),
  manufacturerProfileCtrl.uploadProfileAssets
);

/**
 * DELETE /api/manufacturer/profile/assets/:assetId
 * Remove profile asset
 */
router.delete(
  '/assets/:assetId',
  strictRateLimiter(),
  validateParams(portfolioSchema.assetParams),
  manufacturerProfileCtrl.removeProfileAsset
);

/**
 * GET /api/manufacturer/profile/capabilities
 * Get manufacturing capabilities and services
 */
router.get(
  '/capabilities',
  manufacturerProfileCtrl.getCapabilities
);

/**
 * PUT /api/manufacturer/profile/capabilities
 * Update manufacturing capabilities
 */
router.put(
  '/capabilities',
  validateBody(businessInfoSchema.capabilities),
  manufacturerProfileCtrl.updateCapabilities
);

/**
 * GET /api/manufacturer/profile/certifications
 * Get certifications and accreditations
 */
router.get(
  '/certifications',
  manufacturerProfileCtrl.getCertifications
);

/**
 * POST /api/manufacturer/profile/certifications
 * Add new certification
 */
router.post(
  '/certifications',
  strictRateLimiter(),
  validateBody(businessInfoSchema.addCertification),
  manufacturerProfileCtrl.addCertification
);

/**
 * PUT /api/manufacturer/profile/certifications/:certificationId
 * Update certification
 */
router.put(
  '/certifications/:certificationId',
  validateParams(businessInfoSchema.certificationParams),
  validateBody(businessInfoSchema.updateCertification),
  manufacturerProfileCtrl.updateCertification
);

/**
 * DELETE /api/manufacturer/profile/certifications/:certificationId
 * Remove certification
 */
router.delete(
  '/certifications/:certificationId',
  strictRateLimiter(),
  validateParams(businessInfoSchema.certificationParams),
  manufacturerProfileCtrl.removeCertification
);

/**
 * GET /api/manufacturer/profile/contact-settings
 * Get contact preferences and settings
 */
router.get(
  '/contact-settings',
  manufacturerProfileCtrl.getContactSettings
);

/**
 * PUT /api/manufacturer/profile/contact-settings
 * Update contact preferences
 */
router.put(
  '/contact-settings',
  validateBody(contactSettingsSchema),
  manufacturerProfileCtrl.updateContactSettings
);

/**
 * GET /api/manufacturer/profile/visibility
 * Get profile visibility and discovery settings
 */
router.get(
  '/visibility',
  manufacturerProfileCtrl.getVisibilitySettings
);

/**
 * PUT /api/manufacturer/profile/visibility
 * Update profile visibility settings
 */
router.put(
  '/visibility',
  validateBody(profileVisibilitySchema),
  manufacturerProfileCtrl.updateVisibilitySettings
);

/**
 * GET /api/manufacturer/profile/analytics
 * Get profile analytics and insights
 */
router.get(
  '/analytics',
  requireVerifiedManufacturer,
  validateQuery(profileAnalyticsSchema.analytics),
  manufacturerProfileCtrl.getProfileAnalytics
);

/**
 * GET /api/manufacturer/profile/views
 * Get profile view statistics
 */
router.get(
  '/views',
  validateQuery(profileAnalyticsSchema.views),
  manufacturerProfileCtrl.getProfileViews
);

/**
 * GET /api/manufacturer/profile/performance
 * Get profile performance metrics
 */
router.get(
  '/performance',
  requireVerifiedManufacturer,
  validateQuery(profileAnalyticsSchema.performance),
  manufacturerProfileCtrl.getProfilePerformance
);

/**
 * GET /api/manufacturer/profile/recommendations
 * Get AI-powered profile improvement recommendations
 */
router.get(
  '/recommendations',
  manufacturerProfileCtrl.getProfileRecommendations
);

/**
 * GET /api/manufacturer/profile/competitors
 * Get competitor analysis and benchmarking
 */
router.get(
  '/competitors',
  requireVerifiedManufacturer,
  validateQuery(profileAnalyticsSchema.competitors),
  manufacturerProfileCtrl.getCompetitorAnalysis
);

/**
 * GET /api/manufacturer/profile/reviews
 * Get reviews and ratings from brands
 */
router.get(
  '/reviews',
  validateQuery(profileAnalyticsSchema.reviews),
  manufacturerProfileCtrl.getManufacturerReviews
);

/**
 * POST /api/manufacturer/profile/request-review
 * Request review from connected brand
 */
router.post(
  '/request-review',
  strictRateLimiter(),
  validateBody(profileAnalyticsSchema.requestReview),
  manufacturerProfileCtrl.requestBrandReview
);

/**
 * GET /api/manufacturer/profile/badges
 * Get earned badges and achievements
 */
router.get(
  '/badges',
  manufacturerProfileCtrl.getProfileBadges
);

/**
 * GET /api/manufacturer/profile/social-presence
 * Get social media presence and integration
 */
router.get(
  '/social-presence',
  manufacturerProfileCtrl.getSocialPresence
);

/**
 * PUT /api/manufacturer/profile/social-presence
 * Update social media links and integration
 */
router.put(
  '/social-presence',
  validateBody(contactSettingsSchema.socialPresence),
  manufacturerProfileCtrl.updateSocialPresence
);

/**
 * GET /api/manufacturer/profile/activity
 * Get recent profile activity and updates
 */
router.get(
  '/activity',
  validateQuery(profileAnalyticsSchema.activity),
  manufacturerProfileCtrl.getProfileActivity
);

/**
 * POST /api/manufacturer/profile/export
 * Export profile data
 */
router.post(
  '/export',
  strictRateLimiter(),
  validateBody(profileAnalyticsSchema.export),
  manufacturerProfileCtrl.exportProfile
);

/**
 * GET /api/manufacturer/profile/backup
 * Get profile backup information
 */
router.get(
  '/backup',
  manufacturerProfileCtrl.getProfileBackup
);

/**
 * POST /api/manufacturer/profile/backup/create
 * Create profile backup
 */
router.post(
  '/backup/create',
  strictRateLimiter(),
  manufacturerProfileCtrl.createProfileBackup
);

/**
 * POST /api/manufacturer/profile/backup/restore
 * Restore profile from backup
 */
router.post(
  '/backup/restore',
  strictRateLimiter(),
  validateBody(profileAnalyticsSchema.restoreBackup),
  manufacturerProfileCtrl.restoreProfileBackup
);

/**
 * GET /api/manufacturer/profile/search-optimization
 * Get SEO and search optimization insights
 */
router.get(
  '/search-optimization',
  requireVerifiedManufacturer,
  manufacturerProfileCtrl.getSearchOptimization
);

/**
 * PUT /api/manufacturer/profile/search-optimization
 * Update profile for better search optimization
 */
router.put(
  '/search-optimization',
  validateBody(profileVisibilitySchema.searchOptimization),
  manufacturerProfileCtrl.updateSearchOptimization
);

/**
 * GET /api/manufacturer/profile/networking
 * Get networking insights and connection opportunities
 */
router.get(
  '/networking',
  requireVerifiedManufacturer,
  validateQuery(profileAnalyticsSchema.networking),
  manufacturerProfileCtrl.getNetworkingInsights
);

/**
 * POST /api/manufacturer/profile/clone-template
 * Clone profile structure from template or another manufacturer
 */
router.post(
  '/clone-template',
  strictRateLimiter(),
  validateBody(manufacturerProfileUpdateSchema.cloneTemplate),
  manufacturerProfileCtrl.cloneProfileTemplate
);

/**
 * GET /api/manufacturer/profile/comparison/:manufacturerId
 * Compare profile with another manufacturer
 */
router.get(
  '/comparison/:manufacturerId',
  requireVerifiedManufacturer,
  validateParams(profileAnalyticsSchema.comparisonParams),
  manufacturerProfileCtrl.compareProfile
);

/**
 * GET /api/manufacturer/profile/industry-ranking
 * Get ranking within industry
 */
router.get(
  '/industry-ranking',
  requireVerifiedManufacturer,
  validateQuery(profileAnalyticsSchema.industryRanking),
  manufacturerProfileCtrl.getIndustryRanking
);

/**
 * POST /api/manufacturer/profile/feature-request
 * Submit feature request for profile enhancements
 */
router.post(
  '/feature-request',
  strictRateLimiter(),
  validateBody(profileAnalyticsSchema.featureRequest),
  manufacturerProfileCtrl.submitFeatureRequest
);

/**
 * GET /api/manufacturer/profile/health-score
 * Get profile health score and optimization tips
 */
router.get(
  '/health-score',
  manufacturerProfileCtrl.getProfileHealthScore
);

/**
 * POST /api/manufacturer/profile/mark-featured
 * Request to be featured in manufacturer directory
 */
router.post(
  '/mark-featured',
  requireVerifiedManufacturer,
  strictRateLimiter(),
  validateBody(profileVisibilitySchema.featuredRequest),
  manufacturerProfileCtrl.requestFeaturedStatus
);

/**
 * GET /api/manufacturer/profile/equipment
 * Get manufacturing equipment and machinery details
 */
router.get(
  '/equipment',
  manufacturerProfileCtrl.getEquipmentDetails
);

/**
 * PUT /api/manufacturer/profile/equipment
 * Update equipment and machinery information
 */
router.put(
  '/equipment',
  validateBody(businessInfoSchema.equipment),
  manufacturerProfileCtrl.updateEquipmentDetails
);

/**
 * POST /api/manufacturer/profile/equipment/add
 * Add new equipment to profile
 */
router.post(
  '/equipment/add',
  strictRateLimiter(),
  validateBody(businessInfoSchema.addEquipment),
  manufacturerProfileCtrl.addEquipment
);

/**
 * DELETE /api/manufacturer/profile/equipment/:equipmentId
 * Remove equipment from profile
 */
router.delete(
  '/equipment/:equipmentId',
  strictRateLimiter(),
  validateParams(businessInfoSchema.equipmentParams),
  manufacturerProfileCtrl.removeEquipment
);

/**
 * GET /api/manufacturer/profile/quality-standards
 * Get quality control standards and processes
 */
router.get(
  '/quality-standards',
  manufacturerProfileCtrl.getQualityStandards
);

/**
 * PUT /api/manufacturer/profile/quality-standards
 * Update quality control standards
 */
router.put(
  '/quality-standards',
  validateBody(businessInfoSchema.qualityStandards),
  manufacturerProfileCtrl.updateQualityStandards
);

/**
 * GET /api/manufacturer/profile/compliance
 * Get regulatory compliance information
 */
router.get(
  '/compliance',
  manufacturerProfileCtrl.getComplianceInfo
);

/**
 * PUT /api/manufacturer/profile/compliance
 * Update compliance information
 */
router.put(
  '/compliance',
  validateBody(businessInfoSchema.compliance),
  manufacturerProfileCtrl.updateComplianceInfo
);

/**
 * GET /api/manufacturer/profile/sustainability
 * Get sustainability practices and certifications
 */
router.get(
  '/sustainability',
  manufacturerProfileCtrl.getSustainabilityInfo
);

/**
 * PUT /api/manufacturer/profile/sustainability
 * Update sustainability practices
 */
router.put(
  '/sustainability',
  validateBody(businessInfoSchema.sustainability),
  manufacturerProfileCtrl.updateSustainabilityInfo
);

/**
 * GET /api/manufacturer/profile/capacity
 * Get production capacity and availability
 */
router.get(
  '/capacity',
  manufacturerProfileCtrl.getProductionCapacity
);

/**
 * PUT /api/manufacturer/profile/capacity
 * Update production capacity information
 */
router.put(
  '/capacity',
  validateBody(businessInfoSchema.capacity),
  manufacturerProfileCtrl.updateProductionCapacity
);

/**
 * GET /api/manufacturer/profile/pricing
 * Get pricing structure and guidelines
 */
router.get(
  '/pricing',
  manufacturerProfileCtrl.getPricingStructure
);

/**
 * PUT /api/manufacturer/profile/pricing
 * Update pricing structure
 */
router.put(
  '/pricing',
  validateBody(businessInfoSchema.pricing),
  manufacturerProfileCtrl.updatePricingStructure
);

/**
 * GET /api/manufacturer/profile/locations
 * Get manufacturing locations and facilities
 */
router.get(
  '/locations',
  manufacturerProfileCtrl.getManufacturingLocations
);

/**
 * PUT /api/manufacturer/profile/locations
 * Update manufacturing locations
 */
router.put(
  '/locations',
  validateBody(businessInfoSchema.locations),
  manufacturerProfileCtrl.updateManufacturingLocations
);

/**
 * POST /api/manufacturer/profile/locations/add
 * Add new manufacturing location
 */
router.post(
  '/locations/add',
  strictRateLimiter(),
  validateBody(businessInfoSchema.addLocation),
  manufacturerProfileCtrl.addManufacturingLocation
);

/**
 * DELETE /api/manufacturer/profile/locations/:locationId
 * Remove manufacturing location
 */
router.delete(
  '/locations/:locationId',
  strictRateLimiter(),
  validateParams(businessInfoSchema.locationParams),
  manufacturerProfileCtrl.removeManufacturingLocation
);

/**
 * GET /api/manufacturer/profile/team
 * Get team information and key personnel
 */
router.get(
  '/team',
  manufacturerProfileCtrl.getTeamInfo
);

/**
 * PUT /api/manufacturer/profile/team
 * Update team information
 */
router.put(
  '/team',
  validateBody(businessInfoSchema.team),
  manufacturerProfileCtrl.updateTeamInfo
);

/**
 * POST /api/manufacturer/profile/team/add-member
 * Add team member
 */
router.post(
  '/team/add-member',
  strictRateLimiter(),
  validateBody(businessInfoSchema.addTeamMember),
  manufacturerProfileCtrl.addTeamMember
);

/**
 * PUT /api/manufacturer/profile/team/:memberId
 * Update team member information
 */
router.put(
  '/team/:memberId',
  validateParams(businessInfoSchema.teamMemberParams),
  validateBody(businessInfoSchema.updateTeamMember),
  manufacturerProfileCtrl.updateTeamMember
);

/**
 * DELETE /api/manufacturer/profile/team/:memberId
 * Remove team member
 */
router.delete(
  '/team/:memberId',
  strictRateLimiter(),
  validateParams(businessInfoSchema.teamMemberParams),
  manufacturerProfileCtrl.removeTeamMember
);

/**
 * GET /api/manufacturer/profile/timeline
 * Get company timeline and milestones
 */
router.get(
  '/timeline',
  manufacturerProfileCtrl.getCompanyTimeline
);

/**
 * PUT /api/manufacturer/profile/timeline
 * Update company timeline
 */
router.put(
  '/timeline',
  validateBody(portfolioSchema.timeline),
  manufacturerProfileCtrl.updateCompanyTimeline
);

/**
 * POST /api/manufacturer/profile/timeline/add-milestone
 * Add milestone to timeline
 */
router.post(
  '/timeline/add-milestone',
  strictRateLimiter(),
  validateBody(portfolioSchema.addMilestone),
  manufacturerProfileCtrl.addMilestone
);

/**
 * DELETE /api/manufacturer/profile/timeline/:milestoneId
 * Remove milestone from timeline
 */
router.delete(
  '/timeline/:milestoneId',
  strictRateLimiter(),
  validateParams(portfolioSchema.milestoneParams),
  manufacturerProfileCtrl.removeMilestone
);

/**
 * GET /api/manufacturer/profile/specializations
 * Get manufacturing specializations and expertise areas
 */
router.get(
  '/specializations',
  manufacturerProfileCtrl.getSpecializations
);

/**
 * PUT /api/manufacturer/profile/specializations
 * Update specializations and expertise
 */
router.put(
  '/specializations',
  validateBody(businessInfoSchema.specializations),
  manufacturerProfileCtrl.updateSpecializations
);

/**
 * GET /api/manufacturer/profile/case-studies
 * Get case studies and success stories
 */
router.get(
  '/case-studies',
  manufacturerProfileCtrl.getCaseStudies
);

/**
 * POST /api/manufacturer/profile/case-studies
 * Add new case study
 */
router.post(
  '/case-studies',
  strictRateLimiter(),
  validateBody(portfolioSchema.addCaseStudy),
  manufacturerProfileCtrl.addCaseStudy
);

/**
 * PUT /api/manufacturer/profile/case-studies/:caseStudyId
 * Update case study
 */
router.put(
  '/case-studies/:caseStudyId',
  validateParams(portfolioSchema.caseStudyParams),
  validateBody(portfolioSchema.updateCaseStudy),
  manufacturerProfileCtrl.updateCaseStudy
);

/**
 * DELETE /api/manufacturer/profile/case-studies/:caseStudyId
 * Remove case study
 */
router.delete(
  '/case-studies/:caseStudyId',
  strictRateLimiter(),
  validateParams(portfolioSchema.caseStudyParams),
  manufacturerProfileCtrl.removeCaseStudy
);

/**
 * GET /api/manufacturer/profile/testimonials
 * Get client testimonials and references
 */
router.get(
  '/testimonials',
  manufacturerProfileCtrl.getTestimonials
);

/**
 * POST /api/manufacturer/profile/testimonials
 * Add new testimonial
 */
router.post(
  '/testimonials',
  strictRateLimiter(),
  validateBody(portfolioSchema.addTestimonial),
  manufacturerProfileCtrl.addTestimonial
);

/**
 * PUT /api/manufacturer/profile/testimonials/:testimonialId
 * Update testimonial
 */
router.put(
  '/testimonials/:testimonialId',
  validateParams(portfolioSchema.testimonialParams),
  validateBody(portfolioSchema.updateTestimonial),
  manufacturerProfileCtrl.updateTestimonial
);

/**
 * DELETE /api/manufacturer/profile/testimonials/:testimonialId
 * Remove testimonial
 */
router.delete(
  '/testimonials/:testimonialId',
  strictRateLimiter(),
  validateParams(portfolioSchema.testimonialParams),
  manufacturerProfileCtrl.removeTestimonial
);

/**
 * GET /api/manufacturer/profile/awards
 * Get awards and recognitions
 */
router.get(
  '/awards',
  manufacturerProfileCtrl.getAwards
);

/**
 * POST /api/manufacturer/profile/awards
 * Add new award
 */
router.post(
  '/awards',
  strictRateLimiter(),
  validateBody(portfolioSchema.addAward),
  manufacturerProfileCtrl.addAward
);

/**
 * PUT /api/manufacturer/profile/awards/:awardId
 * Update award information
 */
router.put(
  '/awards/:awardId',
  validateParams(portfolioSchema.awardParams),
  validateBody(portfolioSchema.updateAward),
  manufacturerProfileCtrl.updateAward
);

/**
 * DELETE /api/manufacturer/profile/awards/:awardId
 * Remove award
 */
router.delete(
  '/awards/:awardId',
  strictRateLimiter(),
  validateParams(portfolioSchema.awardParams),
  manufacturerProfileCtrl.removeAward
);

/**
 * GET /api/manufacturer/profile/partnerships
 * Get strategic partnerships and alliances
 */
router.get(
  '/partnerships',
  manufacturerProfileCtrl.getPartnerships
);

/**
 * PUT /api/manufacturer/profile/partnerships
 * Update partnership information
 */
router.put(
  '/partnerships',
  validateBody(businessInfoSchema.partnerships),
  manufacturerProfileCtrl.updatePartnerships
);

/**
 * GET /api/manufacturer/profile/news
 * Get company news and press releases
 */
router.get(
  '/news',
  validateQuery(profileAnalyticsSchema.news),
  manufacturerProfileCtrl.getCompanyNews
);

/**
 * POST /api/manufacturer/profile/news
 * Add news item or press release
 */
router.post(
  '/news',
  strictRateLimiter(),
  validateBody(portfolioSchema.addNews),
  manufacturerProfileCtrl.addCompanyNews
);

/**
 * PUT /api/manufacturer/profile/news/:newsId
 * Update news item
 */
router.put(
  '/news/:newsId',
  validateParams(portfolioSchema.newsParams),
  validateBody(portfolioSchema.updateNews),
  manufacturerProfileCtrl.updateCompanyNews
);

/**
 * DELETE /api/manufacturer/profile/news/:newsId
 * Remove news item
 */
router.delete(
  '/news/:newsId',
  strictRateLimiter(),
  validateParams(portfolioSchema.newsParams),
  manufacturerProfileCtrl.removeCompanyNews
);

/**
 * GET /api/manufacturer/profile/documents
 * Get profile documents and downloads
 */
router.get(
  '/documents',
  validateQuery(profileAnalyticsSchema.documents),
  manufacturerProfileCtrl.getProfileDocuments
);

/**
 * POST /api/manufacturer/profile/documents/upload
 * Upload profile document
 */
router.post(
  '/documents/upload',
  strictRateLimiter(),
  validateBody(portfolioSchema.uploadDocument),
  manufacturerProfileCtrl.uploadProfileDocument
);

/**
 * DELETE /api/manufacturer/profile/documents/:documentId
 * Remove profile document
 */
router.delete(
  '/documents/:documentId',
  strictRateLimiter(),
  validateParams(portfolioSchema.documentParams),
  manufacturerProfileCtrl.removeProfileDocument
);

/**
 * GET /api/manufacturer/profile/integration-status
 * Get third-party integration status
 */
router.get(
  '/integration-status',
  manufacturerProfileCtrl.getIntegrationStatus
);

/**
 * POST /api/manufacturer/profile/sync-external
 * Sync profile with external platforms
 */
router.post(
  '/sync-external',
  strictRateLimiter(),
  validateBody(profileAnalyticsSchema.syncExternal),
  manufacturerProfileCtrl.syncExternalPlatforms
);

export default router;