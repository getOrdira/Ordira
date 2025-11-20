// src/routes/core/businessAuth.routes.ts
// Business authentication routes

import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { businessAuthController } from '../../controllers/core/businessAuth.controller';
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
 * Business authentication validation schemas
 */
const registerBusinessSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  businessName: Joi.string().trim().min(2).max(200).required(),
  businessNumber: Joi.string().trim().max(100).optional(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  website: Joi.string().uri().optional(),
  marketingConsent: Joi.boolean().required(),
  platformUpdatesConsent: Joi.boolean().required()
});

const loginBusinessSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional()
});

const verifyBusinessSchema = Joi.object({
  businessId: Joi.string().hex().length(24).required(),
  emailCode: Joi.string().trim().min(4).max(12).required()
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
  businessId: Joi.string().hex().length(24).required()
});

/**
 * Business Authentication Routes
 * All auth endpoints enforce HTTPS in production for security
 */
router.post(
  '/register',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(registerBusinessSchema),
  asRouteHandler(businessAuthController.register.bind(businessAuthController))
);

router.post(
  '/login',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(loginBusinessSchema),
  asRouteHandler(businessAuthController.login.bind(businessAuthController))
);

router.post(
  '/verify',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(verifyBusinessSchema),
  asRouteHandler(businessAuthController.verify.bind(businessAuthController))
);

router.post(
  '/forgot-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(forgotPasswordSchema),
  asRouteHandler(businessAuthController.forgotPassword.bind(businessAuthController))
);

router.post(
  '/reset-password',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resetPasswordSchema),
  asRouteHandler(businessAuthController.resetPassword.bind(businessAuthController))
);

router.post(
  '/resend-verification',
  authHttpsEnforcement,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resendVerificationSchema),
  asRouteHandler(businessAuthController.resendVerification.bind(businessAuthController))
);

router.post(
  '/logout',
  authenticateMiddleware,
  asRouteHandler(businessAuthController.logout.bind(businessAuthController))
);

router.get(
  '/me',
  authenticateMiddleware,
  asRouteHandler(businessAuthController.getProfile.bind(businessAuthController))
);

export default router;

