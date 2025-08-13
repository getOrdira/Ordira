// src/routes/integrations/webhooks.routes.ts
import { Router } from 'express';
import express from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as webhooksCtrl from '../../controllers/integrations/webhooks.controller';
import {
  webhookConfigSchema,
  webhookTestSchema,
  webhookEventSchema,
  webhookSecuritySchema,
  webhookAnalyticsSchema,
  customWebhookSchema
} from '../../validation/integrations/webhooks.validation';

const router = Router();

// Apply middleware to most routes (incoming webhooks handled separately)
router.use(dynamicRateLimiter());

/**
 * GET /api/integrations/webhooks
 * Get webhook configuration overview
 */
router.get(
  '/',
  authenticate,
  resolveTenant,
  webhooksCtrl.getWebhooksOverview
);

/**
 * GET /api/integrations/webhooks/endpoints
 * Get all configured webhook endpoints
 */
router.get(
  '/endpoints',
  authenticate,
  resolveTenant,
  validateQuery(webhookConfigSchema.list),
  webhooksCtrl.getWebhookEndpoints
);

/**
 * POST /api/integrations/webhooks/endpoints
 * Create new webhook endpoint
 */
router.post(
  '/endpoints',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateBody(webhookConfigSchema.create),
  webhooksCtrl.createWebhookEndpoint
);

/**
 * GET /api/integrations/webhooks/endpoints/:endpointId
 * Get specific webhook endpoint details
 */
router.get(
  '/endpoints/:endpointId',
  authenticate,
  resolveTenant,
  validateParams(webhookConfigSchema.params),
  webhooksCtrl.getWebhookEndpoint
);

/**
 * PUT /api/integrations/webhooks/endpoints/:endpointId
 * Update webhook endpoint configuration
 */
router.put(
  '/endpoints/:endpointId',
  authenticate,
  resolveTenant,
  validateParams(webhookConfigSchema.params),
  validateBody(webhookConfigSchema.update),
  webhooksCtrl.updateWebhookEndpoint
);

/**
 * DELETE /api/integrations/webhooks/endpoints/:endpointId
 * Delete webhook endpoint
 */
router.delete(
  '/endpoints/:endpointId',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateParams(webhookConfigSchema.params),
  webhooksCtrl.deleteWebhookEndpoint
);

/**
 * POST /api/integrations/webhooks/endpoints/:endpointId/test
 * Test webhook endpoint with sample data
 */
router.post(
  '/endpoints/:endpointId/test',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateParams(webhookConfigSchema.params),
  validateBody(webhookTestSchema),
  webhooksCtrl.testWebhookEndpoint
);

/**
 * GET /api/integrations/webhooks/events
 * Get available webhook events and schemas
 */
router.get(
  '/events',
  authenticate,
  resolveTenant,
  webhooksCtrl.getAvailableEvents
);

/**
 * GET /api/integrations/webhooks/events/:eventType/schema
 * Get schema for specific event type
 */
router.get(
  '/events/:eventType/schema',
  authenticate,
  resolveTenant,
  validateParams(webhookEventSchema.params),
  webhooksCtrl.getEventSchema
);

/**
 * GET /api/integrations/webhooks/deliveries
 * Get webhook delivery history and logs
 */
router.get(
  '/deliveries',
  authenticate,
  resolveTenant,
  validateQuery(webhookAnalyticsSchema.deliveries),
  webhooksCtrl.getWebhookDeliveries
);

/**
 * GET /api/integrations/webhooks/deliveries/:deliveryId
 * Get specific delivery details
 */
router.get(
  '/deliveries/:deliveryId',
  authenticate,
  resolveTenant,
  validateParams(webhookAnalyticsSchema.deliveryParams),
  webhooksCtrl.getWebhookDelivery
);

/**
 * POST /api/integrations/webhooks/deliveries/:deliveryId/retry
 * Retry failed webhook delivery
 */
router.post(
  '/deliveries/:deliveryId/retry',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateParams(webhookAnalyticsSchema.deliveryParams),
  webhooksCtrl.retryWebhookDelivery
);

/**
 * GET /api/integrations/webhooks/analytics
 * Get webhook analytics and metrics
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(webhookAnalyticsSchema.analytics),
  webhooksCtrl.getWebhookAnalytics
);

/**
 * GET /api/integrations/webhooks/security
 * Get webhook security configuration
 */
router.get(
  '/security',
  authenticate,
  resolveTenant,
  webhooksCtrl.getWebhookSecurity
);

/**
 * PUT /api/integrations/webhooks/security
 * Update webhook security settings
 */
router.put(
  '/security',
  authenticate,
  resolveTenant,
  validateBody(webhookSecuritySchema),
  webhooksCtrl.updateWebhookSecurity
);

/**
 * POST /api/integrations/webhooks/security/rotate-secrets
 * Rotate webhook signing secrets
 */
router.post(
  '/security/rotate-secrets',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  webhooksCtrl.rotateWebhookSecrets
);

/**
 * GET /api/integrations/webhooks/templates
 * Get webhook payload templates
 */
router.get(
  '/templates',
  authenticate,
  resolveTenant,
  webhooksCtrl.getWebhookTemplates
);

/**
 * POST /api/integrations/webhooks/templates
 * Create custom webhook template
 */
router.post(
  '/templates',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(customWebhookSchema.template),
  webhooksCtrl.createWebhookTemplate
);

/**
 * PUT /api/integrations/webhooks/templates/:templateId
 * Update webhook template
 */
router.put(
  '/templates/:templateId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(customWebhookSchema.templateParams),
  validateBody(customWebhookSchema.updateTemplate),
  webhooksCtrl.updateWebhookTemplate
);

/**
 * DELETE /api/integrations/webhooks/templates/:templateId
 * Delete webhook template
 */
router.delete(
  '/templates/:templateId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(customWebhookSchema.templateParams),
  webhooksCtrl.deleteWebhookTemplate
);

/**
 * POST /api/integrations/webhooks/batch-test
 * Test multiple webhook endpoints
 */
router.post(
  '/batch-test',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(webhookTestSchema.batch),
  webhooksCtrl.batchTestWebhooks
);

/**
 * GET /api/integrations/webhooks/health-check
 * Perform health check on all webhook endpoints
 */
router.get(
  '/health-check',
  authenticate,
  resolveTenant,
  webhooksCtrl.performWebhookHealthCheck
);

/**
 * POST /api/integrations/webhooks/simulate
 * Simulate webhook events for testing
 */
router.post(
  '/simulate',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(webhookTestSchema.simulate),
  webhooksCtrl.simulateWebhookEvent
);

/**
 * GET /api/integrations/webhooks/queue-status
 * Get webhook delivery queue status
 */
router.get(
  '/queue-status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  webhooksCtrl.getWebhookQueueStatus
);

/**
 * POST /api/integrations/webhooks/pause
 * Pause webhook deliveries
 */
router.post(
  '/pause',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateBody(webhookConfigSchema.pause),
  webhooksCtrl.pauseWebhookDeliveries
);

/**
 * POST /api/integrations/webhooks/resume
 * Resume webhook deliveries
 */
router.post(
  '/resume',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  webhooksCtrl.resumeWebhookDeliveries
);

/**
 * GET /api/integrations/webhooks/filters
 * Get webhook filtering configuration
 */
router.get(
  '/filters',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  webhooksCtrl.getWebhookFilters
);

/**
 * PUT /api/integrations/webhooks/filters
 * Update webhook filtering rules
 */
router.put(
  '/filters',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(customWebhookSchema.filters),
  webhooksCtrl.updateWebhookFilters
);

/**
 * POST /api/integrations/webhooks/incoming/generic
 * Generic incoming webhook endpoint
 */
router.post(
  '/incoming/generic',
  express.json({ limit: '1mb' }),
  validateBody(customWebhookSchema.incoming),
  webhooksCtrl.handleGenericIncomingWebhook
);

/**
 * POST /api/integrations/webhooks/incoming/custom/:webhookId
 * Custom incoming webhook endpoint with ID
 */
router.post(
  '/incoming/custom/:webhookId',
  express.json({ limit: '1mb' }),
  validateParams(customWebhookSchema.incomingParams),
  webhooksCtrl.handleCustomIncomingWebhook
);

/**
 * GET /api/integrations/webhooks/export
 * Export webhook configuration
 */
router.get(
  '/export',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  validateQuery(webhookConfigSchema.export),
  webhooksCtrl.exportWebhookConfig
);

/**
 * POST /api/integrations/webhooks/import
 * Import webhook configuration
 */
router.post(
  '/import',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(webhookConfigSchema.import),
  webhooksCtrl.importWebhookConfig
);

/**
 * GET /api/integrations/webhooks/compliance
 * Get webhook compliance and audit information
 */
router.get(
  '/compliance',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  validateQuery(webhookAnalyticsSchema.compliance),
  webhooksCtrl.getWebhookCompliance
);

/**
 * POST /api/integrations/webhooks/debug/:endpointId
 * Enable debug mode for specific webhook endpoint
 */
router.post(
  '/debug/:endpointId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(webhookConfigSchema.params),
  validateBody(webhookTestSchema.debug),
  webhooksCtrl.enableWebhookDebug
);

export default router;