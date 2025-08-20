// src/routes/auth.routes.ts

import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as authCtrl from '../controllers/auth.controller';
import { authValidationSchemas } from '../validation/auth.validation';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas aligned with actual controller implementations
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Made optional since controller uses auth header
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

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email address is required',
    'any.required': 'Email is required'
  })
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  resetCode: Joi.string().required().messages({
    'any.required': 'Reset code is required'
  }),
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
 * CORE AUTHENTICATION ROUTES - ALIGNED WITH ACTUAL CONTROLLER METHODS
 */

/**
 * Business registration
 * POST /api/auth/register/business
 * Maps to: authCtrl.registerBusinessHandler
 */
router.post(
  '/register/business',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.registerBusiness),
  authCtrl.registerBusinessHandler
);

/**
 * Business email verification
 * POST /api/auth/verify/business
 * Maps to: authCtrl.verifyBusinessHandler
 */
router.post(
  '/verify/business',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.verifyBusiness),
  authCtrl.verifyBusinessHandler
);

/**
 * Business login
 * POST /api/auth/login/business
 * Maps to: authCtrl.loginBusinessHandler
 */
router.post(
  '/login/business',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.loginBusiness),
  authCtrl.loginBusinessHandler
);

/**
 * User registration
 * POST /api/auth/register/user
 * Maps to: authCtrl.registerUserHandler
 */
router.post(
  '/register/user',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.registerUser),
  authCtrl.registerUserHandler
);

/**
 * User email verification
 * POST /api/auth/verify/user
 * Maps to: authCtrl.verifyUserHandler
 */
router.post(
  '/verify/user',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.verifyUser),
  authCtrl.verifyUserHandler
);

/**
 * User login
 * POST /api/auth/login/user
 * Maps to: authCtrl.loginUserHandler
 */
router.post(
  '/login/user',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(authValidationSchemas.loginUser),
  authCtrl.loginUserHandler
);

/**
 * PASSWORD RECOVERY ROUTES
 */

/**
 * Request password reset
 * POST /api/auth/forgot-password
 * Maps to: authCtrl.forgotPasswordHandler
 */
router.post(
  '/forgot-password',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(forgotPasswordSchema),
  authCtrl.forgotPasswordHandler
);

/**
 * Reset password with code
 * POST /api/auth/reset-password
 * Maps to: authCtrl.resetPasswordHandler
 */
router.post(
  '/reset-password',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(resetPasswordSchema),
  authCtrl.resetPasswordHandler
);

/**
 * AUTHENTICATED USER ROUTES
 */

/**
 * Refresh authentication token
 * POST /api/auth/refresh
 * Maps to: authCtrl.refreshTokenHandler
 */
router.post(
  '/refresh',
  authenticate, // Uses auth middleware as per controller implementation
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(refreshTokenSchema),
  authCtrl.refreshTokenHandler
);

/**
 * Logout user
 * POST /api/auth/logout
 * Maps to: authCtrl.logoutHandler
 */
router.post(
  '/logout',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  authCtrl.logoutHandler
);

/**
 * Get current user profile
 * GET /api/auth/me
 * Maps to: authCtrl.getCurrentUserHandler
 */
router.get(
  '/me',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  authCtrl.getCurrentUserHandler
);

/**
 * ADDITIONAL AUTHENTICATION FEATURES
 */

/**
 * Change password (authenticated users)
 * POST /api/auth/change-password
 * Maps to: authCtrl.changePasswordHandler
 */
router.post(
  '/change-password',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(changePasswordSchema),
  authCtrl.changePasswordHandler
);

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 * Maps to: authCtrl.resendVerificationHandler
 */
router.post(
  '/resend-verification',
  strictRateLimiter(), // Fixed: No parameters
  validateBody(Joi.object({
    email: Joi.string().email().optional(),
    businessId: Joi.string().optional(),
    type: Joi.string().valid('business', 'user').optional()
  }).or('email', 'businessId')),
  authCtrl.resendVerificationHandler
);

/**
 * Check if email is available
 * POST /api/auth/check-email
 * Maps to: authCtrl.checkEmailAvailabilityHandler
 */
router.post(
  '/check-email',
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(Joi.object({
    email: Joi.string().email().required()
  })),
  authCtrl.checkEmailAvailabilityHandler
);

/**
 * Validate password strength
 * POST /api/auth/validate-password
 * Maps to: authCtrl.validatePasswordStrengthHandler
 */
router.post(
  '/validate-password',
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(Joi.object({
    password: Joi.string().required()
  })),
  authCtrl.validatePasswordStrengthHandler
);

/**
 * SESSION MANAGEMENT ROUTES
 */

/**
 * Get active sessions
 * GET /api/auth/sessions
 * Maps to: authCtrl.getActiveSessionsHandler
 */
router.get(
  '/sessions',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  authCtrl.getActiveSessionsHandler
);

/**
 * Revoke specific session
 * DELETE /api/auth/sessions/:sessionId
 * Maps to: authCtrl.revokeSessionHandler
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(Joi.object({
    sessionId: Joi.string().required()
  })),
  authCtrl.revokeSessionHandler
);

/**
 * Revoke all sessions (except current)
 * POST /api/auth/sessions/revoke-all
 * Maps to: authCtrl.revokeAllSessionsHandler
 */
router.post(
  '/sessions/revoke-all',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
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
 * Maps to: authCtrl.getLoginHistoryHandler
 */
router.get(
  '/login-history',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  authCtrl.getLoginHistoryHandler
);

/**
 * Get security events log
 * GET /api/auth/security-events
 * Maps to: authCtrl.getSecurityEventsHandler
 */
router.get(
  '/security-events',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
  authCtrl.getSecurityEventsHandler
);

/**
 * Update security preferences
 * PUT /api/auth/security-preferences
 * Maps to: authCtrl.updateSecurityPreferencesHandler
 */
router.put(
  '/security-preferences',
  authenticate,
  dynamicRateLimiter(), // Fixed: No parameters
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
 * Health check endpoint
 * GET /api/auth/health
 * 
 * @public endpoint
 */
router.get(
  '/health',
  dynamicRateLimiter(), // Fixed: No parameters
  (req, res) => {
    res.json({
      success: true,
      message: 'Authentication service is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      features: {
        businessAuth: true,
        userAuth: true,
        passwordReset: true,
        emailVerification: true,
        emailGating: true,
        sessionManagement: true,
        securityAudit: true
      }
    });
  }
);

export default router;


