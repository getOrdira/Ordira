
// src/routes/manufacturer.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';
import { authenticate, requireVerifiedManufacturer, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as mfgCtrl from '../controllers/manufacturer.controller';
import * as mfgAccountCtrl from '../controllers/manufacturerAccount.controller';
import * as supplyChainDashboardCtrl from '../controllers/supplyChainDashboard.controller';
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
router.use(asRateLimitHandler(dynamicRateLimiter()));

// ===== PUBLIC AUTHENTICATION ROUTES =====

// Register new manufacturer account (strict rate limiting to prevent abuse)
router.post(
  '/register',
  asRateLimitHandler(strictRateLimiter()), // Prevent registration spam
  validateBody(registerManufacturerSchema),
  trackManufacturerAction('register'),
  asRouteHandler(mfgCtrl.register)
);

// Manufacturer login (strict rate limiting to prevent brute force)
router.post(
  '/login',
  asRateLimitHandler(strictRateLimiter()), // Prevent brute force attacks
  validateBody(loginManufacturerSchema),
  trackManufacturerAction('login'),
  asRouteHandler(mfgCtrl.login)
);

// Verify manufacturer token (utility endpoint)
router.post(
  '/verify-token',
  asRateLimitHandler(strictRateLimiter()),
  asRouteHandler(mfgCtrl.verifyToken)
);

// ===== PUBLIC MANUFACTURER DISCOVERY =====

// Search for manufacturers (public endpoint for brands)
router.get(
  '/search',
  validateQuery(listBrandsQuerySchema), // Reuse for search filters
  asRouteHandler(mfgCtrl.searchManufacturers)
);

// ===== PROTECTED MANUFACTURER ROUTES =====

// All routes below require valid manufacturer JWT
router.use(authenticate, requireManufacturer);

// Get manufacturer profile
router.get(
  '/profile',
  trackManufacturerAction('view_profile'),
  asRouteHandler(mfgCtrl.getProfile)
);

// Update manufacturer profile
router.put(
  '/profile',
  validateBody(updateManufacturerProfileSchema),
  trackManufacturerAction('update_profile'),
  asRouteHandler(mfgCtrl.updateProfile)
);

// Get manufacturer dashboard summary
router.get(
  '/dashboard',
  trackManufacturerAction('view_dashboard'),
  asRouteHandler(mfgCtrl.getDashboardSummary)
);

// Refresh manufacturer authentication token
router.post(
  '/refresh',
  trackManufacturerAction('refresh_token'),
  asRouteHandler(mfgCtrl.refreshToken)
);

// Logout manufacturer (clear cookies and invalidate session)
router.post(
  '/logout',
  trackManufacturerAction('logout'),
  asRouteHandler(mfgCtrl.logout)
);

// ===== BRAND RELATIONSHIP ROUTES =====

// List connected brands with filtering and pagination
router.get(
  '/brands',
  validateQuery(listBrandsQuerySchema),
  trackManufacturerAction('list_brands'),
  asRouteHandler(mfgCtrl.listBrandsForManufacturer)
);

// Get specific brand connection status
router.get(
  '/brands/:brandId/connection-status',
  validateParams(brandParamsSchema),
  trackManufacturerAction('check_connection_status'),
  asRouteHandler(mfgCtrl.getConnectionStatus)
);

// Check if manufacturer can connect to a brand
router.get(
  '/brands/:brandId/can-connect',
  validateParams(brandParamsSchema),
  trackManufacturerAction('check_can_connect'),
  asRouteHandler(mfgCtrl.canConnectToBrand)
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
  asRouteHandler(mfgCtrl.createConnectionRequest)
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
  asRouteHandler(mfgCtrl.getResultsForBrand)
);

// Get comprehensive analytics for a brand
router.get(
  '/brands/:brandSettingsId/analytics',
  validateParams(brandParamsSchema),
  validateQuery(listBrandsQuerySchema), // For timeframe filtering
  trackManufacturerAction('view_comprehensive_analytics'),
  asRouteHandler(mfgCtrl.getComprehensiveAnalytics)
);

// ===== SUPPLY CHAIN MANAGEMENT ROUTES =====

// Deploy supply chain contract
router.post(
  '/account/supply-chain/deploy',
  authenticate,
  validateBody(Joi.object({
    manufacturerName: Joi.string().required().min(2).max(100).trim()
  })),
  trackManufacturerAction('deploy_supply_chain_contract'),
  asRouteHandler(mfgAccountCtrl.deploySupplyChainContract)
);

// Get supply chain contract info
router.get(
  '/account/supply-chain/contract',
  authenticate,
  trackManufacturerAction('get_supply_chain_contract'),
  asRouteHandler(mfgAccountCtrl.getSupplyChainContract)
);

// Create supply chain endpoint
router.post(
  '/account/supply-chain/endpoints',
  authenticate,
  validateBody(Joi.object({
    name: Joi.string().required().min(2).max(100).trim(),
    eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
    location: Joi.string().required().min(2).max(200).trim()
  })),
  trackManufacturerAction('create_supply_chain_endpoint'),
  asRouteHandler(mfgAccountCtrl.createSupplyChainEndpoint)
);

// Get all supply chain endpoints
router.get(
  '/account/supply-chain/endpoints',
  authenticate,
  trackManufacturerAction('get_supply_chain_endpoints'),
  asRouteHandler(mfgAccountCtrl.getSupplyChainEndpoints)
);

// Register product for supply chain tracking
router.post(
  '/account/supply-chain/products',
  authenticate,
  validateBody(Joi.object({
    productId: Joi.string().required().min(1).max(100).trim(),
    name: Joi.string().required().min(2).max(200).trim(),
    description: Joi.string().optional().max(1000).trim()
  })),
  trackManufacturerAction('register_supply_chain_product'),
  asRouteHandler(mfgAccountCtrl.registerSupplyChainProduct)
);

// Get all supply chain products
router.get(
  '/account/supply-chain/products',
  authenticate,
  trackManufacturerAction('get_supply_chain_products'),
  asRouteHandler(mfgAccountCtrl.getSupplyChainProducts)
);

// Log supply chain event
router.post(
  '/account/supply-chain/events',
  authenticate,
  validateBody(Joi.object({
    endpointId: Joi.number().integer().positive().required(),
    productId: Joi.string().required().min(1).max(100).trim(),
    eventType: Joi.string().required().min(2).max(50).trim(),
    location: Joi.string().required().min(2).max(200).trim(),
    details: Joi.string().optional().max(1000).trim()
  })),
  trackManufacturerAction('log_supply_chain_event'),
  asRouteHandler(mfgAccountCtrl.logSupplyChainEvent)
);

// Get supply chain events for a product
router.get(
  '/account/supply-chain/products/:productId/events',
  authenticate,
  validateParams(Joi.object({
    productId: Joi.string().required().min(1).max(100).trim()
  })),
  trackManufacturerAction('get_supply_chain_product_events'),
  asRouteHandler(mfgAccountCtrl.getSupplyChainProductEvents)
);

// Get supply chain dashboard
router.get(
  '/account/supply-chain/dashboard',
  authenticate,
  trackManufacturerAction('get_supply_chain_dashboard'),
  asRouteHandler(mfgAccountCtrl.getSupplyChainDashboard)
);

// Generate QR code for product
router.post(
  '/account/supply-chain/products/:productId/qr-code',
  authenticate,
  trackManufacturerAction('generate_product_qr_code'),
  asRouteHandler(mfgAccountCtrl.generateProductQrCode)
);

// Generate QR codes for multiple products
router.post(
  '/account/supply-chain/products/qr-codes/batch',
  authenticate,
  validateBody(Joi.object({
    productIds: Joi.array().items(Joi.string().required()).min(1).max(50).required()
  })),
  trackManufacturerAction('generate_batch_product_qr_codes'),
  asRouteHandler(mfgAccountCtrl.generateBatchProductQrCodes)
);

// Get QR code information for product
router.get(
  '/account/supply-chain/products/:productId/qr-code',
  authenticate,
  trackManufacturerAction('get_product_qr_code_info'),
  asRouteHandler(mfgAccountCtrl.getProductQrCodeInfo)
);

// ===== SUPPLY CHAIN DASHBOARD ROUTES =====

// Get supply chain overview for dashboard
router.get(
  '/supply-chain/overview',
  authenticate,
  trackManufacturerAction('get_supply_chain_overview'),
  asRouteHandler(supplyChainDashboardCtrl.getSupplyChainOverview)
);

// Get supply chain analytics
router.get(
  '/supply-chain/analytics',
  authenticate,
  validateQuery(Joi.object({
    timeframe: Joi.string().valid('7d', '30d', '90d').optional(),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').optional()
  })),
  trackManufacturerAction('get_supply_chain_analytics'),
  asRouteHandler(supplyChainDashboardCtrl.getSupplyChainAnalytics)
);

// Get quick actions for supply chain
router.get(
  '/supply-chain/quick-actions',
  authenticate,
  trackManufacturerAction('get_supply_chain_quick_actions'),
  asRouteHandler(supplyChainDashboardCtrl.getQuickActions)
);

export default router;

