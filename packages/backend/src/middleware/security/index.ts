/**
 * Security Middleware Module
 * 
 * Exports CORS, webhook validation, and audit middleware for enterprise security
 */

// CORS middleware
export {
  corsMiddleware,
  productionCorsMiddleware,
  developmentCorsMiddleware,
  publicApiCorsMiddleware,
  webhookCorsMiddleware,
  CorsMiddlewareOptions
} from './cors.middleware';

// Webhook middleware
export {
  webhookMiddleware,
  shopifyWebhookMiddleware,
  woocommerceWebhookMiddleware,
  wixWebhookMiddleware,
  stripeWebhookMiddleware,
  genericWebhookMiddleware,
  getShopifyConfig,
  getWooCommerceConfig,
  getWixConfig,
  getStripeConfig,
  getGenericConfig,
  WebhookProvider,
  WebhookConfig,
  WebhookMiddlewareOptions,
  WebhookValidationError
} from './webhook.middleware';

// Audit middleware
export {
  auditMiddleware,
  fullAuditMiddleware,
  securityAuditMiddleware,
  complianceAuditMiddleware,
  minimalAuditMiddleware,
  AuditEventType,
  AuditMiddlewareOptions,
  AuditEvent
} from './audit.middleware';

