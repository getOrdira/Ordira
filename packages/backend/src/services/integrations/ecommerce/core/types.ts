import type { AxiosRequestConfig } from 'axios';

/**
 * Supported ecommerce providers for the integration module.
 */
export type EcommerceProvider = 'shopify' | 'wix' | 'woocommerce';

/**
 * Normalised representation of a provider's credential set.
 */
export interface ProviderCredentials {
  domain?: string;
  accessToken?: string;
  refreshToken?: string;
  secret?: string;
  additionalSecrets?: Record<string, string | undefined>;
}

/**
 * Detailed integration record persisted for a business.
 */
export interface IntegrationRecord {
  provider: EcommerceProvider;
  businessId: string;
  domain?: string;
  connected: boolean;
  connectedAt?: Date | null;
  lastSyncAt?: Date | null;
  lastUpdatedAt?: Date | null;
  credentialsPresent: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Payload accepted when storing provider credentials.
 */
export interface IntegrationCredentialsInput {
  domain?: string;
  accessToken?: string;
  refreshToken?: string;
  secret?: string;
  additionalSecrets?: Record<string, string | undefined>;
  connectedAt?: Date;
  lastSyncAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Result returned when a provider sync completes.
 */
export interface SyncRecord {
  provider: EcommerceProvider;
  businessId: string;
  lastSyncAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * State payload stored for OAuth handshakes.
 */
export interface OAuthStatePayload {
  provider: EcommerceProvider;
  businessId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * PKCE pair used for modern OAuth exchanges.
 */
export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

/**
 * Definition describing a webhook that should be registered for a provider.
 */
export interface ExpectedWebhookDefinition {
  topic: string;
  address: string;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  format?: 'json' | 'xml';
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Provider webhook representation returned from remote APIs.
 */
export interface ProviderWebhookRecord {
  id: string | number;
  topic: string;
  address: string;
  status?: string;
  fields?: Record<string, unknown>;
}

/**
 * Result of diffing expected vs existing webhooks.
 */
export interface WebhookDiff {
  toCreate: ExpectedWebhookDefinition[];
  toDelete: ProviderWebhookRecord[];
  toUpdate: Array<{
    current: ProviderWebhookRecord;
    desired: ExpectedWebhookDefinition;
  }>;
  unchanged: ProviderWebhookRecord[];
}

/**
 * Options for creating a provider specific HTTP client.
 */
export interface EcommerceHttpClientOptions {
  provider: EcommerceProvider;
  businessId?: string;
  baseURL: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  auth?: AxiosRequestConfig['auth'];
  bearerToken?: string;
  queryParams?: Record<string, string | number>;
  userAgent?: string;
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  logRequests?: boolean;
  redactHeaders?: string[];
}

/**
 * Order item payload forwarded to the certificate dispatcher.
 */
export interface OrderLineItemPayload {
  id?: string | number;
  productId?: string | number;
  sku?: string;
  quantity: number;
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Order level payload consumed by the certificate dispatcher.
 */
export interface OrderCertificatePayload {
  provider: EcommerceProvider;
  businessId: string;
  orderId: string;
  customerEmail?: string;
  customerName?: string;
  recipientWallet?: string;
  lineItems: OrderLineItemPayload[];
  metadata?: Record<string, unknown>;
}

/**
 * Result of attempting to issue certificates for an order.
 */
export interface CertificateDispatchResult {
  orderId: string;
  attempted: number;
  created: number;
  skipped: number;
  failures: Array<{
    sku?: string;
    reason: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter for provider-specific order operations.
 */
export interface ProviderOrderAdapter {
  fetchOrder(businessId: string, orderId: string): Promise<OrderCertificatePayload>;
  transformWebhookPayload?(payload: unknown, businessId: string): Promise<OrderCertificatePayload>;
}

/**
 * Options for syncing products.
 */
export interface ProductSyncOptions {
  fullSync?: boolean;
  batchSize?: number;
  cursor?: string | null;
  metadata?: Record<string, unknown>;
  recordSyncTimestamp?: boolean;
}

/**
 * Result from provider product sync adapters.
 */
export interface ProductSyncAdapterResult {
  synced: number;
  skipped?: number;
  errors?: string[];
  metadata?: Record<string, unknown>;
  cursor?: string | null;
}

/**
 * Adapter for provider-specific product synchronisation.
 */
export interface ProviderProductAdapter {
  syncProducts(businessId: string, options?: ProductSyncOptions): Promise<ProductSyncAdapterResult>;
}

/**
 * Adapter for provider webhooks.
 */
export interface ProviderWebhookAdapter {
  list(businessId: string): Promise<ProviderWebhookRecord[]>;
  register(businessId: string, webhook: ExpectedWebhookDefinition): Promise<ProviderWebhookRecord | void>;
  update?(
    businessId: string,
    current: ProviderWebhookRecord,
    desired: ExpectedWebhookDefinition
  ): Promise<ProviderWebhookRecord | void>;
  remove(businessId: string, webhook: ProviderWebhookRecord): Promise<void>;
}

/**
 * Adapter for connection diagnostics.
 */
export interface ProviderConnectionAdapter {
  testConnection(businessId: string): Promise<boolean>;
}

/**
 * Provider analytics snapshot.
 */
export interface ProviderAnalyticsSnapshot {
  totalOrders?: number;
  totalRevenue?: number;
  revenueCurrency?: string;
  totalProducts?: number;
  totalCustomers?: number;
  averageOrderValue?: number;
  webhookDeliverySuccessRate?: number;
  lastOrderAt?: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter exposing provider analytics metrics.
 */
export interface ProviderAnalyticsAdapter {
  getMetrics(businessId: string): Promise<ProviderAnalyticsSnapshot>;
}

/**
 * Aggregated registry of provider feature adapters.
 */
export interface ProviderFeatureAdapters {
  orders?: ProviderOrderAdapter;
  products?: ProviderProductAdapter;
  webhooks?: ProviderWebhookAdapter;
  connection?: ProviderConnectionAdapter;
  analytics?: ProviderAnalyticsAdapter;
}

/**
 * Additional options for order processing.
 */
export interface OrderProcessingOptions {
  source?: 'webhook' | 'manual' | 'api';
  skipCertificateCreation?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * High-level order processing result.
 */
export interface OrderProcessingResult extends CertificateDispatchResult {
  provider: EcommerceProvider;
  businessId: string;
  source: 'webhook' | 'manual' | 'api';
}

/**
 * Product synchronisation result presented to callers.
 */
export interface ProductSyncResult {
  provider: EcommerceProvider;
  businessId: string;
  synced: number;
  skipped: number;
  durationMs: number;
  errors: string[];
  metadata?: Record<string, unknown>;
  cursor?: string | null;
}

/**
 * Result of orchestrating webhook reconciliation.
 */
export interface WebhookReconciliationResult {
  provider: EcommerceProvider;
  businessId: string;
  created: number;
  updated: number;
  deleted: number;
  issues: string[];
  diff: WebhookDiff;
}

/**
 * Analytics view for a provider integration.
 */
export interface IntegrationAnalyticsReport {
  provider: EcommerceProvider;
  businessId: string;
  connected: boolean;
  connectedAt?: Date | null;
  lastSyncAt?: Date | null;
  health: 'excellent' | 'good' | 'poor' | 'critical';
  metrics: ProviderAnalyticsSnapshot;
  issues: string[];
  recommendations: string[];
  metadata?: Record<string, unknown>;
}
