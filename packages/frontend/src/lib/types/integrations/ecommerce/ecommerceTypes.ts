/**
 * Ecommerce Integration Types
 * 
 * Re-exports backend ecommerce integration types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  EcommerceProvider,
  ProviderCredentials,
  IntegrationRecord,
  IntegrationCredentialsInput,
  SyncRecord,
  OAuthStatePayload,
  PkcePair,
  ExpectedWebhookDefinition,
  ProviderWebhookRecord,
  WebhookDiff,
  EcommerceHttpClientOptions,
  OrderLineItemPayload,
  OrderCertificatePayload,
  CertificateDispatchResult,
  ProviderOrderAdapter,
  ProductSyncOptions,
  ProductSyncAdapterResult,
  ProviderProductAdapter,
  ProviderWebhookAdapter,
  ProviderConnectionAdapter,
  ProviderAnalyticsSnapshot,
  ProviderAnalyticsAdapter,
  ProviderFeatureAdapters,
  OrderProcessingOptions,
  OrderProcessingResult,
  ProductSyncResult,
  WebhookReconciliationResult,
  IntegrationAnalyticsReport
} from '@backend/services/integrations/ecommerce/core/types';

// Re-export all backend types
export type {
  EcommerceProvider,
  ProviderCredentials,
  IntegrationRecord,
  IntegrationCredentialsInput,
  SyncRecord,
  OAuthStatePayload,
  PkcePair,
  ExpectedWebhookDefinition,
  ProviderWebhookRecord,
  WebhookDiff,
  EcommerceHttpClientOptions,
  OrderLineItemPayload,
  OrderCertificatePayload,
  CertificateDispatchResult,
  ProviderOrderAdapter,
  ProductSyncOptions,
  ProductSyncAdapterResult,
  ProviderProductAdapter,
  ProviderWebhookAdapter,
  ProviderConnectionAdapter,
  ProviderAnalyticsSnapshot,
  ProviderAnalyticsAdapter,
  ProviderFeatureAdapters,
  OrderProcessingOptions,
  OrderProcessingResult,
  ProductSyncResult,
  WebhookReconciliationResult,
  IntegrationAnalyticsReport
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Ecommerce integration display type with enhanced UI fields
 */
export interface EcommerceIntegrationDisplay extends IntegrationRecord {
  _ui?: {
    statusBadge?: 'connected' | 'disconnected' | 'error' | 'pending';
    formattedConnectedAt?: string;
    formattedLastSyncAt?: string;
    relativeLastSyncTime?: string;
    healthBadge?: 'excellent' | 'good' | 'poor' | 'critical';
    providerLogo?: string;
    providerName?: string;
  };
}

/**
 * Ecommerce integration form data
 */
export interface EcommerceIntegrationFormData {
  provider: EcommerceProvider;
  domain?: string;
  accessToken?: string;
  refreshToken?: string;
  secret?: string;
  additionalSecrets?: Record<string, string | undefined>;
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    isConnecting?: boolean;
    oauthUrl?: string;
    oauthState?: string;
  };
}

/**
 * Ecommerce integration list view options
 */
export interface EcommerceIntegrationListViewOptions {
  provider?: EcommerceProvider;
  connected?: boolean;
  searchQuery?: string;
  sortBy?: 'provider' | 'connectedAt' | 'lastSyncAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

