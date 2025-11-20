// src/routes/core/auth.routes.ts
// Authentication routes using modular auth controller

import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { authController } from '../../controllers/core/auth.controller';
import { validateBody } from '../../middleware/validation/validation.middleware'; 
import { strictRateLimiter } from '../../middleware/limits/rateLimiter.middleware';
import { authenticate } from '../../middleware/auth/unifiedAuth.middleware';
import { authHttpsEnforcement } from '../../middleware/security/httpsEnforcement.middleware';
import { asRateLimitHandler, asRouteHandler } from '../../utils/routeHelpers';
import type { UnifiedAuthRequest } from '../../middleware/auth/unifiedAuth.middleware';

/**
 * Type-safe wrapper for authenticate middleware
 */
const authenticateMiddleware: RequestHandler = (req, res, next) => {
  authenticate(req as UnifiedAuthRequest, res, next).catch(next);
};

const router = Router();

/**
 * Core authentication validation schemas scoped to controller expectations.
 * These schemas keep inputs minimal and aligned to BaseRequest.validatedBody shape.
 */
const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional()
});

// Unified registration schema that handles all account types
const registerSchema = Joi.object({
  accountType: Joi.string().valid('user', 'business', 'manufacturer').required(),
  
  // Common fields
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  
  // User-specific fields (for frontend voting users)
  brandSlug: Joi.string().trim().optional().when('accountType', {
    is: 'user',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  
  // Business/Creator/Manufacturer fields
  firstName: Joi.string().trim().min(1).max(100).optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  lastName: Joi.string().trim().min(1).max(100).optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  businessName: Joi.string().trim().min(2).max(200).optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  businessNumber: Joi.string().trim().max(100).optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  website: Joi.string().uri().optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  
  // Manufacturer-specific
  industry: Joi.string().trim().min(1).max(100).optional().when('accountType', {
    is: 'manufacturer',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  
  // Marketing consents (required for business and manufacturer)
  marketingConsent: Joi.boolean().optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  platformUpdatesConsent: Joi.boolean().optional().when('accountType', {
    is: Joi.string().valid('business', 'manufacturer'),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  })
});

const verifySchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  code: Joi.string().trim().min(4).max(12).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().alphanum().min(32).max(256).required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional()
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().lowercase().required()
});

/**
 * Authentication Routes
 * All auth endpoints enforce HTTPS in production for security
 */
router.post(
  '/login',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(loginSchema),
  asRouteHandler(authController.login.bind(authController))
);

router.post(
  '/register',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(registerSchema),
  asRouteHandler(authController.register.bind(authController))
);

router.post(
  '/verify',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(verifySchema),
  asRouteHandler(authController.verify.bind(authController))
);

router.post(
  '/forgot-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(forgotPasswordSchema),
  asRouteHandler(authController.forgotPassword.bind(authController))
);

router.post(
  '/reset-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resetPasswordSchema),
  asRouteHandler(authController.resetPassword.bind(authController))
);

router.post(
  '/resend-verification',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resendVerificationSchema),
  asRouteHandler(authController.resendVerification.bind(authController))
);

router.post(
  '/logout',
  authenticateMiddleware,
  asRouteHandler(authController.logout.bind(authController))
);

router.get(
  '/me',
  authenticateMiddleware,
  asRouteHandler(authController.getProfile.bind(authController))
);

export default router;

