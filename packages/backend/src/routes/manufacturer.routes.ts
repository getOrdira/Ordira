// src/routes/manufacturer.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as mfgCtrl from '../controllers/manufacturer.controller';
import {
  registerManufacturerSchema,
  loginManufacturerSchema,
  listBrandsQuerySchema,
  brandParamsSchema,
  manufacturerVerificationSchema,
  updateManufacturerProfileSchema
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
  mfgCtrl.register
);

// Manufacturer login (strict rate limiting to prevent brute force)
router.post(
  '/login',
  strictRateLimiter(), // Prevent brute force attacks
  validateBody(loginManufacturerSchema),
  mfgCtrl.login
);

// Verify manufacturer email (strict rate limiting)
router.post(
  '/verify',
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema),
  mfgCtrl.verifyEmail
);

// Request password reset (strict rate limiting)
router.post(
  '/forgot-password',
  strictRateLimiter(),
  validateBody(loginManufacturerSchema.extract(['email'])),
  mfgCtrl.forgotPassword
);

// Reset password (strict rate limiting)
router.post(
  '/reset-password',
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema),
  mfgCtrl.resetPassword
);

// ===== PROTECTED MANUFACTURER ROUTES =====

// All routes below require valid manufacturer JWT
router.use(authenticateManufacturer);

// Get manufacturer profile
router.get(
  '/profile',
  mfgCtrl.getProfile
);

// Update manufacturer profile
router.put(
  '/profile',
  validateBody(updateManufacturerProfileSchema),
  mfgCtrl.updateProfile
);

// Submit verification documents (verified manufacturers only eventually)
router.post(
  '/verification',
  validateBody(manufacturerVerificationSchema),
  mfgCtrl.submitVerification
);

// Get verification status
router.get(
  '/verification/status',
  mfgCtrl.getVerificationStatus
);

// ===== BRAND RELATIONSHIP ROUTES =====

// List connected brands with filtering and pagination
router.get(
  '/brands',
  validateQuery(listBrandsQuerySchema),
  mfgCtrl.listBrandsForManufacturer
);

// Get specific brand details
router.get(
  '/brands/:brandId',
  validateParams(brandParamsSchema),
  mfgCtrl.getBrandDetails
);

// Get results/analytics for specific brand (verified manufacturers only)
router.get(
  '/brands/:brandId/results',
  requireVerifiedManufacturer, // Extra verification requirement
  validateParams(brandParamsSchema),
  validateQuery(listBrandsQuerySchema), // Reuse for date filtering
  mfgCtrl.getResultsForBrand
);

// Get orders from specific brand
router.get(
  '/brands/:brandId/orders',
  validateParams(brandParamsSchema),
  validateQuery(listBrandsQuerySchema),
  mfgCtrl.getOrdersFromBrand
);

// Update collaboration status with brand
router.put(
  '/brands/:brandId/status',
  validateParams(brandParamsSchema),
  validateBody(registerManufacturerSchema.extract(['status'])), // Reuse status validation
  mfgCtrl.updateBrandCollaborationStatus
);

// ===== PRODUCT & ORDER MANAGEMENT =====

// List manufacturer's products
router.get(
  '/products',
  validateQuery(listBrandsQuerySchema), // Reuse for pagination
  mfgCtrl.listManufacturerProducts
);

// Create new product
router.post(
  '/products',
  validateBody(updateManufacturerProfileSchema), // Reuse for product data
  mfgCtrl.createProduct
);

// Update product
router.put(
  '/products/:productId',
  validateParams(brandParamsSchema), // Reuse for ObjectId validation
  validateBody(updateManufacturerProfileSchema),
  mfgCtrl.updateProduct
);

// Get manufacturing analytics
router.get(
  '/analytics',
  validateQuery(listBrandsQuerySchema),
  mfgCtrl.getManufacturingAnalytics
);

// ===== NOTIFICATION & COMMUNICATION ROUTES =====

// Get notifications
router.get(
  '/notifications',
  validateQuery(listBrandsQuerySchema),
  mfgCtrl.getNotifications
);

// Mark notification as read
router.put(
  '/notifications/:notificationId/read',
  validateParams(brandParamsSchema),
  mfgCtrl.markNotificationRead
);

export default router;

