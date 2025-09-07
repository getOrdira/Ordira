// src/routes/supplyChain.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { strictRateLimiter, dynamicRateLimiter, enhancedSupplyChainRateLimiter } from '../middleware/rateLimiter.middleware';
import * as supplyChainCtrl from '../controllers/supplyChain.controller';

const router = Router();

// ===== VALIDATION SCHEMAS =====

const contractDeploymentSchema = Joi.object({
  manufacturerName: Joi.string().required().min(2).max(100).pattern(/^[a-zA-Z0-9\s\-&.,()]+$/)
});

const endpointSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  location: Joi.string().required().min(2).max(200)
});

const productSchema = Joi.object({
  productId: Joi.string().required().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().optional().max(500)
});

const eventSchema = Joi.object({
  productId: Joi.string().required().min(1).max(50),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  eventData: Joi.object({
    location: Joi.string().max(200),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180)
    }),
    temperature: Joi.number().min(-50).max(100),
    humidity: Joi.number().min(0).max(100),
    qualityMetrics: Joi.object()
  }).optional()
});

const qrScanSchema = Joi.object({
  qrCodeData: Joi.string().required().min(10),
  eventType: Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered').required(),
  eventData: Joi.object({
    location: Joi.string().max(200),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180)
    }),
    temperature: Joi.number().min(-50).max(100),
    humidity: Joi.number().min(0).max(100),
    qualityMetrics: Joi.object(),
    notes: Joi.string().max(500)
  }).optional()
});

const locationSchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  description: Joi.string().optional().max(1000),
  address: Joi.string().required().min(5).max(500),
  city: Joi.string().required().min(2).max(100),
  state: Joi.string().required().min(2).max(100),
  country: Joi.string().required().min(2).max(100),
  postalCode: Joi.string().optional().max(20),
  coordinates: Joi.object({
    lat: Joi.number().required().min(-90).max(90),
    lng: Joi.number().required().min(-180).max(180)
  }).required(),
  locationType: Joi.string().valid('factory', 'warehouse', 'distribution_center', 'retail_store', 'custom').required(),
  capabilities: Joi.array().items(Joi.string().max(100)).optional(),
  allowedEventTypes: Joi.array().items(
    Joi.string().valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
  ).required().min(1),
  contactInfo: Joi.object({
    phone: Joi.string().optional().pattern(/^\+?[\d\s\-\(\)]+$/),
    email: Joi.string().optional().email(),
    contactPerson: Joi.string().optional().max(100)
  }).optional(),
  environmentalConditions: Joi.object({
    temperatureRange: Joi.object({
      min: Joi.number().min(-50).max(100),
      max: Joi.number().min(-50).max(100)
    }).optional(),
    humidityRange: Joi.object({
      min: Joi.number().min(0).max(100),
      max: Joi.number().min(0).max(100)
    }).optional(),
    specialRequirements: Joi.array().items(Joi.string().max(200)).optional()
  }).optional()
});

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
 * @returns array of products with details
 */
router.get(
  '/products',
  authenticateManufacturer,
  supplyChainCtrl.getProducts
);

/**
 * GET /api/supply-chain/products/:productId/events
 * Get all events for a specific product
 * 
 * @requires authentication: manufacturer
 * @requires params: productId
 * @returns array of events for the product
 */
router.get(
  '/products/:productId/events',
  authenticateManufacturer,
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
 * @optional query: eventType, locationType, active
 * @returns array of locations with filtering
 */
router.get(
  '/locations',
  authenticateManufacturer,
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
 * @requires query: lat, lng, radius (optional)
 * @returns nearby locations
 */
router.get(
  '/locations/nearby',
  authenticateManufacturer,
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
