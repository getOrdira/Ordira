// @ts-nocheck
// src/routes/user.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { metricsMiddleware, trackManufacturerAction } from '../middleware/metrics.middleware';
import { uploadMiddleware, cleanupOnError } from '../middleware/upload.middleware';
import * as userCtrl from '../controllers/user.controller';
import {
  registerUserSchema,
  loginUserSchema,
  verifyUserSchema,
  updateUserProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  listUsersQuerySchema
} from '../validation/user.validation';
import Joi from 'joi';

const router = Router();

// ===== GLOBAL MIDDLEWARE FOR USER ROUTES =====

// Apply dynamic rate limiting to all user routes
router.use(dynamicRateLimiter());

// Apply metrics tracking to all user routes
router.use(metricsMiddleware);

/**
 * Schema for resend verification endpoint
 */
const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Schema for proposal ID parameter validation
 */
const proposalIdParamsSchema = Joi.object({
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId',
      'any.required': 'Proposal ID is required'
    })
});

// ===== PUBLIC AUTHENTICATION ROUTES =====
// These routes are for brand customers/users to create accounts and authenticate
// All registration and login routes use strict rate limiting for security

/**
 * POST /api/users/register
 * Register a new customer user account
 * 
 * @description Allows brand customers to create accounts with email verification
 * @rate-limited strict (prevent registration abuse)
 * @validation registerUserSchema
 * @public
 */
router.post(
  '/register',
  strictRateLimiter(), // Prevent registration abuse and spam accounts
  validateBody(registerUserSchema),
  userCtrl.registerUser
);

/**
 * POST /api/users/login
 * Authenticate user with email and password
 * 
 * @description User login with optional remember me functionality
 * @rate-limited strict (prevent brute force attacks)
 * @validation loginUserSchema
 * @public
 */
router.post(
  '/login',
  strictRateLimiter(), // Prevent brute force attacks
  validateBody(loginUserSchema),
  userCtrl.loginUser
);

/**
 * POST /api/users/verify
 * Verify user email with verification code
 * 
 * @description Complete email verification process with 6-digit code
 * @rate-limited strict (prevent verification spam)
 * @validation verifyUserSchema
 * @public
 */
router.post(
  '/verify',
  strictRateLimiter(), // Prevent verification code spam
  validateBody(verifyUserSchema),
  userCtrl.verifyUser
);

/**
 * POST /api/users/forgot-password
 * Initiate password reset process
 * 
 * @description Send password reset instructions to user's email
 * @rate-limited strict (prevent password reset abuse)
 * @validation forgotPasswordSchema
 * @public
 */
router.post(
  '/forgot-password',
  strictRateLimiter(), // Prevent password reset abuse
  validateBody(forgotPasswordSchema),
  userCtrl.forgotPassword
);

/**
 * POST /api/users/reset-password
 * Complete password reset with token
 * 
 * @description Reset password using email token and new password
 * @rate-limited strict (prevent reset token abuse)
 * @validation resetPasswordSchema
 * @public
 */
router.post(
  '/reset-password',
  strictRateLimiter(), // Prevent reset abuse
  validateBody(resetPasswordSchema),
  userCtrl.resetPassword
);

/**
 * POST /api/users/resend-verification
 * Resend email verification code
 * 
 * @description Resend verification email for unverified users
 * @rate-limited strict (prevent email spam)
 * @validation email only from registerUserSchema
 * @public
 */
router.post(
  '/resend-verification',
  strictRateLimiter(), // Prevent verification email spam
  validateBody(resendVerificationSchema),
  userCtrl.resendVerification
);

// ===== PROTECTED USER ROUTES =====
// All routes below require valid user authentication
// These routes are for authenticated brand customers/users

router.use(authenticate);

// ===== USER PROFILE MANAGEMENT =====

/**
 * GET /api/users/profile
 * Get current authenticated user's profile
 * 
 * @description Retrieve comprehensive user profile with analytics and insights
 * @requires authentication: user
 * @rate-limited dynamic
 */
router.get(
  '/profile',
  userCtrl.getUserProfile
);

/**
 * PUT /api/users/profile
 * Update authenticated user's profile
 * 
 * @description Update user profile information, preferences, and settings
 * @requires authentication: user
 * @validation updateUserProfileSchema
 * @rate-limited dynamic
 */
router.put(
  '/profile',
  validateBody(updateUserProfileSchema),
  userCtrl.updateUserProfile
);

/**
 * DELETE /api/users/profile
 * Delete authenticated user account
 * 
 * @description Soft delete user account with data retention compliance
 * @requires authentication: user
 * @rate-limited strict (security for account deletion)
 */
router.delete(
  '/profile',
  strictRateLimiter(), // Security for irreversible account actions
  userCtrl.deleteUserAccount
);


// ===== VOTING FUNCTIONALITY =====
// Core functionality for brand customers to vote on product proposals

/**
 * POST /api/users/vote
 * Submit vote for product proposal
 * 
 * @description Submit user vote for brand product proposals
 * @requires authentication: user
 * @validation vote data with proposal and business IDs
 * @rate-limited dynamic
 * @tracking vote submission metrics
 */
router.post(
  '/vote',
  trackManufacturerAction('user_vote_submission'),
  userCtrl.submitVote
);

/**
 * GET /api/users/vote/status/:proposalId
 * Check vote status for specific proposal
 * 
 * @description Check if user has voted on a specific proposal
 * @requires authentication: user
 * @validation proposalId parameter
 * @rate-limited dynamic
 */
router.get(
  '/vote/status/:proposalId',
  validateParams(proposalIdParamsSchema),
  userCtrl.checkVoteStatus
);

/**
 * GET /api/users/voting-history
 * Get user's voting history
 * 
 * @description Retrieve paginated voting history with analytics
 * @requires authentication: user
 * @validation query parameters for filtering and pagination
 * @rate-limited dynamic
 */
router.get(
  '/voting-history',
  validateQuery(listUsersQuerySchema),
  userCtrl.getVotingHistory
);



// ===== USER INTERACTION TRACKING =====

/**
 * POST /api/users/interaction
 * Record user interaction with brands/products
 * 
 * @description Track user interactions for analytics and engagement
 * @requires authentication: user
 * @validation interaction data
 * @rate-limited dynamic
 * @tracking interaction metrics
 */
router.post(
  '/interaction',
  trackManufacturerAction('user_brand_interaction'),
  userCtrl.recordInteraction
);

// ===== ADMIN/MANAGEMENT ROUTES =====
// These routes may require additional role-based access control

/**
 * GET /api/users
 * List users with filtering (Admin/Brand access)
 * 
 * @description List and filter users for administrative purposes
 * @requires authentication: user (with admin permissions)
 * @validation query parameters for filtering and pagination
 * @rate-limited dynamic
 */
router.get(
  '/',
  validateQuery(listUsersQuerySchema),
  userCtrl.listUsers
);



export default router;
