import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import axios from 'axios';
import { ApiError } from '@/lib/errors';
import apiClient from '@/lib/api/client';

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

// Use the centralized API client
const api = apiClient;

const integrationsApi = {
  // Overview and general
  getIntegrationsOverview: async (): Promise<IntegrationsOverview> => {
    const response = await api.get('/integrations');
    return (response as any).data.data;
  },

  getIntegrationHealth: async (platform: IntegrationPlatform): Promise<{ score: number; status: string; issues: string[] }> => {
    const response = await api.get(`/integrations/${platform}/health`);
    return (response as any).data.data;
  },

  // Shopify Integration
  connectShopify: async (data: ConnectShopifyRequest): Promise<{ authUrl: string; state: string }> => {
    const response = await api.post('/integrations/shopify/connect', data);
    return (response as any).data.data;
  },

  getShopifyIntegration: async (): Promise<ShopifyIntegration> => {
    const response = await api.get('/integrations/shopify');
    return (response as any).data.data;
  },

  disconnectShopify: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/integrations/shopify');
    return (response as any).data;
  },

  getShopifyProducts: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/shopify/products', { params });
    return (response as any).data.data;
  },

  getShopifyOrders: async (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/shopify/orders', { params });
    return (response as any).data.data;
  },

  syncShopifyProducts: async (productIds?: string[]): Promise<{ success: boolean; results: any }> => {
    const response = await api.post('/integrations/shopify/products/sync', { productIds });
    return (response as any).data;
  },

  createShopifyOrderCertificates: async (orderId: string): Promise<{ success: boolean; certificates: string[] }> => {
    const response = await api.post(`/integrations/shopify/orders/${orderId}/certificates`);
    return (response as any).data;
  },

  getShopifyAnalytics: async (params?: { timeframe?: string; metrics?: string[] }): Promise<any> => {
    const response = await api.get('/integrations/shopify/analytics', { params });
    return (response as any).data.data;
  },

  // WooCommerce Integration
  connectWooCommerce: async (data: ConnectWooCommerceRequest): Promise<{ success: boolean; integration: WooCommerceIntegration }> => {
    const response = await api.post('/integrations/woocommerce/connect', data);
    return (response as any).data;
  },

  getWooCommerceIntegration: async (): Promise<WooCommerceIntegration> => {
    const response = await api.get('/integrations/woocommerce');
    return (response as any).data.data;
  },

  disconnectWooCommerce: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/integrations/woocommerce');
    return (response as any).data;
  },

  getWooCommerceProducts: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/woocommerce/products', { params });
    return (response as any).data.data;
  },

  getWooCommerceOrders: async (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/woocommerce/orders', { params });
    return (response as any).data.data;
  },

  getWooCommercePluginStatus: async (): Promise<{ installed: boolean; version?: string; compatible: boolean }> => {
    const response = await api.get('/integrations/woocommerce/plugin-status');
    return (response as any).data.data;
  },

  getWooCommerceSystemStatus: async (): Promise<{ system: any; diagnostics: any }> => {
    const response = await api.get('/integrations/woocommerce/system-status');
    return (response as any).data.data;
  },

  // Wix Integration
  connectWix: async (data: ConnectWixRequest): Promise<{ authUrl: string; state: string }> => {
    const response = await api.post('/integrations/wix/connect', data);
    return (response as any).data.data;
  },

  getWixIntegration: async (): Promise<WixIntegration> => {
    const response = await api.get('/integrations/wix');
    return (response as any).data.data;
  },

  disconnectWix: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/integrations/wix');
    return (response as any).data;
  },

  getWixProducts: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{
    products: Product[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/wix/products', { params });
    return (response as any).data.data;
  },

  getWixOrders: async (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<{
    orders: Order[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/wix/orders', { params });
    return (response as any).data.data;
  },

  getWixAppStatus: async (): Promise<{ installed: boolean; permissions: string[]; lastUpdated?: string }> => {
    const response = await api.get('/integrations/wix/app-status');
    return (response as any).data.data;
  },

  // Webhooks management
  getWebhooksOverview: async (): Promise<{ endpoints: WebhookEndpoint[]; recentDeliveries: WebhookDelivery[] }> => {
    const response = await api.get('/integrations/webhooks');
    return (response as any).data.data;
  },

  getWebhookEndpoints: async (params?: { platform?: IntegrationPlatform; status?: WebhookStatus }): Promise<{
    endpoints: WebhookEndpoint[];
  }> => {
    const response = await api.get('/integrations/webhooks/endpoints', { params });
    return (response as any).data.data;
  },

  createWebhookEndpoint: async (data: { url: string; events: string[]; platform: IntegrationPlatform; secret?: string }): Promise<WebhookEndpoint> => {
    const response = await api.post('/integrations/webhooks/endpoints', data);
    return (response as any).data.data;
  },

  updateWebhookEndpoint: async (endpointId: string, data: { url?: string; events?: string[]; secret?: string }): Promise<WebhookEndpoint> => {
    const response = await api.put(`/integrations/webhooks/endpoints/${endpointId}`, data);
    return (response as any).data.data;
  },

  deleteWebhookEndpoint: async (endpointId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/integrations/webhooks/endpoints/${endpointId}`);
    return (response as any).data;
  },

  testWebhookEndpoint: async (endpointId: string, eventType: string): Promise<{ success: boolean; delivery: WebhookDelivery }> => {
    const response = await api.post(`/integrations/webhooks/endpoints/${endpointId}/test`, { eventType });
    return (response as any).data;
  },

  getWebhookDeliveries: async (params?: { 
    endpointId?: string; 
    status?: string; 
    page?: number; 
    limit?: number 
  }): Promise<{
    deliveries: WebhookDelivery[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/webhooks/deliveries', { params });
    return (response as any).data.data;
  },

  retryWebhookDelivery: async (deliveryId: string): Promise<{ success: boolean; delivery: WebhookDelivery }> => {
    const response = await api.post(`/integrations/webhooks/deliveries/${deliveryId}/retry`);
    return (response as any).data;
  },

  // Certificate mapping
  getCertificateMapping: async (platform: IntegrationPlatform): Promise<{ mappings: CertificateMapping[] }> => {
    const response = await api.get(`/integrations/${platform}/certificate-mapping`);
    return (response as any).data.data;
  },

  updateCertificateMapping: async (platform: IntegrationPlatform, mappings: CertificateMapping[]): Promise<{ success: boolean; mappings: CertificateMapping[] }> => {
    const response = await api.put(`/integrations/${platform}/certificate-mapping`, { mappings });
    return (response as any).data;
  },

  testCertificateRules: async (platform: IntegrationPlatform, productId: string, rules: any): Promise<{ success: boolean; result: any }> => {
    const response = await api.post(`/integrations/${platform}/certificate-rules/test`, { productId, rules });
    return (response as any).data;
  },

  // Sync operations
  getSyncHistory: async (platform?: IntegrationPlatform, params?: { page?: number; limit?: number; type?: string }): Promise<{
    history: SyncHistory[];
    pagination: any;
  }> => {
    const response = await api.get('/integrations/sync/history', { params: { platform, ...params } });
    return (response as any).data.data;
  },

  triggerBulkOperation: async (platform: IntegrationPlatform, operation: BulkOperationRequest): Promise<{
    success: boolean;
    operationId: string;
    estimatedDuration: string;
  }> => {
    const response = await api.post(`/integrations/${platform}/bulk-operations`, operation);
    return (response as any).data;
  },

  getBulkOperationStatus: async (platform: IntegrationPlatform, operationId: string): Promise<{
    id: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    results?: any;
  }> => {
    const response = await api.get(`/integrations/${platform}/bulk-operations/${operationId}/status`);
    return (response as any).data.data;
  },

  // Setup guides and troubleshooting
  getSetupGuide: async (platform: IntegrationPlatform): Promise<{
    steps: Array<{ title: string; description: string; completed: boolean; }>;
    requirements: string[];
    estimatedTime: string;
  }> => {
    const response = await api.get(`/integrations/${platform}/setup-guide`);
    return (response as any).data.data;
  },

  getTroubleshootingInfo: async (platform: IntegrationPlatform): Promise<{
    commonIssues: Array<{ issue: string; solution: string; }>;
    diagnostics: any;
    supportResources: Array<{ title: string; url: string; }>;
  }> => {
    const response = await api.get(`/integrations/${platform}/troubleshooting`);
    return (response as any).data.data;
  },
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
      return (data as any)?.status === 'running' ? 2000 : false;
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

  const query = useQuery({
    queryKey: ['integrations', 'realtime'],
    queryFn: integrationsApi.getIntegrationsOverview,
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
  });

  // Update individual integration caches when data changes
  React.useEffect(() => {
    if (query.data) {
      query.data.integrations.forEach((integration: any) => {
        queryClient.setQueryData(['integrations', integration.platform], integration);
      });
    }
  }, [query.data, queryClient]);

  return query;
}

/**
 * Integration analytics and insights
 */
export function useIntegrationInsights(platform?: IntegrationPlatform, timeframe: string = '30d') {
  return useQuery({
    queryKey: ['integrations', 'insights', platform, timeframe],
    queryFn: async () => {
      const overview = await integrationsApi.getIntegrationsOverview();
      const insights: any[] = [];

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