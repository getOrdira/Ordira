// src/lib/api/integrations/ecommerce/index.ts
// Ecommerce integrations API barrel export

import ecommerceHealthApi from './ecommerceHealth.api';
import ecommerceIntegrationDataApi from './ecommerceIntegrationData.api';
import ecommerceOAuthApi from './ecommerceOAuth.api';
import ecommerceOperationsApi from './ecommerceOperations.api';
import ecommerceProvidersApi from './ecommerceProviders.api';
import ecommerceWebhooksApi from './ecommerceWebhooks.api';
import shopifyApi from './shopify.api';
import wixApi from './wix.api';
import woocommerceApi from './woocommerce.api';

export type {
  ConnectionHealthParams,
  ConnectionHealthPayload,
  ConnectionHealthResponse,
  IntegrationAnalyticsParams,
  IntegrationAnalyticsResponse,
  ExpectedWebhookInput as EcommerceHealthExpectedWebhookInput
} from './ecommerceHealth.api';
export * from './ecommerceIntegrationData.api';
export * from './ecommerceOAuth.api';
export * from './ecommerceOperations.api';
export * from './ecommerceProviders.api';
export type {
  ListProviderWebhooksParams,
  ListProviderWebhooksResponse,
  WebhookDiffResponse,
  WebhookReconciliationResponse,
  ReconcileWebhooksPayload,
  DiffWebhooksPayload,
  BuildCallbackUrlPayload,
  BuildCallbackUrlResponse,
  ExpectedWebhookInput as EcommerceWebhooksExpectedWebhookInput
} from './ecommerceWebhooks.api';
export * from './shopify.api';
export * from './wix.api';
export * from './woocommerce.api';

export {
  ecommerceHealthApi,
  ecommerceIntegrationDataApi,
  ecommerceOAuthApi,
  ecommerceOperationsApi,
  ecommerceProvidersApi,
  ecommerceWebhooksApi,
  shopifyApi,
  wixApi,
  woocommerceApi
};

export const ecommerceApi = {
  health: ecommerceHealthApi,
  integrationData: ecommerceIntegrationDataApi,
  oauth: ecommerceOAuthApi,
  operations: ecommerceOperationsApi,
  providers: ecommerceProvidersApi,
  webhooks: ecommerceWebhooksApi,
  shopify: shopifyApi,
  wix: wixApi,
  woocommerce: woocommerceApi
};

export default ecommerceApi;
