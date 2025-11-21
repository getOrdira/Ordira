// src/routes/core/manufacturerAuth.routes.ts
// Manufacturer authentication routes

import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { manufacturerAuthController } from '../../controllers/core/manufacturerAuth.controller';
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
 * Manufacturer authentication validation schemas
 */
const registerManufacturerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  dateOfBirth: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().isoDate())
    .required()
    .messages({
      'date.base': 'Date of birth must be a valid date',
      'string.isoDate': 'Date of birth must be a valid ISO date string'
    }),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  businessName: Joi.string().trim().min(2).max(200).required(),
  address: Joi.string().trim().min(5).max(500).required(),
  businessNumber: Joi.string().trim().max(100).optional(),
  industry: Joi.string().trim().min(1).max(100).required(),
  website: Joi.string().uri().optional(),
  marketingConsent: Joi.boolean().required(),
  platformUpdatesConsent: Joi.boolean().required()
});

const loginManufacturerSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional()
});

const verifyManufacturerSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  verificationCode: Joi.string().trim().min(4).max(12).required()
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
  manufacturerId: Joi.string().hex().length(24).required()
});

/**
 * Manufacturer Authentication Routes
 * All auth endpoints enforce HTTPS in production for security
 */
router.post(
  '/register',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(registerManufacturerSchema),
  asRouteHandler(manufacturerAuthController.register.bind(manufacturerAuthController))
);

router.post(
  '/login',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(loginManufacturerSchema),
  asRouteHandler(manufacturerAuthController.login.bind(manufacturerAuthController))
);

router.post(
  '/verify',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(verifyManufacturerSchema),
  asRouteHandler(manufacturerAuthController.verify.bind(manufacturerAuthController))
);

router.post(
  '/forgot-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(forgotPasswordSchema),
  asRouteHandler(manufacturerAuthController.forgotPassword.bind(manufacturerAuthController))
);

router.post(
  '/reset-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resetPasswordSchema),
  asRouteHandler(manufacturerAuthController.resetPassword.bind(manufacturerAuthController))
);

router.post(
  '/resend-verification',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resendVerificationSchema),
  asRouteHandler(manufacturerAuthController.resendVerification.bind(manufacturerAuthController))
);

router.post(
  '/logout',
  authenticateMiddleware,
  asRouteHandler(manufacturerAuthController.logout.bind(manufacturerAuthController))
);

router.get(
  '/me',
  authenticateMiddleware,
  asRouteHandler(manufacturerAuthController.getProfile.bind(manufacturerAuthController))
);

export default router;

