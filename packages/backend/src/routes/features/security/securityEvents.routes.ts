// src/routes/features/security/securityEvents.routes.ts
// Security events routes using modular security events controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securityEventsController } from '../../../controllers/features/security/securityEvents.controller';

const logEventBodySchema = Joi.object({
  eventType: Joi.string().valid('LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'TOKEN_REFRESH', 'TOKEN_INVALIDATED', 'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED', 'SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'EMAIL_VERIFIED', 'PHONE_VERIFIED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'API_KEY_CREATED', 'API_KEY_REVOKED', 'SECURITY_SETTINGS_CHANGED').required(),
  userId: Joi.string().trim().required(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  success: Joi.boolean().required(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().trim().max(500).optional(),
  deviceFingerprint: Joi.string().trim().max(200).optional(),
  sessionId: Joi.string().trim().max(200).optional(),
  tokenId: Joi.string().trim().max(200).optional(),
  additionalData: Joi.object().unknown(true).optional(),
  timestamp: Joi.date().iso().optional(),
  expiresAt: Joi.date().iso().optional()
});

const logAuthAttemptBodySchema = Joi.object({
  userId: Joi.string().trim().required(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').required(),
  success: Joi.boolean().required(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().trim().max(500).optional(),
  additionalData: Joi.object().unknown(true).optional()
});

const recentEventsQuerySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  limit: Joi.number().integer().min(1).max(200).optional()
});

const eventsSinceQuerySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  days: Joi.number().integer().min(1).max(365).optional()
});

const systemEventsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(180).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Log event
builder.post(
  '/log',
  createHandler(securityEventsController, 'logEvent'),
  {
    validateBody: logEventBodySchema
  }
);

// Log authentication attempt
builder.post(
  '/log-auth',
  createHandler(securityEventsController, 'logAuthenticationAttempt'),
  {
    validateBody: logAuthAttemptBodySchema
  }
);

// Get recent events
builder.get(
  '/recent',
  createHandler(securityEventsController, 'getRecentEvents'),
  {
    validateQuery: recentEventsQuerySchema
  }
);

// Get user events since
builder.get(
  '/user/since',
  createHandler(securityEventsController, 'getUserEventsSince'),
  {
    validateQuery: eventsSinceQuerySchema
  }
);

// Get system events
builder.get(
  '/system',
  createHandler(securityEventsController, 'getSystemEvents'),
  {
    validateQuery: systemEventsQuerySchema
  }
);

export default builder.getRouter();