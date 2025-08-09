// src/routes/auth.routes.ts

import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as authCtrl from '../controllers/auth.controller';
import { authValidationSchemas } from '../validation/auth.validation';
import Joi from 'joi';

const router = Router();

/**
 * Additional validation schemas for enhanced auth endpoints
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required'
  })
});

const logoutSchema = Joi.object({
  allDevices: Joi.boolean().default(false).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

/**
 * BUSINESS AUTHENTICATION ROUTES
 */

/**
 * Business registration
 * POST /api/auth/register/business
 * 
 * @requires validation: business registration data
 * @rate-limited: 5 attempts per 15 minutes per IP
 */
router.post(
  '/register/business',
  strictRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }), // 5 attempts per 15 minutes
  validateBody(authValidationSchemas.registerBusiness),
  authCtrl.registerBusinessHandler
);

/**
 * Business email/phone verification
 * POST /api/auth/verify/business
 * 
 * @requires validation: verification codes
 * @rate-limited: 10 attempts per 15 minutes per IP
 */
router.post(
  '/verify/business',
  strictRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 attempts per 15 minutes
  validateBody(authValidationSchemas.verifyBusiness),
  authCtrl.verifyBusinessHandler
);

/**
 * Business login
 * POST /api/auth/login/business
 * 
 * @requires validation: login credentials
 * @rate-limited: 10 attempts per 15 minutes per IP
 */
router.post(
  '/login/business',
  strictRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 attempts per 15 minutes
  validateBody(authValidationSchemas.loginBusiness),
  authCtrl.loginBusinessHandler
);

/**
 * USER (CUSTOMER) AUTHENTICATION ROUTES
 */

/**
 * User registration
 * POST /api/auth/register/user
 * 
 * @requires validation: user registration data
 * @rate-limited: 10 attempts per 15 minutes per IP
 */
router.post(
  '/register/user',
  strictRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 attempts per 15 minutes
  validateBody(authValidationSchemas.registerUser),
  authCtrl.registerUserHandler
);

/**
 * User email verification
 * POST /api/auth/verify/user
 * 
 * @requires validation: verification code
 * @rate-limited: 15 attempts per 15 minutes per IP
 */
router.post(
  '/verify/user',
  strictRateLimiter({ max: 15, windowMs: 15 * 60 * 1000 }), // 15 attempts per 15 minutes
  validateBody(authValidationSchemas.verifyUser),
  authCtrl.verifyUserHandler
);

/**
 * User login
 * POST /api/auth/login/user
 * 
 * @requires validation: login credentials
 * @rate-limited: 15 attempts per 15 minutes per IP
 */
router.post(
  '/login/user',
  strictRateLimiter({ max: 15, windowMs: 15 * 60 * 1000 }), // 15 attempts per 15 minutes
  validateBody(authValidationSchemas.loginUser),
  authCtrl.loginUserHandler
);

/**
 * PASSWORD RECOVERY ROUTES
 */

/**
 * Request password reset
 * POST /api/auth/forgot-password
 * 
 * @requires validation: email address
 * @rate-limited: 5 attempts per 30 minutes per IP
 */
router.post(
  '/forgot-password',
  strictRateLimiter({ max: 5, windowMs: 30 * 60 * 1000 }), // 5 attempts per 30 minutes
  validateBody(authValidationSchemas.forgotPassword),
  authCtrl.forgotPasswordHandler
);

/**
 * Reset password with code
 * POST /api/auth/reset-password
 * 
 * @requires validation: reset code and new password
 * @rate-limited: 10 attempts per 30 minutes per IP
 */
router.post(
  '/reset-password',
  strictRateLimiter({ max: 10, windowMs: 30 * 60 * 1000 }), // 10 attempts per 30 minutes
  validateBody(authValidationSchemas.resetPassword),
  authCtrl.resetPasswordHandler
);

/**
 * AUTHENTICATED USER ROUTES
 */

/**
 * Change password (authenticated users)
 * POST /api/auth/change-password
 * 
 * @requires authentication
 * @requires validation: current and new password
 * @rate-limited: 5 attempts per 15 minutes
 */
router.post(
  '/change-password',
  authenticate,
  dynamicRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }), // 5 attempts per 15 minutes
  validateBody(changePasswordSchema),
  authCtrl.changePasswordHandler
);

/**
 * Refresh authentication token
 * POST /api/auth/refresh
 * 
 * @requires validation: refresh token
 * @rate-limited: 20 attempts per 15 minutes per IP
 */
router.post(
  '/refresh',
  dynamicRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 attempts per 15 minutes
  validateBody(refreshTokenSchema),
  authCtrl.refreshTokenHandler
);

/**
 * Logout user
 * POST /api/auth/logout
 * 
 * @requires authentication
 * @optional validation: logout options
 * @rate-limited: 30 attempts per 15 minutes
 */
router.post(
  '/logout',
  authenticate,
  dynamicRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 }), // 30 attempts per 15 minutes
  validateBody(logoutSchema),
  authCtrl.logoutHandler
);

/**
 * Get current user profile
 * GET /api/auth/me
 * 
 * @requires authentication
 * @rate-limited: 60 requests per minute
 */
router.get(
  '/me',
  authenticate,
  dynamicRateLimiter({ max: 60, windowMs: 60 * 1000 }), // 60 requests per minute
  authCtrl.getCurrentUserHandler
);

/**
 * VERIFICATION & RESEND ROUTES
 */

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 * 
 * @requires validation: email or phone
 * @rate-limited: 3 attempts per 15 minutes per IP
 */
router.post(
  '/resend-verification',
  strictRateLimiter({ max: 3, windowMs: 15 * 60 * 1000 }), // 3 attempts per 15 minutes
  validateBody(authValidationSchemas.resendVerification),
  authCtrl.resendVerificationHandler
);

/**
 * TWO-FACTOR AUTHENTICATION ROUTES
 */

/**
 * Setup two-factor authentication
 * POST /api/auth/2fa/setup
 * 
 * @requires authentication
 * @requires validation: 2FA method and phone (if SMS)
 * @rate-limited: 5 attempts per 30 minutes
 */
router.post(
  '/2fa/setup',
  authenticate,
  dynamicRateLimiter({ max: 5, windowMs: 30 * 60 * 1000 }), // 5 attempts per 30 minutes
  validateBody(authValidationSchemas.setupTwoFactor),
  authCtrl.setupTwoFactorHandler
);

/**
 * Verify two-factor authentication code
 * POST /api/auth/2fa/verify
 * 
 * @requires authentication
 * @requires validation: 2FA code or backup code
 * @rate-limited: 10 attempts per 15 minutes
 */
router.post(
  '/2fa/verify',
  authenticate,
  dynamicRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 attempts per 15 minutes
  validateBody(authValidationSchemas.verifyTwoFactor),
  authCtrl.verifyTwoFactorHandler
);

/**
 * Disable two-factor authentication
 * POST /api/auth/2fa/disable
 * 
 * @requires authentication
 * @requires validation: current password
 * @rate-limited: 3 attempts per 30 minutes
 */
router.post(
  '/2fa/disable',
  authenticate,
  dynamicRateLimiter({ max: 3, windowMs: 30 * 60 * 1000 }), // 3 attempts per 30 minutes
  validateBody(Joi.object({
    currentPassword: Joi.string().required(),
    confirmDisable: Joi.boolean().valid(true).required()
  })),
  authCtrl.disableTwoFactorHandler
);

/**
 * ACCOUNT RECOVERY & SECURITY ROUTES
 */

/**
 * Account recovery (when locked out)
 * POST /api/auth/account-recovery
 * 
 * @requires validation: recovery information
 * @rate-limited: 3 attempts per 24 hours per IP
 */
router.post(
  '/account-recovery',
  strictRateLimiter({ max: 3, windowMs: 24 * 60 * 60 * 1000 }), // 3 attempts per 24 hours
  validateBody(authValidationSchemas.accountRecovery),
  authCtrl.accountRecoveryHandler
);

/**
 * Get active sessions
 * GET /api/auth/sessions
 * 
 * @requires authentication
 * @rate-limited: 20 requests per 15 minutes
 */
router.get(
  '/sessions',
  authenticate,
  dynamicRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes
  authCtrl.getActiveSessionsHandler
);

/**
 * Revoke specific session
 * DELETE /api/auth/sessions/:sessionId
 * 
 * @requires authentication
 * @requires params: sessionId
 * @rate-limited: 10 requests per 15 minutes
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  dynamicRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 requests per 15 minutes
  authCtrl.revokeSessionHandler
);

/**
 * Revoke all sessions (except current)
 * POST /api/auth/sessions/revoke-all
 * 
 * @requires authentication
 * @requires validation: current password for security
 * @rate-limited: 5 attempts per 30 minutes
 */
router.post(
  '/sessions/revoke-all',
  authenticate,
  dynamicRateLimiter({ max: 5, windowMs: 30 * 60 * 1000 }), // 5 attempts per 30 minutes
  validateBody(Joi.object({
    currentPassword: Joi.string().required(),
    reason: Joi.string().max(200).optional()
  })),
  authCtrl.revokeAllSessionsHandler
);

/**
 * SECURITY & AUDIT ROUTES
 */

/**
 * Get login history
 * GET /api/auth/login-history
 * 
 * @requires authentication
 * @optional query: pagination and filtering
 * @rate-limited: 30 requests per 15 minutes
 */
router.get(
  '/login-history',
  authenticate,
  dynamicRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 }), // 30 requests per 15 minutes
  authCtrl.getLoginHistoryHandler
);

/**
 * Get security events log
 * GET /api/auth/security-events
 * 
 * @requires authentication
 * @optional query: pagination and filtering
 * @rate-limited: 20 requests per 15 minutes
 */
router.get(
  '/security-events',
  authenticate,
  dynamicRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes
  authCtrl.getSecurityEventsHandler
);

/**
 * Update security preferences
 * PUT /api/auth/security-preferences
 * 
 * @requires authentication
 * @requires validation: security preferences
 * @rate-limited: 10 requests per 30 minutes
 */
router.put(
  '/security-preferences',
  authenticate,
  dynamicRateLimiter({ max: 10, windowMs: 30 * 60 * 1000 }), // 10 requests per 30 minutes
  validateBody(Joi.object({
    emailNotifications: Joi.object({
      loginAlerts: Joi.boolean().default(true),
      passwordChanges: Joi.boolean().default(true),
      suspiciousActivity: Joi.boolean().default(true),
      newDeviceLogins: Joi.boolean().default(true)
    }).optional(),
    sessionTimeout: Joi.number().integer().min(15).max(1440).optional(), // 15 minutes to 24 hours
    requireTwoFactor: Joi.boolean().optional(),
    allowedDevices: Joi.number().integer().min(1).max(10).optional()
  })),
  authCtrl.updateSecurityPreferencesHandler
);

/**
 * UTILITY ROUTES
 */

/**
 * Check if email is available
 * POST /api/auth/check-email
 * 
 * @requires validation: email address
 * @rate-limited: 20 requests per 15 minutes per IP
 */
router.post(
  '/check-email',
  dynamicRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes
  validateBody(Joi.object({
    email: Joi.string().email().required()
  })),
  authCtrl.checkEmailAvailabilityHandler
);

/**
 * Validate password strength
 * POST /api/auth/validate-password
 * 
 * @requires validation: password
 * @rate-limited: 30 requests per 15 minutes per IP
 */
router.post(
  '/validate-password',
  dynamicRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 }), // 30 requests per 15 minutes
  validateBody(Joi.object({
    password: Joi.string().required()
  })),
  authCtrl.validatePasswordStrengthHandler
);

/**
 * Health check endpoint
 * GET /api/auth/health
 * 
 * @public endpoint
 * @rate-limited: 60 requests per minute per IP
 */
router.get(
  '/health',
  dynamicRateLimiter({ max: 60, windowMs: 60 * 1000 }), // 60 requests per minute
  (req, res) => {
    res.json({
      success: true,
      message: 'Authentication service is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  }
);

export default router;


