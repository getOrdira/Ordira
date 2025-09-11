// src/lib/api/integrations.ts

import { api } from './client';


// Enhanced response interfaces matching backend controller responses
export interface IntegrationOverviewResponse {
  success: boolean;
  data: {
    integrations: {
      ecommerce: {
        shopify: IntegrationStatus;
        woocommerce: IntegrationStatus;
        wix: IntegrationStatus;
      };
      webhooks: {
        configured: number;
        active: number;
        failed: number;
      };
      manufacturer: {
        connected: number;
        pending: number;
        totalConnections: number;
      };
    };
    planLimits: {
      maxIntegrations: number;
      webhookSupport: boolean;
      manufacturerConnections: number;
    };
    recommendations: string[];
  };
}

export interface WebhookConfigResponse {
  success: boolean;
  data: {
    webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      status: 'active' | 'disabled' | 'failed';
      secret?: string;
      lastDelivery?: string;
      deliverySuccess?: boolean;
    }>;
    supportedEvents: string[];
    configuration: {
      maxWebhooks: number;
      retryAttempts: number;
      timeoutSeconds: number;
    };
  };
}

export interface EcommerceIntegrationResponse {
  success: boolean;
  data: {
    shopify?: {
      connected: boolean;
      domain?: string;
      lastSync?: string;
      health: 'healthy' | 'warning' | 'error';
      metrics: {
        products: number;
        orders: number;
        customers: number;
      };
    };
    woocommerce?: {
      connected: boolean;
      domain?: string;
      lastSync?: string;
      health: 'healthy' | 'warning' | 'error';
      metrics: {
        products: number;
        orders: number;
        customers: number;
      };
    };
    wix?: {
      connected: boolean;
      domain?: string;
      lastSync?: string;
      health: 'healthy' | 'warning' | 'error';
      metrics: {
        products: number;
        orders: number;
        customers: number;
      };
    };
    totalMetrics: {
      totalProducts: number;
      totalOrders: number;
      totalRevenue: number;
    };
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    summary: {
      products: { synced: number; errors: number };
      orders: { synced: number; errors: number };
      customers: { synced: number; errors: number };
    };
    errors: string[];
    warnings: string[];
    recommendations: string[];
    syncedAt: string;
    nextSync?: string;
  };
}

export interface ConnectionTestResponse {
  success: boolean;
  connected: boolean;
  tests: {
    authentication: {
      passed: boolean;
      error?: string;
    };
    apiAccess: {
      passed: boolean;
      permissions?: string[];
      error?: string;
    };
    webhookCapability: {
      passed: boolean;
      supportedEvents?: string[];
      error?: string;
    };
  };
  recommendations: string[];
  testedAt: string;
}

export interface IntegrationConfig {
  shopifyIntegration?: {
    shopifyDomain?: string;
    shopifyAccessToken?: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  wooIntegration?: {
    wooDomain?: string;
    wooConsumerKey?: string;
    wooConsumerSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  wixIntegration?: {
    wixDomain?: string;
    wixApiKey?: string;
    wixRefreshToken?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
}

export interface IntegrationStatus {
  connected: boolean;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  health: 'healthy' | 'warning' | 'error';
  error?: string;
  metrics?: {
    products?: number;
    orders?: number;
    customers?: number;
  };
}

export interface ManufacturerConnectionResponse {
  success: boolean;
  data: {
    connections: Array<{
      manufacturerId: string;
      manufacturerName: string;
      status: 'connected' | 'pending' | 'rejected';
      connectedAt?: string;
      accessLevel: 'view' | 'full';
      sharedData: string[];
      metrics: {
        sharedProjects: number;
        totalOrders: number;
        rating: number;
      };
    }>;
    summary: {
      total: number;
      active: number;
      pending: number;
    };
    planLimits: {
      maxConnections: number;
      remainingSlots: number;
    };
  };
}

export const integrationsApi = {
  
  // ===== INTEGRATION OVERVIEW =====
  
  /**
   * Get comprehensive integrations overview
   * GET /api/integrations
   */
  getIntegrationsOverview: async (): Promise<IntegrationOverviewResponse> => {
    try {
      const response = await api.get<IntegrationOverviewResponse>('/api/integrations');
      return response;
    } catch (error) {
      console.error('Get integrations overview error:', error);
      throw error;
    }
  },

  // ===== E-COMMERCE INTEGRATIONS =====
  
  /**
   * Get e-commerce integrations status
   * GET /api/brand-settings/integrations/ecommerce
   */
  getEcommerceIntegrations: async (): Promise<EcommerceIntegrationResponse> => {
    try {
      const response = await api.get<EcommerceIntegrationResponse>('/api/brand-settings/integrations/ecommerce');
      return response;
    } catch (error) {
      console.error('Get e-commerce integrations error:', error);
      throw error;
    }
  },

  /**
   * Configure Shopify integration
   * PUT /api/brand-settings/integrations/ecommerce/shopify
   */
  connectShopify: async (data: {
    shopifyDomain: string;
    shopifyAccessToken: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
  }): Promise<{
    success: boolean;
    integration: IntegrationConfig['shopifyIntegration'];
    webhooks: {
      registered: string[];
      failed: string[];
    };
    nextSteps: string[];
  }> => {
    try {
      const response = await api.put<{
        success: boolean;
        integration: IntegrationConfig['shopifyIntegration'];
        webhooks: {
          registered: string[];
          failed: string[];
        };
        nextSteps: string[];
      }>('/api/brand-settings/integrations/ecommerce/shopify', data);
      return response;
    } catch (error) {
      console.error('Connect Shopify error:', error);
      throw error;
    }
  },

  /**
   * Configure WooCommerce integration
   * PUT /api/brand-settings/integrations/ecommerce/woocommerce
   */
  connectWooCommerce: async (data: {
    wooDomain: string;
    wooConsumerKey: string;
    wooConsumerSecret: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
  }): Promise<{
    success: boolean;
    integration: IntegrationConfig['wooIntegration'];
    webhooks: {
      registered: string[];
      failed: string[];
    };
    nextSteps: string[];
  }> => {
    try {
      const response = await api.put<{
        success: boolean;
        integration: IntegrationConfig['wooIntegration'];
        webhooks: {
          registered: string[];
          failed: string[];
        };
        nextSteps: string[];
      }>('/api/brand-settings/integrations/ecommerce/woocommerce', data);
      return response;
    } catch (error) {
      console.error('Connect WooCommerce error:', error);
      throw error;
    }
  },

  /**
   * Configure Wix integration
   * PUT /api/brand-settings/integrations/ecommerce/wix
   */
  connectWix: async (data: {
    wixDomain: string;
    wixApiKey: string;
    wixRefreshToken?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
  }): Promise<{
    success: boolean;
    integration: IntegrationConfig['wixIntegration'];
    webhooks: {
      registered: string[];
      failed: string[];
    };
    nextSteps: string[];
  }> => {
    try {
      const response = await api.put<{
        success: boolean;
        integration: IntegrationConfig['wixIntegration'];
        webhooks: {
          registered: string[];
          failed: string[];
        };
        nextSteps: string[];
      }>('/api/brand-settings/integrations/ecommerce/wix', data);
      return response;
    } catch (error) {
      console.error('Connect Wix error:', error);
      throw error;
    }
  },

  // ===== INTEGRATION TESTING =====
  
  /**
   * Test Shopify connection
   * GET /api/integrations/shopify/test
   */
  testShopifyConnection: async (): Promise<ConnectionTestResponse> => {
    try {
      const response = await api.get<ConnectionTestResponse>('/api/integrations/shopify/test');
      return response;
    } catch (error) {
      console.error('Test Shopify connection error:', error);
      throw error;
    }
  },

  /**
   * Test WooCommerce connection
   * GET /api/integrations/woocommerce/test
   */
  testWooCommerceConnection: async (): Promise<ConnectionTestResponse> => {
    try {
      const response = await api.get<ConnectionTestResponse>('/api/integrations/woocommerce/test');
      return response;
    } catch (error) {
      console.error('Test WooCommerce connection error:', error);
      throw error;
    }
  },

  /**
   * Test Wix connection
   * GET /api/integrations/wix/test
   */
  testWixConnection: async (): Promise<ConnectionTestResponse> => {
    try {
      const response = await api.get<ConnectionTestResponse>('/api/integrations/wix/test');
      return response;
    } catch (error) {
      console.error('Test Wix connection error:', error);
      throw error;
    }
  },

  // ===== DATA SYNCHRONIZATION =====
  
  /**
   * Sync data from Shopify
   * POST /api/integrations/shopify/sync
   */
  syncShopifyData: async (options?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    limit?: number;
  }): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/integrations/shopify/sync', options || {});
      return response;
    } catch (error) {
      console.error('Sync Shopify data error:', error);
      throw error;
    }
  },

  /**
   * Sync data from WooCommerce
   * POST /api/integrations/woocommerce/sync
   */
  syncWooCommerceData: async (options?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    limit?: number;
  }): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/integrations/woocommerce/sync', options || {});
      return response;
    } catch (error) {
      console.error('Sync WooCommerce data error:', error);
      throw error;
    }
  },

  /**
   * Sync data from Wix
   * POST /api/integrations/wix/sync
   */
  syncWixData: async (options?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    limit?: number;
  }): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/integrations/wix/sync', options || {});
      return response;
    } catch (error) {
      console.error('Sync Wix data error:', error);
      throw error;
    }
  },

  /**
   * Get sync history for any integration
   * GET /api/integrations/:platform/sync/history
   */
  getSyncHistory: async (platform: 'shopify' | 'woocommerce' | 'wix', params?: {
    page?: number;
    limit?: number;
    status?: 'success' | 'failed' | 'partial';
  }): Promise<{
    syncHistory: Array<{
      id: string;
      startedAt: string;
      completedAt?: string;
      status: 'success' | 'failed' | 'partial';
      syncType: string;
      itemsProcessed: number;
      errors: string[];
      duration?: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalSyncs: number;
      successRate: number;
      lastSuccessfulSync?: string;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.status) queryParams.set('status', params.status);

      const response = await api.get<{
        syncHistory: Array<{
          id: string;
          startedAt: string;
          completedAt?: string;
          status: 'success' | 'failed' | 'partial';
          syncType: string;
          itemsProcessed: number;
          errors: string[];
          duration?: number;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        summary: {
          totalSyncs: number;
          successRate: number;
          lastSuccessfulSync?: string;
        };
      }>(`/api/integrations/${platform}/sync/history?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get sync history error:', error);
      throw error;
    }
  },

  // ===== WEBHOOK MANAGEMENT =====
  
  /**
   * Get webhook configuration
   * GET /api/brand-settings/integrations/webhooks
   */
  getWebhookConfig: async (): Promise<WebhookConfigResponse> => {
    try {
      const response = await api.get<WebhookConfigResponse>('/api/brand-settings/integrations/webhooks');
      return response;
    } catch (error) {
      console.error('Get webhook config error:', error);
      throw error;
    }
  },

  /**
   * Create webhook endpoint
   * POST /api/brand-settings/integrations/webhooks
   */
  createWebhook: async (data: {
    url: string;
    events: string[];
    secret?: string;
    description?: string;
  }): Promise<{
    success: boolean;
    webhook: {
      id: string;
      url: string;
      events: string[];
      secret: string;
      status: 'active';
      createdAt: string;
    };
    verificationSteps: string[];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        webhook: {
          id: string;
          url: string;
          events: string[];
          secret: string;
          status: 'active';
          createdAt: string;
        };
        verificationSteps: string[];
      }>('/api/brand-settings/integrations/webhooks', data);
      return response;
    } catch (error) {
      console.error('Create webhook error:', error);
      throw error;
    }
  },

  /**
   * Update webhook configuration
   * PUT /api/brand-settings/integrations/webhooks/:id
   */
  updateWebhook: async (id: string, data: {
    url?: string;
    events?: string[];
    secret?: string;
    status?: 'active' | 'disabled';
  }): Promise<{
    success: boolean;
    webhook: any;
    changes: string[];
  }> => {
    try {
      const response = await api.put<{
        success: boolean;
        webhook: any;
        changes: string[];
      }>(`/api/brand-settings/integrations/webhooks/${id}`, data);
      return response;
    } catch (error) {
      console.error('Update webhook error:', error);
      throw error;
    }
  },

  /**
   * Test webhook endpoint
   * POST /api/brand-settings/integrations/webhooks/:id/test
   */
  testWebhook: async (id: string): Promise<{
    success: boolean;
    test: {
      delivered: boolean;
      responseCode?: number;
      responseTime?: number;
      error?: string;
    };
    testedAt: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        test: {
          delivered: boolean;
          responseCode?: number;
          responseTime?: number;
          error?: string;
        };
        testedAt: string;
      }>(`/api/brand-settings/integrations/webhooks/${id}/test`, {});
      return response;
    } catch (error) {
      console.error('Test webhook error:', error);
      throw error;
    }
  },

  /**
   * Delete webhook
   * DELETE /api/brand-settings/integrations/webhooks/:id
   */
  deleteWebhook: async (id: string): Promise<{
    success: boolean;
    deleted: boolean;
    webhookId: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        deleted: boolean;
        webhookId: string;
      }>(`/api/brand-settings/integrations/webhooks/${id}`);
      return response;
    } catch (error) {
      console.error('Delete webhook error:', error);
      throw error;
    }
  },

  /**
   * Get webhook logs and delivery history
   * GET /api/brand-settings/integrations/webhooks/logs
   */
  getWebhookLogs: async (params?: {
    webhookId?: string;
    status?: 'success' | 'failed';
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      webhookId: string;
      url: string;
      event: string;
      status: 'success' | 'failed';
      responseCode?: number;
      responseTime: number;
      error?: string;
      deliveredAt: string;
      retryCount: number;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.webhookId) queryParams.set('webhookId', params.webhookId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.offset) queryParams.set('offset', String(params.offset));

      const response = await api.get<{
        logs: Array<{
          id: string;
          webhookId: string;
          url: string;
          event: string;
          status: 'success' | 'failed';
          responseCode?: number;
          responseTime: number;
          error?: string;
          deliveredAt: string;
          retryCount: number;
        }>;
        summary: {
          total: number;
          successful: number;
          failed: number;
          averageResponseTime: number;
        };
      }>(`/api/brand-settings/integrations/webhooks/logs?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get webhook logs error:', error);
      throw error;
    }
  },

  // ===== MANUFACTURER CONNECTIONS =====
  
  /**
   * Get manufacturer connections
   * GET /api/manufacturer/brands
   */
  getManufacturerConnections: async (): Promise<ManufacturerConnectionResponse> => {
    try {
      const response = await api.get<ManufacturerConnectionResponse>('/api/manufacturer/brands');
      return response;
    } catch (error) {
      console.error('Get manufacturer connections error:', error);
      throw error;
    }
  },

  /**
   * Connect to a brand (manufacturer side)
   * POST /api/manufacturer/brands/connect
   */
  connectToBrand: async (data: {
    brandId: string;
    accessLevel?: 'view' | 'full';
    message?: string;
    proposedSharing?: string[];
  }): Promise<{
    success: boolean;
    connection: {
      brandId: string;
      status: 'pending';
      requestedAt: string;
      accessLevel: string;
    };
    nextSteps: string[];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        connection: {
          brandId: string;
          status: 'pending';
          requestedAt: string;
          accessLevel: string;
        };
        nextSteps: string[];
      }>('/api/manufacturer/brands/connect', data);
      return response;
    } catch (error) {
      console.error('Connect to brand error:', error);
      throw error;
    }
  },

  /**
   * Disconnect from brand
   * DELETE /api/manufacturer/brands/:brandId/disconnect
   */
  disconnectFromBrand: async (brandId: string): Promise<{
    success: boolean;
    disconnected: boolean;
    brandId: string;
    disconnectedAt: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        disconnected: boolean;
        brandId: string;
        disconnectedAt: string;
      }>(`/api/manufacturer/brands/${brandId}/disconnect`);
      return response;
    } catch (error) {
      console.error('Disconnect from brand error:', error);
      throw error;
    }
  },

  /**
   * Get shared analytics for connected brand
   * GET /api/manufacturer/brands/:brandId/analytics
   */
  getSharedAnalytics: async (brandId: string, timeRange?: string): Promise<{
    brand: {
      id: string;
      name: string;
      connectionDate: string;
    };
    analytics: {
      votes: {
        total: number;
        byProduct: Array<{ productId: string; title: string; votes: number }>;
        trends: Array<{ date: string; votes: number }>;
      };
      engagement: {
        activeCustomers: number;
        engagementRate: number;
        topProducts: any[];
      };
    };
    permissions: {
      canViewVotes: boolean;
      canViewProducts: boolean;
      canViewCustomers: boolean;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (timeRange) queryParams.set('timeRange', timeRange);

      const response = await api.get<{
        brand: {
          id: string;
          name: string;
          connectionDate: string;
        };
        analytics: {
          votes: {
            total: number;
            byProduct: Array<{ productId: string; title: string; votes: number }>;
            trends: Array<{ date: string; votes: number }>;
          };
          engagement: {
            activeCustomers: number;
            engagementRate: number;
            topProducts: any[];
          };
        };
        permissions: {
          canViewVotes: boolean;
          canViewProducts: boolean;
          canViewCustomers: boolean;
        };
      }>(`/api/manufacturer/brands/${brandId}/analytics?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get shared analytics error:', error);
      throw error;
    }
  },

  // ===== DISCONNECTION MANAGEMENT =====
  
  /**
   * Disconnect Shopify integration
   * DELETE /api/integrations/shopify/disconnect
   */
  disconnectShopify: async (): Promise<{
    success: boolean;
    disconnected: boolean;
    cleanupResults: {
      webhooksRemoved: number;
      dataRetained: boolean;
    };
    disconnectedAt: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        disconnected: boolean;
        cleanupResults: {
          webhooksRemoved: number;
          dataRetained: boolean;
        };
        disconnectedAt: string;
      }>('/api/integrations/shopify/disconnect');
      return response;
    } catch (error) {
      console.error('Disconnect Shopify error:', error);
      throw error;
    }
  },

  /**
   * Disconnect WooCommerce integration
   * DELETE /api/integrations/woocommerce/disconnect
   */
  disconnectWooCommerce: async (): Promise<{
    success: boolean;
    disconnected: boolean;
    cleanupResults: {
      webhooksRemoved: number;
      dataRetained: boolean;
    };
    disconnectedAt: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        disconnected: boolean;
        cleanupResults: {
          webhooksRemoved: number;
          dataRetained: boolean;
        };
        disconnectedAt: string;
      }>('/api/integrations/woocommerce/disconnect');
      return response;
    } catch (error) {
      console.error('Disconnect WooCommerce error:', error);
      throw error;
    }
  },

  /**
   * Disconnect Wix integration
   * DELETE /api/integrations/wix/disconnect
   */
  disconnectWix: async (): Promise<{
    success: boolean;
    disconnected: boolean;
    cleanupResults: {
      webhooksRemoved: number;
      dataRetained: boolean;
    };
    disconnectedAt: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        disconnected: boolean;
        cleanupResults: {
          webhooksRemoved: number;
          dataRetained: boolean;
        };
        disconnectedAt: string;
      }>('/api/integrations/wix/disconnect');
      return response;
    } catch (error) {
      console.error('Disconnect Wix error:', error);
      throw error;
    }
  },

  // ===== INTEGRATION ANALYTICS =====
  
  /**
   * Get Shopify analytics
   * GET /api/integrations/shopify/analytics
   */
  getShopifyAnalytics: async (timeRange?: string): Promise<{
    integration: {
      connected: boolean;
      lastSync: string;
      health: string;
    };
    performance: {
      syncSuccess: number;
      syncFailures: number;
      averageSyncTime: number;
      dataAccuracy: number;
    };
    business: {
      ordersProcessed: number;
      productsManaged: number;
      customersImported: number;
      revenue: number;
    };
    trends: Array<{
      date: string;
      orders: number;
      revenue: number;
      syncTime: number;
    }>;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (timeRange) queryParams.set('timeRange', timeRange);

      const response = await api.get<{
        integration: {
          connected: boolean;
          lastSync: string;
          health: string;
        };
        performance: {
          syncSuccess: number;
          syncFailures: number;
          averageSyncTime: number;
          dataAccuracy: number;
        };
        business: {
          ordersProcessed: number;
          productsManaged: number;
          customersImported: number;
          revenue: number;
        };
        trends: Array<{
          date: string;
          orders: number;
          revenue: number;
          syncTime: number;
        }>;
      }>(`/api/integrations/shopify/analytics?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get Shopify analytics error:', error);
      throw error;
    }
  },

  /**
   * Get WooCommerce analytics
   * GET /api/integrations/woocommerce/analytics
   */
  getWooCommerceAnalytics: async (timeRange?: string): Promise<{
    integration: {
      connected: boolean;
      lastSync: string;
      health: string;
    };
    performance: {
      syncSuccess: number;
      syncFailures: number;
      averageSyncTime: number;
      dataAccuracy: number;
    };
    business: {
      ordersProcessed: number;
      productsManaged: number;
      customersImported: number;
      revenue: number;
    };
    trends: Array<{
      date: string;
      orders: number;
      revenue: number;
      syncTime: number;
    }>;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (timeRange) queryParams.set('timeRange', timeRange);

      const response = await api.get<{
        integration: {
          connected: boolean;
          lastSync: string;
          health: string;
        };
        performance: {
          syncSuccess: number;
          syncFailures: number;
          averageSyncTime: number;
          dataAccuracy: number;
        };
        business: {
          ordersProcessed: number;
          productsManaged: number;
          customersImported: number;
          revenue: number;
        };
        trends: Array<{
          date: string;
          orders: number;
          revenue: number;
          syncTime: number;
        }>;
      }>(`/api/integrations/woocommerce/analytics?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get WooCommerce analytics error:', error);
      throw error;
    }
  },

  /**
   * Get Wix analytics
   * GET /api/integrations/wix/analytics
   */
  getWixAnalytics: async (timeRange?: string): Promise<{
    integration: {
      connected: boolean;
      lastSync: string;
      health: string;
    };
    performance: {
      syncSuccess: number;
      syncFailures: number;
      averageSyncTime: number;
      dataAccuracy: number;
    };
    business: {
      ordersProcessed: number;
      productsManaged: number;
      customersImported: number;
      revenue: number;
    };
    trends: Array<{
      date: string;
      orders: number;
      revenue: number;
      syncTime: number;
    }>;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (timeRange) queryParams.set('timeRange', timeRange);

      const response = await api.get<{
        integration: {
          connected: boolean;
          lastSync: string;
          health: string;
        };
        performance: {
          syncSuccess: number;
          syncFailures: number;
          averageSyncTime: number;
          dataAccuracy: number;
        };
        business: {
          ordersProcessed: number;
          productsManaged: number;
          customersImported: number;
          revenue: number;
        };
        trends: Array<{
          date: string;
          orders: number;
          revenue: number;
          syncTime: number;
        }>;
      }>(`/api/integrations/wix/analytics?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get Wix analytics error:', error);
      throw error;
    }
  },
};

// ===== LEGACY FUNCTIONS (Deprecated) =====

/**
 * @deprecated Use integrationsApi.getEcommerceIntegrations instead
 */
export const getIntegrationConfigs = async (): Promise<IntegrationConfig> => {
  console.warn('getIntegrationConfigs is deprecated, use integrationsApi.getEcommerceIntegrations instead');
  const response = await integrationsApi.getEcommerceIntegrations();
  return {
    shopifyIntegration: response.data.shopify?.connected ? {} as any : undefined,
    wooIntegration: response.data.woocommerce?.connected ? {} as any : undefined,
    wixIntegration: response.data.wix?.connected ? {} as any : undefined,
  };
};

/**
 * @deprecated Use integrationsApi.connectShopify instead
 */
export const connectShopify = async (data: any): Promise<IntegrationConfig> => {
  console.warn('connectShopify is deprecated, use integrationsApi.connectShopify instead');
  const response = await integrationsApi.connectShopify(data);
  return { shopifyIntegration: response.integration };
};

/**
 * @deprecated Use integrationsApi.syncShopifyData instead
 */
export const syncShopify = async (syncType?: string): Promise<{ synced: number; errors: string[] }> => {
  console.warn('syncShopify is deprecated, use integrationsApi.syncShopifyData instead');
  const response = await integrationsApi.syncShopifyData({ syncType: syncType as any });
  return { 
    synced: response.data.summary.products.synced + response.data.summary.orders.synced + response.data.summary.customers.synced,
    errors: response.data.errors 
  };
};

/**
 * @deprecated Use integrationsApi.testShopifyConnection instead
 */
export const getShopifyStatus = async (): Promise<IntegrationStatus> => {
  console.warn('getShopifyStatus is deprecated, use integrationsApi.testShopifyConnection instead');
  const response = await integrationsApi.testShopifyConnection();
  return {
    connected: response.connected,
    syncEnabled: true,
    health: response.success ? 'healthy' : 'error',
    error: response.tests.authentication.error || response.tests.apiAccess.error,
  };
};

/**
 * @deprecated Use integrationsApi.disconnectShopify instead
 */
export const disconnectShopify = async (): Promise<IntegrationConfig> => {
  console.warn('disconnectShopify is deprecated, use integrationsApi.disconnectShopify instead');
  await integrationsApi.disconnectShopify();
  return {};
};

/**
 * @deprecated Use integrationsApi.connectWooCommerce instead
 */
export const connectWooCommerce = async (data: any): Promise<IntegrationConfig> => {
  console.warn('connectWooCommerce is deprecated, use integrationsApi.connectWooCommerce instead');
  const response = await integrationsApi.connectWooCommerce(data);
  return { wooIntegration: response.integration };
};

/**
 * @deprecated Use integrationsApi.syncWooCommerceData instead
 */
export const syncWooCommerce = async (syncType?: string): Promise<{ synced: number; errors: string[] }> => {
  console.warn('syncWooCommerce is deprecated, use integrationsApi.syncWooCommerceData instead');
  const response = await integrationsApi.syncWooCommerceData({ syncType: syncType as any });
  return {
    synced: response.data.summary.products.synced + response.data.summary.orders.synced + response.data.summary.customers.synced,
    errors: response.data.errors
  };
};

/**
 * @deprecated Use integrationsApi.testWooCommerceConnection instead
 */
export const getWooCommerceStatus = async (): Promise<IntegrationStatus> => {
  console.warn('getWooCommerceStatus is deprecated, use integrationsApi.testWooCommerceConnection instead');
  const response = await integrationsApi.testWooCommerceConnection();
  return {
    connected: response.connected,
    syncEnabled: true,
    health: response.success ? 'healthy' : 'error',
    error: response.tests.authentication.error || response.tests.apiAccess.error,
  };
};

/**
 * @deprecated Use integrationsApi.disconnectWooCommerce instead
 */
export const disconnectWooCommerce = async (): Promise<IntegrationConfig> => {
  console.warn('disconnectWooCommerce is deprecated, use integrationsApi.disconnectWooCommerce instead');
  await integrationsApi.disconnectWooCommerce();
  return {};
};

/**
 * @deprecated Use integrationsApi.connectWix instead
 */
export const connectWix = async (data: any): Promise<IntegrationConfig> => {
  console.warn('connectWix is deprecated, use integrationsApi.connectWix instead');
  const response = await integrationsApi.connectWix(data);
  return { wixIntegration: response.integration };
};

/**
 * @deprecated Use integrationsApi.syncWixData instead
 */
export const syncWix = async (syncType?: string): Promise<{ synced: number; errors: string[] }> => {
  console.warn('syncWix is deprecated, use integrationsApi.syncWixData instead');
  const response = await integrationsApi.syncWixData({ syncType: syncType as any });
  return {
    synced: response.data.summary.products.synced + response.data.summary.orders.synced + response.data.summary.customers.synced,
    errors: response.data.errors
  };
};

/**
 * @deprecated Use integrationsApi.testWixConnection instead
 */
export const getWixStatus = async (): Promise<IntegrationStatus> => {
  console.warn('getWixStatus is deprecated, use integrationsApi.testWixConnection instead');
  const response = await integrationsApi.testWixConnection();
  return {
    connected: response.connected,
    syncEnabled: true,
    health: response.success ? 'healthy' : 'error',
    error: response.tests.authentication.error || response.tests.apiAccess.error,
  };
};

/**
 * @deprecated Use integrationsApi.disconnectWix instead
 */
export const disconnectWix = async (): Promise<IntegrationConfig> => {
  console.warn('disconnectWix is deprecated, use integrationsApi.disconnectWix instead');
  await integrationsApi.disconnectWix();
  return {};
};

/**
 * @deprecated Use integrationsApi.connectToBrand instead
 */
export const connectManufacturerToBrand = async (brandId: string, accessLevel?: string): Promise<any> => {
  console.warn('connectManufacturerToBrand is deprecated, use integrationsApi.connectToBrand instead');
  const response = await integrationsApi.connectToBrand({ brandId, accessLevel: accessLevel as any });
  return {
    brandId: response.connection.brandId,
    connectedAt: response.connection.requestedAt,
    sharedAnalytics: true,
    accessLevel: response.connection.accessLevel,
  };
};

/**
 * @deprecated Use integrationsApi.getManufacturerConnections instead
 */
export const getManufacturerConnections = async (): Promise<any[]> => {
  console.warn('getManufacturerConnections is deprecated, use integrationsApi.getManufacturerConnections instead');
  const response = await integrationsApi.getManufacturerConnections();
  return response.data.connections.map(conn => ({
    brandId: conn.manufacturerId, // Note: API seems to have naming inconsistency
    connectedAt: conn.connectedAt,
    sharedAnalytics: conn.sharedData.includes('analytics'),
    accessLevel: conn.accessLevel,
  }));
};

/**
 * @deprecated Use integrationsApi.getSharedAnalytics instead
 */
export const getSharedVotingAnalytics = async (brandId: string): Promise<any> => {
  console.warn('getSharedVotingAnalytics is deprecated, use integrationsApi.getSharedAnalytics instead');
  const response = await integrationsApi.getSharedAnalytics(brandId);
  return {
    totalVotes: response.analytics.votes.total,
    byProduct: response.analytics.votes.byProduct,
    topProducts: response.analytics.votes.byProduct.slice(0, 5),
  };
};

/**
 * @deprecated Use integrationsApi.disconnectFromBrand instead
 */
export const disconnectManufacturerFromBrand = async (brandId: string): Promise<{ success: boolean }> => {
  console.warn('disconnectManufacturerFromBrand is deprecated, use integrationsApi.disconnectFromBrand instead');
  const response = await integrationsApi.disconnectFromBrand(brandId);
  return { success: response.success };
};