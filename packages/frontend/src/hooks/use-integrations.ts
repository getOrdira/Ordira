import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ===== TYPES =====

type IntegrationPlatform = 'shopify' | 'woocommerce' | 'wix';
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'expired';
type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';
type WebhookStatus = 'active' | 'inactive' | 'failed' | 'pending';

interface BaseIntegration {
  id: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  connectedAt?: string;
  lastSync?: string;
  syncStatus: SyncStatus;
  domain: string;
  isActive: boolean;
  settings: {
    autoSync: boolean;
    certificateMapping: boolean;
    webhooksEnabled: boolean;
    bulkOperations: boolean;
  };
  statistics: {
    totalProducts: number;
    totalOrders: number;
    certificatesGenerated: number;
    lastActivity?: string;
  };
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
}

interface ShopifyIntegration extends BaseIntegration {
  platform: 'shopify';
  config: {
    shopDomain: string;
    accessToken: string;
    webhookSecret?: string;
    appId?: string;
  };
  permissions: {
    readProducts: boolean;
    readOrders: boolean;
    writeWebhooks: boolean;
    readCustomers: boolean;
  };
}

interface WooCommerceIntegration extends BaseIntegration {
  platform: 'woocommerce';
  config: {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
    version: string;
  };
  pluginStatus: {
    installed: boolean;
    version?: string;
    compatible: boolean;
    lastChecked?: string;
  };
}

interface WixIntegration extends BaseIntegration {
  platform: 'wix';
  config: {
    siteId: string;
    apiKey: string;
    refreshToken?: string;
    instanceId?: string;
  };
  appStatus: {
    installed: boolean;
    permissions: string[];
    lastUpdated?: string;
  };
}

type Integration = ShopifyIntegration | WooCommerceIntegration | WixIntegration;

interface IntegrationsOverview {
  connected: number;
  total: number;
  recentActivity: Array<{
    platform: IntegrationPlatform;
    action: string;
    timestamp: string;
    status: 'success' | 'error';
  }>;
  integrations: Integration[];
  recommendations: Array<{
    type: 'setup' | 'optimization' | 'maintenance';
    platform?: IntegrationPlatform;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  sku?: string;
  images: string[];
  status: 'active' | 'draft' | 'archived';
  variants: Array<{
    id: string;
    title: string;
    price: number;
    sku?: string;
    inventory: number;
  }>;
  certificateMapping?: {
    enabled: boolean;
    template?: string;
    customFields?: Record<string, any>;
  };
  syncedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  total: number;
  currency: string;
  items: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    price: number;
    certificateStatus?: 'pending' | 'generated' | 'error';
  }>;
  certificates: Array<{
    id: string;
    status: 'pending' | 'issued' | 'failed';
    productTitle: string;
    recipientEmail: string;
  }>;
  createdAt: string;
  syncedAt: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  secret?: string;
  createdAt: string;
  lastTriggered?: string;
  deliveryStats: {
    successful: number;
    failed: number;
    pending: number;
  };
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  maxAttempts: number;
  payload: any;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
  createdAt: string;
  nextRetry?: string;
}

interface SyncHistory {
  id: string;
  platform: IntegrationPlatform;
  type: 'products' | 'orders' | 'webhooks' | 'full';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  results: {
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{
    item: string;
    error: string;
    timestamp: string;
  }>;
}

interface CertificateMapping {
  productId: string;
  productTitle: string;
  template: string;
  customFields: Record<string, any>;
  rules: Array<{
    condition: string;
    value: any;
    action: string;
  }>;
  isActive: boolean;
}

// Connection requests
interface ConnectShopifyRequest {
  shopDomain: string;
  returnUrl?: string;
}

interface ConnectWooCommerceRequest {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface ConnectWixRequest {
  siteId: string;
  returnUrl?: string;
}

interface BulkOperationRequest {
  operation: 'sync_products' | 'sync_orders' | 'generate_certificates' | 'update_mappings';
  filters?: {
    productIds?: string[];
    orderIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  };
  options?: {
    template?: string;
    notifyCustomers?: boolean;
    overrideExisting?: boolean;
  };
}

// ===== API FUNCTIONS =====

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const integrationsApi = {
  // Overview and general
  getIntegrationsOverview: (): Promise<IntegrationsOverview> =>
    api.get('/integrations').then(res => res.data),

  getIntegrationHealth: (platform: IntegrationPlatform): Promise<{ score: number; status: string; issues: string[] }> =>
    api.get(`/integrations/${platform}/health`).then(res => res.data),

  // Shopify Integration
  connectShopify: (data: ConnectShopifyRequest): Promise<{ authUrl: string; state: string }> =>
    api.post('/integrations/shopify/connect', data).then(res => res.data),

  getShopifyIntegration: (): Promise<ShopifyIntegration> =>
    api.get('/integrations/shopify').then(res => res.data),

  disconnectShopify: (): Promise<{ success: boolean; message: string }> =>
    api.delete('/integrations/shopify').then(res => res.data),

  getShopifyProducts: (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> =>
    api.get('/integrations/shopify/products', { params }).then(res => res.data),

  getShopifyOrders: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> =>
    api.get('/integrations/shopify/orders', { params }).then(res => res.data),

  syncShopifyProducts: (productIds?: string[]): Promise<{ success: boolean; results: any }> =>
    api.post('/integrations/shopify/products/sync', { productIds }).then(res => res.data),

  createShopifyOrderCertificates: (orderId: string): Promise<{ success: boolean; certificates: string[] }> =>
    api.post(`/integrations/shopify/orders/${orderId}/certificates`).then(res => res.data),

  getShopifyAnalytics: (params?: { timeframe?: string; metrics?: string[] }): Promise<any> =>
    api.get('/integrations/shopify/analytics', { params }).then(res => res.data),

  // WooCommerce Integration
  connectWooCommerce: (data: ConnectWooCommerceRequest): Promise<{ success: boolean; integration: WooCommerceIntegration }> =>
    api.post('/integrations/woocommerce/connect', data).then(res => res.data),

  getWooCommerceIntegration: (): Promise<WooCommerceIntegration> =>
    api.get('/integrations/woocommerce').then(res => res.data),

  disconnectWooCommerce: (): Promise<{ success: boolean; message: string }> =>
    api.delete('/integrations/woocommerce').then(res => res.data),

  getWooCommerceProducts: (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> =>
    api.get('/integrations/woocommerce/products', { params }).then(res => res.data),

  getWooCommerceOrders: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> =>
    api.get('/integrations/woocommerce/orders', { params }).then(res => res.data),

  getWooCommercePluginStatus: (): Promise<{ installed: boolean; version?: string; compatible: boolean }> =>
    api.get('/integrations/woocommerce/plugin-status').then(res => res.data),

  getWooCommerceSystemStatus: (): Promise<{ system: any; diagnostics: any }> =>
    api.get('/integrations/woocommerce/system-status').then(res => res.data),

  // Wix Integration
  connectWix: (data: ConnectWixRequest): Promise<{ authUrl: string; state: string }> =>
    api.post('/integrations/wix/connect', data).then(res => res.data),

  getWixIntegration: (): Promise<WixIntegration> =>
    api.get('/integrations/wix').then(res => res.data),

  disconnectWix: (): Promise<{ success: boolean; message: string }> =>
    api.delete('/integrations/wix').then(res => res.data),

  getWixProducts: (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> =>
    api.get('/integrations/wix/products', { params }).then(res => res.data),

  getWixOrders: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> =>
    api.get('/integrations/wix/orders', { params }).then(res => res.data),

  getWixAppStatus: (): Promise<{ installed: boolean; permissions: string[]; lastUpdated?: string }> =>
    api.get('/integrations/wix/app-status').then(res => res.data),

  // Webhooks management
  getWebhooksOverview: (): Promise<{ endpoints: WebhookEndpoint[]; recentDeliveries: WebhookDelivery[] }> =>
    api.get('/integrations/webhooks').then(res => res.data),

  getWebhookEndpoints: (params?: { platform?: IntegrationPlatform; status?: WebhookStatus }): Promise<{
    endpoints: WebhookEndpoint[];
  }> =>
    api.get('/integrations/webhooks/endpoints', { params }).then(res => res.data),

  createWebhookEndpoint: (data: { url: string; events: string[]; platform: IntegrationPlatform; secret?: string }): Promise<WebhookEndpoint> =>
    api.post('/integrations/webhooks/endpoints', data).then(res => res.data),

  updateWebhookEndpoint: (endpointId: string, data: { url?: string; events?: string[]; secret?: string }): Promise<WebhookEndpoint> =>
    api.put(`/integrations/webhooks/endpoints/${endpointId}`, data).then(res => res.data),

  deleteWebhookEndpoint: (endpointId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/integrations/webhooks/endpoints/${endpointId}`).then(res => res.data),

  testWebhookEndpoint: (endpointId: string, eventType: string): Promise<{ success: boolean; delivery: WebhookDelivery }> =>
    api.post(`/integrations/webhooks/endpoints/${endpointId}/test`, { eventType }).then(res => res.data),

  getWebhookDeliveries: (params?: { 
    endpointId?: string; 
    status?: string; 
    page?: number; 
    limit?: number 
  }): Promise<{
    deliveries: WebhookDelivery[];
    pagination: any;
  }> =>
    api.get('/integrations/webhooks/deliveries', { params }).then(res => res.data),

  retryWebhookDelivery: (deliveryId: string): Promise<{ success: boolean; delivery: WebhookDelivery }> =>
    api.post(`/integrations/webhooks/deliveries/${deliveryId}/retry`).then(res => res.data),

  // Certificate mapping
  getCertificateMapping: (platform: IntegrationPlatform): Promise<{ mappings: CertificateMapping[] }> =>
    api.get(`/integrations/${platform}/certificate-mapping`).then(res => res.data),

  updateCertificateMapping: (platform: IntegrationPlatform, mappings: CertificateMapping[]): Promise<{ success: boolean; mappings: CertificateMapping[] }> =>
    api.put(`/integrations/${platform}/certificate-mapping`, { mappings }).then(res => res.data),

  testCertificateRules: (platform: IntegrationPlatform, productId: string, rules: any): Promise<{ success: boolean; result: any }> =>
    api.post(`/integrations/${platform}/certificate-rules/test`, { productId, rules }).then(res => res.data),

  // Sync operations
  getSyncHistory: (platform?: IntegrationPlatform, params?: { page?: number; limit?: number; type?: string }): Promise<{
    history: SyncHistory[];
    pagination: any;
  }> =>
    api.get('/integrations/sync/history', { params: { platform, ...params } }).then(res => res.data),

  triggerBulkOperation: (platform: IntegrationPlatform, operation: BulkOperationRequest): Promise<{
    success: boolean;
    operationId: string;
    estimatedDuration: string;
  }> =>
    api.post(`/integrations/${platform}/bulk-operations`, operation).then(res => res.data),

  getBulkOperationStatus: (platform: IntegrationPlatform, operationId: string): Promise<{
    id: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    results?: any;
  }> =>
    api.get(`/integrations/${platform}/bulk-operations/${operationId}/status`).then(res => res.data),

  // Setup guides and troubleshooting
  getSetupGuide: (platform: IntegrationPlatform): Promise<{
    steps: Array<{ title: string; description: string; completed: boolean; }>;
    requirements: string[];
    estimatedTime: string;
  }> =>
    api.get(`/integrations/${platform}/setup-guide`).then(res => res.data),

  getTroubleshootingInfo: (platform: IntegrationPlatform): Promise<{
    commonIssues: Array<{ issue: string; solution: string; }>;
    diagnostics: any;
    supportResources: Array<{ title: string; url: string; }>;
  }> =>
    api.get(`/integrations/${platform}/troubleshooting`).then(res => res.data),
};

// ===== HOOKS =====

/**
 * Get integrations overview
 */
export function useIntegrationsOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'overview'],
    queryFn: integrationsApi.getIntegrationsOverview,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get integration health status
 */
export function useIntegrationHealth(platform: IntegrationPlatform, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', platform, 'health'],
    queryFn: () => integrationsApi.getIntegrationHealth(platform),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });
}

/**
 * Shopify Integration Hooks
 */
export function useShopifyIntegration(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'shopify'],
    queryFn: integrationsApi.getShopifyIntegration,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useConnectShopify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.connectShopify,
    onSuccess: (data) => {
      // Redirect to Shopify auth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error('Shopify connection failed:', error);
    },
  });
}

export function useDisconnectShopify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.disconnectShopify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error) => {
      console.error('Shopify disconnection failed:', error);
    },
  });
}

export function useShopifyProducts(
  params?: { page?: number; limit?: number; status?: string; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'shopify', 'products', params],
    queryFn: () => integrationsApi.getShopifyProducts(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

export function useShopifyOrders(
  params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'shopify', 'orders', params],
    queryFn: () => integrationsApi.getShopifyOrders(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

export function useSyncShopifyProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.syncShopifyProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'shopify', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'sync'] });
    },
    onError: (error) => {
      console.error('Shopify sync failed:', error);
    },
  });
}

/**
 * WooCommerce Integration Hooks
 */
export function useWooCommerceIntegration(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'woocommerce'],
    queryFn: integrationsApi.getWooCommerceIntegration,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useConnectWooCommerce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.connectWooCommerce,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error) => {
      console.error('WooCommerce connection failed:', error);
    },
  });
}

export function useDisconnectWooCommerce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.disconnectWooCommerce,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error) => {
      console.error('WooCommerce disconnection failed:', error);
    },
  });
}

export function useWooCommerceProducts(
  params?: { page?: number; limit?: number; status?: string; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'woocommerce', 'products', params],
    queryFn: () => integrationsApi.getWooCommerceProducts(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

export function useWooCommercePluginStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'woocommerce', 'plugin-status'],
    queryFn: integrationsApi.getWooCommercePluginStatus,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Wix Integration Hooks
 */
export function useWixIntegration(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'wix'],
    queryFn: integrationsApi.getWixIntegration,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useConnectWix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.connectWix,
    onSuccess: (data) => {
      // Redirect to Wix auth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error('Wix connection failed:', error);
    },
  });
}

export function useDisconnectWix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.disconnectWix,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error) => {
      console.error('Wix disconnection failed:', error);
    },
  });
}

export function useWixProducts(
  params?: { page?: number; limit?: number; status?: string; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'wix', 'products', params],
    queryFn: () => integrationsApi.getWixProducts(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

/**
 * Webhook Management Hooks
 */
export function useWebhooksOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', 'webhooks', 'overview'],
    queryFn: integrationsApi.getWebhooksOverview,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useWebhookEndpoints(
  params?: { platform?: IntegrationPlatform; status?: WebhookStatus },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'webhooks', 'endpoints', params],
    queryFn: () => integrationsApi.getWebhookEndpoints(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.createWebhookEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'webhooks'] });
    },
    onError: (error) => {
      console.error('Webhook creation failed:', error);
    },
  });
}

export function useDeleteWebhookEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.deleteWebhookEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'webhooks'] });
    },
    onError: (error) => {
      console.error('Webhook deletion failed:', error);
    },
  });
}

export function useTestWebhookEndpoint() {
  return useMutation({
    mutationFn: ({ endpointId, eventType }: { endpointId: string; eventType: string }) =>
      integrationsApi.testWebhookEndpoint(endpointId, eventType),
    onError: (error) => {
      console.error('Webhook test failed:', error);
    },
  });
}

export function useWebhookDeliveries(
  params?: { endpointId?: string; status?: string; page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'webhooks', 'deliveries', params],
    queryFn: () => integrationsApi.getWebhookDeliveries(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

export function useRetryWebhookDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.retryWebhookDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'webhooks', 'deliveries'] });
    },
    onError: (error) => {
      console.error('Webhook retry failed:', error);
    },
  });
}

/**
 * Certificate Mapping Hooks
 */
export function useCertificateMapping(platform: IntegrationPlatform, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', platform, 'certificate-mapping'],
    queryFn: () => integrationsApi.getCertificateMapping(platform),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateCertificateMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platform, mappings }: { platform: IntegrationPlatform; mappings: CertificateMapping[] }) =>
      integrationsApi.updateCertificateMapping(platform, mappings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.platform, 'certificate-mapping'] });
    },
    onError: (error) => {
      console.error('Certificate mapping update failed:', error);
    },
  });
}

export function useTestCertificateRules() {
  return useMutation({
    mutationFn: ({ platform, productId, rules }: { 
      platform: IntegrationPlatform; 
      productId: string; 
      rules: any 
    }) => integrationsApi.testCertificateRules(platform, productId, rules),
    onError: (error) => {
      console.error('Certificate rules test failed:', error);
    },
  });
}

/**
 * Sync Operations Hooks
 */
export function useSyncHistory(
  platform?: IntegrationPlatform,
  params?: { page?: number; limit?: number; type?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', 'sync', 'history', platform, params],
    queryFn: () => integrationsApi.getSyncHistory(platform, params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

export function useTriggerBulkOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platform, operation }: { platform: IntegrationPlatform; operation: BulkOperationRequest }) =>
      integrationsApi.triggerBulkOperation(platform, operation),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.platform] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'sync'] });
    },
    onError: (error) => {
      console.error('Bulk operation failed:', error);
    },
  });
}

export function useBulkOperationStatus(
  platform: IntegrationPlatform,
  operationId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', platform, 'bulk-operations', operationId],
    queryFn: () => integrationsApi.getBulkOperationStatus(platform, operationId!),
    enabled: (options?.enabled ?? true) && !!operationId,
    refetchInterval: (data) => {
      // Poll while operation is running
      return data?.status === 'running' ? 2000 : false;
    },
    staleTime: 0, // Always fresh for running operations
  });
}

/**
 * Setup and Troubleshooting Hooks
 */
export function useSetupGuide(platform: IntegrationPlatform, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', platform, 'setup-guide'],
    queryFn: () => integrationsApi.getSetupGuide(platform),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useTroubleshootingInfo(platform: IntegrationPlatform, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', platform, 'troubleshooting'],
    queryFn: () => integrationsApi.getTroubleshootingInfo(platform),
    enabled: options?.enabled ?? true,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Real-time integration monitoring
 */
export function useRealtimeIntegrationsStatus(enabled: boolean = false) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['integrations', 'realtime'],
    queryFn: integrationsApi.getIntegrationsOverview,
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
    onSuccess: (data) => {
      // Update individual integration caches
      data.integrations.forEach(integration => {
        queryClient.setQueryData(['integrations', integration.platform], integration);
      });
    },
  });
}

/**
 * Integration analytics and insights
 */
export function useIntegrationInsights(platform?: IntegrationPlatform, timeframe: string = '30d') {
  return useQuery({
    queryKey: ['integrations', 'insights', platform, timeframe],
    queryFn: async () => {
      const overview = await integrationsApi.getIntegrationsOverview();
      const insights = [];

      // Analyze each integration
      overview.integrations.forEach(integration => {
        if (platform && integration.platform !== platform) return;

        if (integration.health.score < 70) {
          insights.push({
            type: 'warning',
            platform: integration.platform,
            message: `${integration.platform} integration health score is low (${integration.health.score}/100)`,
            issues: integration.health.issues,
          });
        }

        if (integration.syncStatus === 'failed') {
          insights.push({
            type: 'error',
            platform: integration.platform,
            message: `Recent sync failed for ${integration.platform}`,
            lastSync: integration.lastSync,
          });
        }

        if (!integration.settings.webhooksEnabled) {
          insights.push({
            type: 'info',
            platform: integration.platform,
            message: `Webhooks are disabled for ${integration.platform} - consider enabling for real-time updates`,
          });
        }
      });

      return {
        insights,
        overview,
        recommendations: overview.recommendations,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}