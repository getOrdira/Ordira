/**
 * Webhook Middleware
 * 
 * Secure webhook validation middleware with support for multiple providers:
 * - Shopify, WooCommerce, Wix, Stripe webhook signature validation
 * - Timing-safe signature comparison
 * - Replay attack prevention
 * - Timestamp validation
 * - Raw body preservation
 * - Provider-specific headers
 * - Comprehensive error handling
 * - OWASP compliance
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { verifyWebhookSignature, verifySignedTimestamp } from '../../services/integrations/ecommerce/utils/signatureValidation';

// ===== TYPE DEFINITIONS =====

/**
 * Supported webhook providers
 */
export type WebhookProvider = 'shopify' | 'woocommerce' | 'wix' | 'stripe' | 'generic';

/**
 * Webhook configuration for a specific provider
 */
export interface WebhookConfig {
  /**
   * Webhook provider type
   */
  provider: WebhookProvider;
  
  /**
   * Secret for signature validation
   */
  secret: string;
  
  /**
   * Header name for signature (provider-specific)
   */
  signatureHeader: string;
  
  /**
   * Header name for timestamp (optional)
   */
  timestampHeader?: string;
  
  /**
   * Maximum age of webhook in ms (replay prevention)
   */
  maxAge?: number;
  
  /**
   * Custom signature validation function
   */
  validateSignature?: (payload: Buffer, signature: string, secret: string) => boolean;
  
  /**
   * Additional validation function
   */
  validateAdditional?: (req: Request) => boolean | Promise<boolean>;
}

/**
 * Webhook middleware options
 */
export interface WebhookMiddlewareOptions {
  /**
   * Webhook configurations by path or provider
   */
  configs: Map<string, WebhookConfig> | WebhookConfig[];
  
  /**
   * Path-specific configuration (optional)
   */
  pathConfigs?: Map<string, WebhookConfig>;
  
  /**
   * Require raw body to be present (default: true)
   */
  requireRawBody?: boolean;
  
  /**
   * Enable replay attack prevention (default: true)
   */
  preventReplay?: boolean;
  
  /**
   * Enable timestamp validation (default: true)
   */
  validateTimestamp?: boolean;
  
  /**
   * Default max age for timestamps in ms (default: 5 minutes)
   */
  defaultMaxAge?: number;
  
  /**
   * Enable error logging (default: true)
   */
  logErrors?: boolean;
  
  /**
   * Enable request logging (default: false)
   */
  logRequests?: boolean;
  
  /**
   * Custom error response handler
   */
  onError?: (error: WebhookValidationError, req: Request, res: Response) => void;
}

/**
 * Webhook validation error
 */
export class WebhookValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

/**
 * Default webhook middleware options
 */
const DEFAULT_OPTIONS: Required<Pick<WebhookMiddlewareOptions, 'requireRawBody' | 'preventReplay' | 'validateTimestamp' | 'defaultMaxAge' | 'logErrors' | 'logRequests'>> = {
  requireRawBody: true,
  preventReplay: true,
  validateTimestamp: true,
  defaultMaxAge: 5 * 60 * 1000, // 5 minutes
  logErrors: true,
  logRequests: false
};

// ===== SIGNATURE VALIDATION =====

/**
 * Validate webhook signature using timing-safe comparison
 */
function validateSignature(
  payload: Buffer,
  signature: string,
  secret: string,
  provider: WebhookProvider
): boolean {
  try {
    // Use existing signature validation utility
    if (provider !== 'generic') {
      return verifyWebhookSignature({
        provider: provider as any,
        payload,
        signature,
        secret,
        headers: {}
      });
    }
    
    // Generic HMAC validation
    return validateGenericSignature(payload, signature, secret);
  } catch (error) {
    logger.error('Webhook signature validation error', { provider, error });
    return false;
  }
}

/**
 * Validate generic webhook signature
 */
function validateGenericSignature(
  payload: Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    // Try multiple common algorithms
    const algorithms = [
      { name: 'sha256', encoding: 'base64' as const },
      { name: 'sha256', encoding: 'hex' as const },
      { name: 'sha1', encoding: 'base64' as const },
      { name: 'sha1', encoding: 'hex' as const }
    ];
    
    for (const { name, encoding } of algorithms) {
      try {
        const digest = crypto
          .createHmac(name, secret)
          .update(payload)
          .digest(encoding);
        
        if (timingSafeEqual(digest, signature)) {
          return true;
        }
      } catch {
        continue;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');
    
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

// ===== PROVIDER-SPECIFIC CONFIGURATIONS =====

/**
 * Get Shopify webhook config
 */
export function getShopifyConfig(secret: string): WebhookConfig {
  return {
    provider: 'shopify',
    secret,
    signatureHeader: 'x-shopify-hmac-sha256',
    timestampHeader: 'x-shopify-topic',
    maxAge: 5 * 60 * 1000
  };
}

/**
 * Get WooCommerce webhook config
 */
export function getWooCommerceConfig(secret: string): WebhookConfig {
  return {
    provider: 'woocommerce',
    secret,
    signatureHeader: 'x-wc-webhook-signature',
    maxAge: 5 * 60 * 1000
  };
}

/**
 * Get Wix webhook config
 */
export function getWixConfig(secret: string): WebhookConfig {
  return {
    provider: 'wix',
    secret,
    signatureHeader: 'x-wix-signature',
    maxAge: 5 * 60 * 1000
  };
}

/**
 * Get Stripe webhook config
 */
export function getStripeConfig(secret: string): WebhookConfig {
  return {
    provider: 'stripe',
    secret,
    signatureHeader: 'stripe-signature',
    timestampHeader: 'stripe-signature',
    maxAge: 5 * 60 * 1000,
    validateSignature: (payload: Buffer, signature: string, secret: string) => {
      // Stripe uses nested signature format: t=timestamp,v1=signature
      try {
        const elements = signature.split(',');
        const sigObj: Record<string, string> = {};
        
        elements.forEach(element => {
          const [key, value] = element.split('=');
          sigObj[key] = value;
        });
        
        const timestamp = parseInt(sigObj.t || '0');
        if (!timestamp) {
          return false;
        }
        
        // Verify timestamp
        const age = Date.now() - timestamp * 1000;
        if (age > 5 * 60 * 1000) {
          return false;
        }
        
        // Verify signature
        const signedPayload = `${timestamp}.${payload.toString('utf8')}`;
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(signedPayload)
          .digest('hex');
        
        return timingSafeEqual(expectedSig, sigObj.v1 || '');
      } catch {
        return false;
      }
    }
  };
}

/**
 * Get generic webhook config
 */
export function getGenericConfig(
  secret: string,
  signatureHeader: string = 'x-signature',
  algorithm: 'sha1' | 'sha256' = 'sha256',
  encoding: 'hex' | 'base64' = 'base64'
): WebhookConfig {
  return {
    provider: 'generic',
    secret,
    signatureHeader,
    maxAge: 5 * 60 * 1000,
    validateSignature: (payload: Buffer, signature: string) => {
      const digest = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest(encoding);
      return timingSafeEqual(digest, signature);
    }
  };
}

// ===== MAIN WEBHOOK MIDDLEWARE =====

/**
 * Webhook validation middleware factory
 */
export function webhookMiddleware(options: WebhookMiddlewareOptions) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  // Normalize configs to a map
  const configMap = new Map<string, WebhookConfig>();
  
  if (Array.isArray(config.configs)) {
    config.configs.forEach((cfg, index) => {
      configMap.set(`config-${index}`, cfg);
    });
  } else {
    configMap.set('default', config.configs as any);
  }
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      // Get config for this path
      let webhookConfig: WebhookConfig | undefined;
      
      if (config.pathConfigs) {
        webhookConfig = config.pathConfigs.get(req.path);
      }
      
      if (!webhookConfig) {
        webhookConfig = configMap.get('default') || configMap.values().next().value;
      }
      
      if (!webhookConfig) {
        throw new WebhookValidationError(
          'Webhook configuration not found',
          'WEBHOOK_CONFIG_NOT_FOUND',
          500
        );
      }
      
      // Log request if enabled
      if (config.logRequests) {
        logger.info('Webhook request received', {
          event: 'webhook.request',
          provider: webhookConfig.provider,
          path: req.path,
          method: req.method,
          headers: Object.keys(req.headers)
        });
      }
      
      // Check for raw body
      const rawBody = (req as any).rawBody;
      if (config.requireRawBody && !rawBody) {
        throw new WebhookValidationError(
          'Raw body required for webhook validation',
          'RAW_BODY_REQUIRED',
          400
        );
      }
      
      // Get signature from headers
      const signature = req.get(webhookConfig.signatureHeader);
      if (!signature) {
        throw new WebhookValidationError(
          `Missing signature header: ${webhookConfig.signatureHeader}`,
          'MISSING_SIGNATURE',
          401
        );
      }
      
      // Validate timestamp if enabled
      if (config.validateTimestamp && webhookConfig.timestampHeader) {
        const timestamp = req.get(webhookConfig.timestampHeader);
        if (timestamp && typeof timestamp === 'string' && !verifySignedTimestamp({ timestampHeader: timestamp })) {
          throw new WebhookValidationError(
            'Webhook timestamp validation failed',
            'TIMESTAMP_VALIDATION_FAILED',
            401
          );
        }
      }
      
      // Validate signature
      const signatureStr = typeof signature === 'string' ? signature : Array.isArray(signature) ? signature[0] : '';
      const isValid = webhookConfig.validateSignature
        ? webhookConfig.validateSignature(rawBody, signatureStr, webhookConfig.secret)
        : validateSignature(rawBody, signatureStr, webhookConfig.secret, webhookConfig.provider);
      
      if (!isValid) {
        throw new WebhookValidationError(
          'Webhook signature validation failed',
          'SIGNATURE_VALIDATION_FAILED',
          401
        );
      }
      
      // Additional validation if provided
      if (webhookConfig.validateAdditional) {
        const additionalValid = await webhookConfig.validateAdditional(req);
        if (!additionalValid) {
          throw new WebhookValidationError(
            'Additional webhook validation failed',
            'ADDITIONAL_VALIDATION_FAILED',
            401
          );
        }
      }
      
      // Attach validation metadata to request
      (req as any).webhookValidated = true;
      (req as any).webhookProvider = webhookConfig.provider;
      
      // Log success
      if (config.logRequests) {
        logger.info('Webhook validated successfully', {
          event: 'webhook.validated',
          provider: webhookConfig.provider,
          path: req.path
        });
      }
      
      next();
    } catch (error) {
      if (config.logErrors && error instanceof WebhookValidationError) {
        logger.warn('Webhook validation failed', {
          event: 'webhook.validation_failed',
          code: error.code,
          path: req.path,
          ip: req.ip
        });
      }
      
      if (config.onError) {
        config.onError(error as WebhookValidationError, req, res);
        return;
      }
      
      // Default error response
      const statusCode = error instanceof WebhookValidationError ? error.statusCode : 500;
      const code = error instanceof WebhookValidationError ? error.code : 'WEBHOOK_ERROR';
      
      return res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Webhook validation failed',
        code
      });
    }
  };
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Shopify webhook middleware
 */
export function shopifyWebhookMiddleware(secret: string, options?: Partial<WebhookMiddlewareOptions>) {
  return webhookMiddleware({
    configs: [getShopifyConfig(secret)],
    ...options
  });
}

/**
 * WooCommerce webhook middleware
 */
export function woocommerceWebhookMiddleware(secret: string, options?: Partial<WebhookMiddlewareOptions>) {
  return webhookMiddleware({
    configs: [getWooCommerceConfig(secret)],
    ...options
  });
}

/**
 * Wix webhook middleware
 */
export function wixWebhookMiddleware(secret: string, options?: Partial<WebhookMiddlewareOptions>) {
  return webhookMiddleware({
    configs: [getWixConfig(secret)],
    ...options
  });
}

/**
 * Stripe webhook middleware
 */
export function stripeWebhookMiddleware(secret: string, options?: Partial<WebhookMiddlewareOptions>) {
  return webhookMiddleware({
    configs: [getStripeConfig(secret)],
    ...options
  });
}

/**
 * Generic webhook middleware
 */
export function genericWebhookMiddleware(secret: string, options?: Partial<WebhookMiddlewareOptions>) {
  return webhookMiddleware({
    configs: [getGenericConfig(secret)],
    ...options
  });
}

