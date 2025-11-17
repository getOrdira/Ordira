// src/routes/core/auth.routes.ts
// Authentication routes using modular auth controller

import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { authController } from '../../controllers/core/auth.controller';
import { validateBody } from '../../middleware/validation/validation.middleware'; 
import { strictRateLimiter } from '../../middleware/limits/rateLimiter.middleware';
import { authenticate } from '../../middleware/auth/unifiedAuth.middleware';
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

const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().max(100).optional(),
  lastName: Joi.string().trim().max(100).optional(),
  businessId: Joi.string().trim().optional(),
  brandSlug: Joi.string().trim().optional()
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
 */
router.post(
  '/login',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(loginSchema),
  asRouteHandler(authController.login.bind(authController))
);

router.post(
  '/register',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(registerSchema),
  asRouteHandler(authController.register.bind(authController))
);

router.post(
  '/verify',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(verifySchema),
  asRouteHandler(authController.verify.bind(authController))
);

router.post(
  '/forgot-password',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(forgotPasswordSchema),
  asRouteHandler(authController.forgotPassword.bind(authController))
);

router.post(
  '/reset-password',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(resetPasswordSchema),
  asRouteHandler(authController.resetPassword.bind(authController))
);

router.post(
  '/resend-verification',
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

