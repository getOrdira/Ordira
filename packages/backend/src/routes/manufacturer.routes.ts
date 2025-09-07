// src/routes/manufacturer.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as mfgCtrl from '../controllers/manufacturer.controller';
import * as mfgAccountCtrl from '../controllers/manufacturerAccount.controller';
import {
  registerManufacturerSchema,
  loginManufacturerSchema,
  updateManufacturerProfileSchema,
  listBrandsQuerySchema,
  brandParamsSchema,
  manufacturerVerificationSchema
} from '../validation/manufacturer.validation';

const router = Router();

// Apply dynamic rate limiting to all manufacturer routes
router.use(dynamicRateLimiter());

// ===== PUBLIC AUTHENTICATION ROUTES =====

// Register new manufacturer account (strict rate limiting to prevent abuse)
router.post(
  '/register',
  strictRateLimiter(), // Prevent registration spam
  validateBody(registerManufacturerSchema),
  trackManufacturerAction('register'),
  mfgCtrl.register
);

// Manufacturer login (strict rate limiting to prevent brute force)
router.post(
  '/login',
  strictRateLimiter(), // Prevent brute force attacks
  validateBody(loginManufacturerSchema),
  trackManufacturerAction('login'),
  mfgCtrl.login
);

// Verify manufacturer token (utility endpoint)
router.post(
  '/verify-token',
  strictRateLimiter(),
  mfgCtrl.verifyToken
);

// ===== PUBLIC MANUFACTURER DISCOVERY =====

// Search for manufacturers (public endpoint for brands)
router.get(
  '/search',
  validateQuery(listBrandsQuerySchema), // Reuse for search filters
  mfgCtrl.searchManufacturers
);

// ===== PROTECTED MANUFACTURER ROUTES =====

// All routes below require valid manufacturer JWT
router.use(authenticateManufacturer);

// Get manufacturer profile
router.get(
  '/profile',
  trackManufacturerAction('view_profile'),
  mfgCtrl.getProfile
);

// Update manufacturer profile
router.put(
  '/profile',
  validateBody(updateManufacturerProfileSchema),
  trackManufacturerAction('update_profile'),
  mfgCtrl.updateProfile
);

// Get manufacturer dashboard summary
router.get(
  '/dashboard',
  trackManufacturerAction('view_dashboard'),
  mfgCtrl.getDashboardSummary
);

// Refresh manufacturer authentication token
router.post(
  '/refresh',
  trackManufacturerAction('refresh_token'),
  mfgCtrl.refreshToken
);

// Logout manufacturer (clear cookies and invalidate session)
router.post(
  '/logout',
  trackManufacturerAction('logout'),
  mfgCtrl.logout
);

// ===== BRAND RELATIONSHIP ROUTES =====

// List connected brands with filtering and pagination
router.get(
  '/brands',
  validateQuery(listBrandsQuerySchema),
  trackManufacturerAction('list_brands'),
  mfgCtrl.listBrandsForManufacturer
);

// Get specific brand connection status
router.get(
  '/brands/:brandId/connection-status',
  validateParams(brandParamsSchema),
  trackManufacturerAction('check_connection_status'),
  mfgCtrl.getConnectionStatus
);

// Check if manufacturer can connect to a brand
router.get(
  '/brands/:brandId/can-connect',
  validateParams(brandParamsSchema),
  trackManufacturerAction('check_can_connect'),
  mfgCtrl.canConnectToBrand
);

// Create connection request to a brand
router.post(
  '/brands/:brandId/connect',
  validateParams(brandParamsSchema),
  validateBody(Joi.object({
    message: Joi.string().trim().max(1000).optional(),
    services: Joi.array().items(Joi.string().trim().max(100)).max(10).optional(),
    proposedServices: Joi.array().items(Joi.string().trim().max(100)).max(10).optional(),
    timeline: Joi.string().trim().max(200).optional(),
    budget: Joi.string().trim().max(200).optional(),
    portfolio: Joi.string().trim().max(500).optional()
  })),
  trackManufacturerAction('create_connection'),
  mfgCtrl.createConnectionRequest
);

// ===== VERIFIED MANUFACTURER ROUTES =====

// Routes below require verified manufacturer status
router.use(requireVerifiedManufacturer);

// Get results/analytics for specific brand
router.get(
  '/brands/:brandSettingsId/results',
  validateParams(brandParamsSchema),
  validateQuery(listBrandsQuerySchema), // For analytics filtering
  trackManufacturerAction('view_brand_results'),
  mfgCtrl.getResultsForBrand
);

// Get comprehensive analytics for a brand
router.get(
  '/brands/:brandSettingsId/analytics',
  validateParams(brandParamsSchema),
  validateQuery(listBrandsQuerySchema), // For timeframe filtering
  trackManufacturerAction('view_comprehensive_analytics'),
  mfgCtrl.getComprehensiveAnalytics
);

// ===== SUPPLY CHAIN MANAGEMENT ROUTES =====

// Deploy supply chain contract
router.post(
  '/account/supply-chain/deploy',
  authenticateManufacturer,
  validateBody(Joi.object({
    manufacturerName: Joi.string().required().min(2).max(100).trim()
  })),
  trackManufacturerAction('deploy_supply_chain_contract'),
  mfgAccountCtrl.deploySupplyChainContract
);

// Get supply chain contract info
router.get(
  '/account/supply-chain/contract',
  authenticateManufacturer,
  trackManufacturerAction('get_supply_chain_contract'),
  mfgAccountCtrl.getSupplyChainContract
);

// Create supply chain endpoint
router.post(
  '/account/supply-chain/endpoints',
  authenticateManufacturer,
  validateBody(Joi.object({
    name: Joi.string().required().min(2).max(100).trim(),
    eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
    location: Joi.string().required().min(2).max(200).trim()
  })),
  trackManufacturerAction('create_supply_chain_endpoint'),
  mfgAccountCtrl.createSupplyChainEndpoint
);

// Get all supply chain endpoints
router.get(
  '/account/supply-chain/endpoints',
  authenticateManufacturer,
  trackManufacturerAction('get_supply_chain_endpoints'),
  mfgAccountCtrl.getSupplyChainEndpoints
);

// Register product for supply chain tracking
router.post(
  '/account/supply-chain/products',
  authenticateManufacturer,
  validateBody(Joi.object({
    productId: Joi.string().required().min(1).max(100).trim(),
    name: Joi.string().required().min(2).max(200).trim(),
    description: Joi.string().optional().max(1000).trim()
  })),
  trackManufacturerAction('register_supply_chain_product'),
  mfgAccountCtrl.registerSupplyChainProduct
);

// Get all supply chain products
router.get(
  '/account/supply-chain/products',
  authenticateManufacturer,
  trackManufacturerAction('get_supply_chain_products'),
  mfgAccountCtrl.getSupplyChainProducts
);

// Log supply chain event
router.post(
  '/account/supply-chain/events',
  authenticateManufacturer,
  validateBody(Joi.object({
    endpointId: Joi.number().integer().positive().required(),
    productId: Joi.string().required().min(1).max(100).trim(),
    eventType: Joi.string().required().min(2).max(50).trim(),
    location: Joi.string().required().min(2).max(200).trim(),
    details: Joi.string().optional().max(1000).trim()
  })),
  trackManufacturerAction('log_supply_chain_event'),
  mfgAccountCtrl.logSupplyChainEvent
);

// Get supply chain events for a product
router.get(
  '/account/supply-chain/products/:productId/events',
  authenticateManufacturer,
  validateParams(Joi.object({
    productId: Joi.string().required().min(1).max(100).trim()
  })),
  trackManufacturerAction('get_supply_chain_product_events'),
  mfgAccountCtrl.getSupplyChainProductEvents
);

// Get supply chain dashboard
router.get(
  '/account/supply-chain/dashboard',
  authenticateManufacturer,
  trackManufacturerAction('get_supply_chain_dashboard'),
  mfgAccountCtrl.getSupplyChainDashboard
);

export default router;

