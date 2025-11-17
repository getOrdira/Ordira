import {
  IntegrationDataService,
  integrationDataService
} from './core/integrationData.service';
import {
  EcommerceOAuthService,
  ecommerceOAuthService
} from './core/oauth.service';
import {
  HttpClientFactoryService,
  httpClientFactoryService
} from './core/httpClientFactory.service';
import {
  WebhookRegistryService,
  webhookRegistryService
} from './core/webhookRegistry.service';
import {
  CertificateDispatchService,
  certificateDispatchService
} from './core/certificateDispatch.service';
import { EcommerceIntegrationError, isEcommerceIntegrationError } from './core/errors';
import type {
  EcommerceProvider,
  IntegrationRecord,
  IntegrationCredentialsInput,
  SyncRecord,
  OrderCertificatePayload,
  OrderLineItemPayload,
  ProviderFeatureAdapters,
  ProviderOrderAdapter,
  ProviderProductAdapter,
  ProviderWebhookAdapter,
  ProviderAnalyticsAdapter,
  ProviderConnectionAdapter,
  ProductSyncOptions,
  ProductSyncResult,
  OrderProcessingOptions,
  OrderProcessingResult,
  ExpectedWebhookDefinition,
  WebhookReconciliationResult,
  IntegrationAnalyticsReport
} from './core/types';

import {
  EcommerceConnectionHealthService,
  connectionHealthService,
  ConnectionHealthReport
} from './features/connectionHealth.service';
import {
  EcommerceOrderProcessingService,
  orderProcessingService
} from './features/orderProcessing.service';
import {
  EcommerceProductSyncService,
  productSyncService
} from './features/productSync.service';
import {
  EcommerceWebhookOrchestratorService,
  webhookOrchestratorService
} from './features/webhookOrchestrator.service';
import {
  EcommerceAnalyticsService,
  analyticsService
} from './features/analytics.service';

import { shopifyAuthService } from './providers/shopify/shopifyAuth.service';
import { shopifyClientService } from './providers/shopify/shopifyClient.service';
import { shopifyWebhookService } from './providers/shopify/shopifyWebhook.service';
import {
  shopifyProviderAdapters,
  shopifyOrderAdapter,
  shopifyProductAdapter,
  shopifyConnectionAdapter,
  shopifyAnalyticsAdapter
} from './providers/shopify/shopifyMappers.service';

import { wixAuthService } from './providers/wix/wixAuth.service';
import { wixClientService } from './providers/wix/wixClient.service';
import { wixWebhookService } from './providers/wix/wixWebhook.service';
import {
  wixProviderAdapters,
  wixOrderAdapter,
  wixProductAdapter,
  wixConnectionAdapter,
  wixAnalyticsAdapter
} from './providers/wix/wixMappers.service';

import { wooAuthService } from './providers/woocommerce/wooAuth.service';
import { wooClientService } from './providers/woocommerce/wooClient.service';
import { wooWebhookService } from './providers/woocommerce/wooWebhook.service';
import {
  wooProviderAdapters,
  wooOrderAdapter,
  wooProductAdapter,
  wooConnectionAdapter,
  wooAnalyticsAdapter
} from './providers/woocommerce/wooMappers.service';

import {
  verifyWebhookSignature,
  verifySignedTimestamp
} from './utils/signatureValidation';
import {
  createOrderPayload,
  deriveCustomerName,
  normaliseSku
} from './utils/payloadMappers';
import {
  TokenBucketRateLimiter,
  exponentialBackoff,
  logRateLimitHit
} from './utils/rateLimiter';

import {
  IntegrationValidationService,
  integrationValidationService
} from './validation/integrationValidation.service';
import {
  validateWebhookPayload,
  assertWebhookPayload
} from './validation/webhookPayload.validation';
import type { WebhookValidationResult } from './validation/webhookPayload.validation';
import type { ValidationResult } from './validation/integrationValidation.service';

export {
  // Core services
  IntegrationDataService,
  integrationDataService,
  EcommerceOAuthService,
  ecommerceOAuthService,
  HttpClientFactoryService,
  httpClientFactoryService,
  WebhookRegistryService,
  webhookRegistryService,
  CertificateDispatchService,
  certificateDispatchService,
  EcommerceIntegrationError,
  isEcommerceIntegrationError,

  // Feature services
  EcommerceConnectionHealthService,
  connectionHealthService,
  EcommerceOrderProcessingService,
  orderProcessingService,
  EcommerceProductSyncService,
  productSyncService,
  EcommerceWebhookOrchestratorService,
  webhookOrchestratorService,
  EcommerceAnalyticsService,
  analyticsService,

  // Provider exports
  shopifyAuthService,
  shopifyClientService,
  shopifyWebhookService,
  shopifyProviderAdapters,
  shopifyOrderAdapter,
  shopifyProductAdapter,
  shopifyConnectionAdapter,
  shopifyAnalyticsAdapter,
  wixAuthService,
  wixClientService,
  wixWebhookService,
  wixProviderAdapters,
  wixOrderAdapter,
  wixProductAdapter,
  wixConnectionAdapter,
  wixAnalyticsAdapter,
  wooAuthService,
  wooClientService,
  wooWebhookService,
  wooProviderAdapters,
  wooOrderAdapter,
  wooProductAdapter,
  wooConnectionAdapter,
  wooAnalyticsAdapter,

  // Utilities
  verifyWebhookSignature,
  verifySignedTimestamp,
  createOrderPayload,
  deriveCustomerName,
  normaliseSku,
  TokenBucketRateLimiter,
  exponentialBackoff,
  logRateLimitHit,

  // Validation services
  IntegrationValidationService,
  integrationValidationService,
  validateWebhookPayload,
  assertWebhookPayload
};

export type {
  EcommerceProvider,
  IntegrationRecord,
  IntegrationCredentialsInput,
  SyncRecord,
  OrderCertificatePayload,
  OrderLineItemPayload,
  ProviderFeatureAdapters,
  ProviderOrderAdapter,
  ProviderProductAdapter,
  ProviderWebhookAdapter,
  ProviderAnalyticsAdapter,
  ProviderConnectionAdapter,
  ProductSyncOptions,
  ProductSyncResult,
  OrderProcessingOptions,
  OrderProcessingResult,
  ExpectedWebhookDefinition,
  WebhookReconciliationResult,
  IntegrationAnalyticsReport,
  ConnectionHealthReport,
  ValidationResult,
  WebhookValidationResult
};

export const ecommerceProviders = {
  shopify: {
    auth: shopifyAuthService,
    client: shopifyClientService,
    webhooks: shopifyWebhookService,
    adapters: shopifyProviderAdapters
  },
  wix: {
    auth: wixAuthService,
    client: wixClientService,
    webhooks: wixWebhookService,
    adapters: wixProviderAdapters
  },
  woocommerce: {
    auth: wooAuthService,
    client: wooClientService,
    webhooks: wooWebhookService,
    adapters: wooProviderAdapters
  }
};

export const ecommerceServices = {
  core: {
    data: integrationDataService,
    oauth: ecommerceOAuthService,
    httpClientFactory: httpClientFactoryService,
    webhookRegistry: webhookRegistryService,
    certificateDispatch: certificateDispatchService
  },
  features: {
    connectionHealth: connectionHealthService,
    orderProcessing: orderProcessingService,
    productSync: productSyncService,
    webhookOrchestrator: webhookOrchestratorService,
    analytics: analyticsService
  },
  providers: ecommerceProviders,
  utils: {
    verifyWebhookSignature,
    verifySignedTimestamp,
    createOrderPayload,
    deriveCustomerName,
    normaliseSku,
    TokenBucketRateLimiter,
    exponentialBackoff,
    logRateLimitHit
  },
  validation: {
    integration: integrationValidationService,
    webhookPayload: validateWebhookPayload,
    assertWebhookPayload
  }
};
