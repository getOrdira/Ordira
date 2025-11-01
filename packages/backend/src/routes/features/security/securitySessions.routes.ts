// src/routes/features/security/securitySessions.routes.ts
// Security sessions routes using modular security sessions controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securitySessionsController } from '../../../controllers/features/security/securitySessions.controller';

const sessionIdParamsSchema = Joi.object({
  sessionId: Joi.string().trim().required()
});

const createSessionBodySchema = Joi.object({
  userId: Joi.string().trim().required(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').required(),
  tokenId: Joi.string().trim().required(),
  ipAddress: Joi.string().ip().required(),
  userAgent: Joi.string().trim().max(500).required(),
  deviceFingerprint: Joi.string().trim().max(200).optional(),
  expiresAt: Joi.date().iso().required(),
  createdAt: Joi.date().iso().optional(),
  lastActivity: Joi.date().iso().optional(),
  isActive: Joi.boolean().optional()
});

const revokeAllSessionsBodySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').optional(),
  reason: Joi.string().trim().max(500).optional(),
  excludeSessionId: Joi.string().trim().max(200).optional()
});

const activeSessionsQuerySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  userType: Joi.string().valid('business', 'user', 'manufacturer').optional()
});

const cleanupQuerySchema = Joi.object({
  referenceDate: Joi.string().isoDate().optional()
});

const recentSessionsQuerySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  days: Joi.number().integer().min(1).max(30).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create session
builder.post(
  '/',
  createHandler(securitySessionsController, 'createSession'),
  {
    validateBody: createSessionBodySchema
  }
);

// Update session activity
builder.patch(
  '/:sessionId/activity',
  createHandler(securitySessionsController, 'updateSessionActivity'),
  {
    validateParams: sessionIdParamsSchema
  }
);

// Revoke session
builder.post(
  '/:sessionId/revoke',
  createHandler(securitySessionsController, 'revokeSession'),
  {
    validateParams: sessionIdParamsSchema
  }
);

// Revoke all sessions
builder.post(
  '/revoke-all',
  createHandler(securitySessionsController, 'revokeAllSessions'),
  {
    validateBody: revokeAllSessionsBodySchema
  }
);

// Get active sessions
builder.get(
  '/active',
  createHandler(securitySessionsController, 'getActiveSessions'),
  {
    validateQuery: activeSessionsQuerySchema
  }
);

// Cleanup expired sessions
builder.post(
  '/cleanup',
  createHandler(securitySessionsController, 'cleanupExpiredSessions'),
  {
    validateQuery: cleanupQuerySchema
  }
);

// Count recent sessions
builder.get(
  '/recent/count',
  createHandler(securitySessionsController, 'countRecentSessions'),
  {
    validateQuery: recentSessionsQuerySchema
  }
);

export default builder.getRouter();