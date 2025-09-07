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
