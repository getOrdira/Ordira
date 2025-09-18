
// src/routes/supplyChain.routes.ts
import { Router } from 'express';
import { authenticate, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { strictRateLimiter, dynamicRateLimiter, enhancedSupplyChainRateLimiter } from '../middleware/rateLimiter.middleware';
import * as supplyChainCtrl from '../controllers/supplyChain.controller';
import {
  contractDeploymentSchema,
  endpointSchema,
  productSchema,
  eventSchema,
  qrScanSchema,
  locationSchema,
  batchQrCodeSchema,
  supplyChainQuerySchema
} from '../validation/supplyChain.validation';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers'; 

const router = Router();

// ===== ROUTES =====

/**
 * POST /api/supply-chain/deploy
 * Deploy a new SupplyChain contract for the manufacturer
 * 
 * @requires authentication: manufacturer
 * @requires validation: manufacturer name
 * @rate-limited: strict for contract deployment
 */
router.post(
  '/deploy',
  asRateLimitHandler(strictRateLimiter()), // Strict rate limiting for contract deployment
  authenticate, requireManufacturer,
  validateBody(contractDeploymentSchema),
  asRouteHandler(supplyChainCtrl.deployContract)
);

/**
 * GET /api/supply-chain/contract
 * Get supply chain contract information and statistics
 * 
 * @requires authentication: manufacturer
 * @returns contract address, stats, deployment info
 */
router.get(
  '/contract',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getContract)
);

/**
 * POST /api/supply-chain/endpoints
 * Create a new supply chain endpoint
 * 
 * @requires authentication: manufacturer
 * @requires validation: endpoint data
 * @rate-limited: moderate for endpoint creation
 */
router.post(
  '/endpoints',
  asRateLimitHandler(dynamicRateLimiter()), // Dynamic rate limiting based on manufacturer plan
  authenticate, requireManufacturer,
  validateBody(endpointSchema),
  asRouteHandler(supplyChainCtrl.createEndpoint)
);

/**
 * GET /api/supply-chain/endpoints
 * Get all endpoints for the manufacturer's contract
 * 
 * @requires authentication: manufacturer
 * @returns array of endpoints with details
 */
router.get(
  '/endpoints',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getEndpoints)
);

/**
 * POST /api/supply-chain/products
 * Register a new product for supply chain tracking
 * 
 * @requires authentication: manufacturer
 * @requires validation: product data
 * @rate-limited: moderate for product registration
 */
router.post(
  '/products',
  asRateLimitHandler(dynamicRateLimiter()), // Dynamic rate limiting based on manufacturer plan
  authenticate, requireManufacturer,
  validateBody(productSchema),
  asRouteHandler(supplyChainCtrl.registerProduct)
);

/**
 * GET /api/supply-chain/products
 * Get all registered products
 * 
 * @requires authentication: manufacturer
 * @optional query: page, limit, productId, eventType
 * @returns array of products with details
 */
router.get(
  '/products',
  authenticate, requireManufacturer,
  validateQuery(supplyChainQuerySchema),
  asRouteHandler(supplyChainCtrl.getProducts)
);

/**
 * GET /api/supply-chain/products/:productId/events
 * Get all events for a specific product
 * 
 * @requires authentication: manufacturer
 * @requires params: productId
 * @optional query: page, limit, eventType, startDate, endDate
 * @returns array of events for the product
 */
router.get(
  '/products/:productId/events',
  authenticate, requireManufacturer,
  validateQuery(supplyChainQuerySchema),
  asRouteHandler(supplyChainCtrl.getProductEvents)
);

/**
 * POST /api/products/:id/supply-chain/events
 * Log a supply chain event for a product
 * 
 * @requires authentication: manufacturer
 * @requires validation: event data
 * @rate-limited: moderate for event logging
 */
router.post(
  '/products/:id/supply-chain/events',
  enhancedSupplyChainRateLimiter(), // Enhanced rate limiting for blockchain transactions
  authenticate, requireManufacturer,
  validateBody(eventSchema),
  asRouteHandler(supplyChainCtrl.logEvent)
);

/**
 * GET /api/products/:id/supply-chain/tracking
 * Get comprehensive tracking data for a product
 * 
 * @requires authentication: manufacturer
 * @returns tracking timeline and analytics
 */
router.get(
  '/products/:id/supply-chain/tracking',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getTrackingData)
);

/**
 * GET /api/products/:id/supply-chain/events
 * Get all supply chain events for a product
 * 
 * @requires authentication: manufacturer
 * @returns array of events with blockchain data
 */
router.get(
  '/products/:id/supply-chain/events',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getEvents)
);

/**
 * POST /api/supply-chain/scan-qr
 * Scan QR code and log supply chain event
 * 
 * @requires authentication: manufacturer
 * @requires validation: QR code data and event information
 * @rate-limited: enhanced for QR scanning
 */
router.post(
  '/scan-qr',
  enhancedSupplyChainRateLimiter(),
  authenticate, requireManufacturer,
  validateBody(qrScanSchema),
  asRouteHandler(supplyChainCtrl.scanQrCode)
);

/**
 * POST /api/supply-chain/qr-codes/batch
 * Generate QR codes for multiple products as a batch
 * Useful for tracking multiple products together (e.g., 50 T-shirts shipped together)
 * 
 * @requires authentication: manufacturer
 * @requires validation: array of product IDs
 * @rate-limited: enhanced for batch operations
 */
router.post(
  '/qr-codes/batch',
  enhancedSupplyChainRateLimiter(),
  authenticate, requireManufacturer,
  validateBody(batchQrCodeSchema),
  asRouteHandler(supplyChainCtrl.generateBatchQrCodes)
);

/**
 * POST /api/supply-chain/locations
 * Create a new location for supply chain tracking
 * 
 * @requires authentication: manufacturer
 * @requires validation: location data
 * @rate-limited: moderate for location creation
 */
router.post(
  '/locations',
  asRateLimitHandler(dynamicRateLimiter()),
  authenticate, requireManufacturer,
  validateBody(locationSchema),
  asRouteHandler(supplyChainCtrl.createLocation)
);

/**
 * GET /api/supply-chain/locations
 * Get all locations for the manufacturer
 * 
 * @requires authentication: manufacturer
 * @optional query: eventType, locationType, active, page, limit
 * @returns array of locations with filtering
 */
router.get(
  '/locations',
  authenticate, requireManufacturer,
  validateQuery(supplyChainQuerySchema),
  asRouteHandler(supplyChainCtrl.getLocations)
);

/**
 * GET /api/supply-chain/locations/:id
 * Get specific location details
 * 
 * @requires authentication: manufacturer
 * @requires params: location ID
 * @returns location details
 */
router.get(
  '/locations/:id',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getLocation)
);

/**
 * PUT /api/supply-chain/locations/:id
 * Update location information
 * 
 * @requires authentication: manufacturer
 * @requires validation: updated location data
 * @rate-limited: moderate for location updates
 */
router.put(
  '/locations/:id',
  asRateLimitHandler(dynamicRateLimiter()),
  authenticate, requireManufacturer,
  validateBody(locationSchema),
  asRouteHandler(supplyChainCtrl.updateLocation)
);

/**
 * DELETE /api/supply-chain/locations/:id
 * Deactivate location (soft delete)
 * 
 * @requires authentication: manufacturer
 * @requires params: location ID
 * @rate-limited: moderate for location deletion
 */
router.delete(
  '/locations/:id',
  asRateLimitHandler(dynamicRateLimiter()),
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.deleteLocation)
);

/**
 * GET /api/supply-chain/locations/nearby
 * Find locations within radius of given coordinates
 * 
 * @requires authentication: manufacturer
 * @requires query: lat, lng, radius (optional), page, limit
 * @returns nearby locations
 */
router.get(
  '/locations/nearby',
  authenticate, requireManufacturer,
  validateQuery(supplyChainQuerySchema),
  asRouteHandler(supplyChainCtrl.getNearbyLocations)
);

/**
 * GET /api/supply-chain/locations/stats
 * Get location statistics for manufacturer
 * 
 * @requires authentication: manufacturer
 * @returns location statistics and analytics
 */
router.get(
  '/locations/stats',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getLocationStats)
);

/**
 * GET /api/supply-chain/rate-limits
 * Get current rate limit information for the manufacturer
 * 
 * @requires authentication: manufacturer
 * @returns rate limit details and current usage
 */
router.get(
  '/rate-limits',
  authenticate, requireManufacturer,
  asRouteHandler(supplyChainCtrl.getRateLimitInfo)
);

export default router;
