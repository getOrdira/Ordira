// src/routes/supplyChain.routes.ts
import { Router } from 'express';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
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
  strictRateLimiter(), // Strict rate limiting for contract deployment
  authenticateManufacturer,
  validateBody(contractDeploymentSchema),
  supplyChainCtrl.deployContract
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
  authenticateManufacturer,
  supplyChainCtrl.getContract
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
  dynamicRateLimiter(), // Dynamic rate limiting based on manufacturer plan
  authenticateManufacturer,
  validateBody(endpointSchema),
  supplyChainCtrl.createEndpoint
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
  authenticateManufacturer,
  supplyChainCtrl.getEndpoints
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
  dynamicRateLimiter(), // Dynamic rate limiting based on manufacturer plan
  authenticateManufacturer,
  validateBody(productSchema),
  supplyChainCtrl.registerProduct
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
  authenticateManufacturer,
  validateQuery(supplyChainQuerySchema),
  supplyChainCtrl.getProducts
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
  authenticateManufacturer,
  validateQuery(supplyChainQuerySchema),
  supplyChainCtrl.getProductEvents
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
  authenticateManufacturer,
  validateBody(eventSchema),
  supplyChainCtrl.logEvent
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
  authenticateManufacturer,
  supplyChainCtrl.getTrackingData
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
  authenticateManufacturer,
  supplyChainCtrl.getEvents
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
  authenticateManufacturer,
  validateBody(qrScanSchema),
  supplyChainCtrl.scanQrCode
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
  authenticateManufacturer,
  validateBody(batchQrCodeSchema),
  supplyChainCtrl.generateBatchQrCodes
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
  dynamicRateLimiter(),
  authenticateManufacturer,
  validateBody(locationSchema),
  supplyChainCtrl.createLocation
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
  authenticateManufacturer,
  validateQuery(supplyChainQuerySchema),
  supplyChainCtrl.getLocations
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
  authenticateManufacturer,
  supplyChainCtrl.getLocation
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
  dynamicRateLimiter(),
  authenticateManufacturer,
  validateBody(locationSchema),
  supplyChainCtrl.updateLocation
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
  dynamicRateLimiter(),
  authenticateManufacturer,
  supplyChainCtrl.deleteLocation
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
  authenticateManufacturer,
  validateQuery(supplyChainQuerySchema),
  supplyChainCtrl.getNearbyLocations
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
  authenticateManufacturer,
  supplyChainCtrl.getLocationStats
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
  authenticateManufacturer,
  supplyChainCtrl.getRateLimitInfo
);

export default router;
