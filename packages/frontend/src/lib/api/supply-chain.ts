// src/lib/api/supply-chain.ts

import apiClient from './client';
import { 
  SupplyChainEvent, 
  SupplyChainContract,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainLocation,
  TrackingData,
  RateLimitInfo,
  SupplyChainEventType
} from '@/lib/types/supply-chain';

// ===== API FUNCTIONS (Aligned with Backend Routes) =====

export const supplyChainApi = {
  // ===== CONTRACT MANAGEMENT =====
  
  // Deploy supply chain contract
  deployContract: async (data: { manufacturerName: string }): Promise<{ contractAddress: string; txHash: string; blockNumber: number; gasUsed: string; deploymentCost: string }> => {
    const response = await apiClient.post('/api/supply-chain/deploy', data) as any;
    return response.data as { contractAddress: string; txHash: string; blockNumber: number; gasUsed: string; deploymentCost: string };
  },

  // Get contract information
  getContract: async (): Promise<SupplyChainContract> => {
    const response = await apiClient.get('/api/supply-chain/contract') as any;
    return response.data as SupplyChainContract;
  },

  // ===== ENDPOINT MANAGEMENT =====
  
  // Create endpoint
  createEndpoint: async (data: { name: string; eventType: SupplyChainEventType; location: string }): Promise<SupplyChainEndpoint> => {
    const response = await apiClient.post('/api/supply-chain/endpoints', data) as any;
    return response.data as SupplyChainEndpoint;
  },

  // Get all endpoints
  getEndpoints: async (): Promise<SupplyChainEndpoint[]> => {
    const response = await apiClient.get('/api/supply-chain/endpoints') as any;
    return response.data as SupplyChainEndpoint[];
  },

  // ===== PRODUCT MANAGEMENT =====
  
  // Register product
  registerProduct: async (data: { productId: string; name: string; description?: string }): Promise<SupplyChainProduct> => {
    const response = await apiClient.post('/api/supply-chain/products', data) as any;
    return response.data as SupplyChainProduct;
  },

  // Get all products
  getProducts: async (params?: { page?: number; limit?: number; productId?: string; eventType?: string; startDate?: string; endDate?: string }): Promise<SupplyChainProduct[]> => {
    const response = await apiClient.get('/api/supply-chain/products', { params }) as any;
    return response.data as SupplyChainProduct[];
  },

  // Get product events
  getProductEvents: async (productId: string, params?: { page?: number; limit?: number; eventType?: string; startDate?: string; endDate?: string }): Promise<SupplyChainEvent[]> => {
    const response = await apiClient.get(`/api/supply-chain/products/${productId}/events`, { params }) as any;
    return response.data as SupplyChainEvent[];
  },

  // ===== EVENT MANAGEMENT =====
  
  // Log event for a product
  logEvent: async (productId: string, data: {
    productId: string;
    eventType: SupplyChainEventType;
    eventData?: {
      location?: string;
      coordinates?: { lat: number; lng: number };
      temperature?: number;
      humidity?: number;
      qualityMetrics?: Record<string, any>;
      notes?: string;
    };
  }): Promise<SupplyChainEvent> => {
    const response = await apiClient.post(`/api/products/${productId}/supply-chain/events`, data) as any;
    return response.data as SupplyChainEvent;
  },

  // Get events for a product
  getEvents: async (productId: string): Promise<SupplyChainEvent[]> => {
    const response = await apiClient.get(`/api/products/${productId}/supply-chain/events`) as any;
    return response.data as SupplyChainEvent[];
  },

  // Get tracking data for a product
  getTrackingData: async (productId: string): Promise<TrackingData> => {
    const response = await apiClient.get(`/api/products/${productId}/supply-chain/tracking`) as any;
    return response.data as TrackingData;
  },

  // ===== QR CODE MANAGEMENT =====
  
  // Scan QR code
  scanQRCode: async (data: {
    qrCodeData: string;
    eventType: SupplyChainEventType;
    eventData?: {
      location?: string;
      coordinates?: { lat: number; lng: number };
      temperature?: number;
      humidity?: number;
      qualityMetrics?: Record<string, any>;
      notes?: string;
    };
  }): Promise<{ success: boolean; event: SupplyChainEvent; product: { id: string; name: string; qrCodeGenerated: boolean }; rateLimits: any }> => {
    const response = await apiClient.post('/api/supply-chain/scan-qr', data) as any;
    return response.data as { success: boolean; event: SupplyChainEvent; product: { id: string; name: string; qrCodeGenerated: boolean }; rateLimits: any };
  },

  // Generate batch QR codes
  generateBatchQrCodes: async (data: {
    productIds: string[];
    batchName?: string;
    batchDescription?: string;
    batchMetadata?: {
      batchSize?: number;
      productionDate?: Date;
      qualityGrade?: string;
      shippingMethod?: string;
      destination?: string;
      specialInstructions?: string;
    };
  }): Promise<{
    batch: {
      id: string;
      name: string;
      description: string;
      productCount: number;
      status: string;
      createdAt: Date;
    };
    qrCode: {
      data: string;
      imageUrl: string;
      batchId: string;
      isActive: boolean;
      generatedAt: Date;
    };
    products: Array<{
      id: string;
      title: string;
      category: string;
      price: number;
      batchQrLinked: boolean;
    }>;
    batchMetadata: any;
    rateLimits: any;
  }> => {
    const response = await apiClient.post('/api/supply-chain/qr-codes/batch', data) as any;
    return response.data as any;
  },

  // ===== LOCATION MANAGEMENT =====
  
  // Create location
  createLocation: async (data: {
    name: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    coordinates: { lat: number; lng: number };
    locationType: 'factory' | 'warehouse' | 'distribution_center' | 'retail_store' | 'custom';
    capabilities?: string[];
    allowedEventTypes: SupplyChainEventType[];
    contactInfo?: {
      phone?: string;
      email?: string;
      contactPerson?: string;
    };
    environmentalConditions?: {
      temperatureRange?: { min: number; max: number };
      humidityRange?: { min: number; max: number };
      specialRequirements?: string[];
    };
  }): Promise<SupplyChainLocation> => {
    const response = await apiClient.post('/api/supply-chain/locations', data) as any;
    return response.data as SupplyChainLocation;
  },

  // Get all locations
  getLocations: async (params?: { eventType?: string; locationType?: string; active?: boolean; page?: number; limit?: number }): Promise<{
    data: SupplyChainLocation[];
    count: number;
    filters: any;
  }> => {
    const response = await apiClient.get('/api/supply-chain/locations', { params }) as any;
    return response.data as { data: SupplyChainLocation[]; count: number; filters: any };
  },

  // Get specific location
  getLocation: async (id: string): Promise<SupplyChainLocation> => {
    const response = await apiClient.get(`/api/supply-chain/locations/${id}`) as any;
    return response.data as SupplyChainLocation;
  },

  // Update location
  updateLocation: async (id: string, data: Partial<SupplyChainLocation>): Promise<SupplyChainLocation> => {
    const response = await apiClient.put(`/api/supply-chain/locations/${id}`, data) as any;
    return response.data as SupplyChainLocation;
  },

  // Delete location
  deleteLocation: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/supply-chain/locations/${id}`) as any;
    return response.data as { success: boolean; message: string };
  },

  // Get nearby locations
  getNearbyLocations: async (params: { lat: string; lng: string; radius?: string; page?: number; limit?: number }): Promise<{
    data: SupplyChainLocation[];
    count: number;
    searchParams: {
      coordinates: { lat: number; lng: number };
      radiusKm: number;
    };
  }> => {
    const response = await apiClient.get('/api/supply-chain/locations/nearby', { params }) as any;
    return response.data as { data: SupplyChainLocation[]; count: number; searchParams: { coordinates: { lat: number; lng: number }; radiusKm: number } };
  },

  // Get location stats
  getLocationStats: async (): Promise<{
    summary: {
      total: number;
      active: number;
      inactive: number;
      totalEvents: number;
    };
    byType: Record<string, { count: number; events: number; active: number }>;
    generatedAt: Date;
  }> => {
    const response = await apiClient.get('/api/supply-chain/locations/stats') as any;
    return response.data as {
      summary: {
        total: number;
        active: number;
        inactive: number;
        totalEvents: number;
      };
      byType: Record<string, { count: number; events: number; active: number }>;
      generatedAt: Date;
    };
  },

  // ===== RATE LIMITS =====
  
  // Get rate limit information
  getRateLimitInfo: async (): Promise<RateLimitInfo> => {
    const response = await apiClient.get('/api/supply-chain/rate-limits') as any;
    return response.data as RateLimitInfo;
  },
};