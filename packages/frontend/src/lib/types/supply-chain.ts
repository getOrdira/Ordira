// src/lib/types/supply-chain.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Supply chain event type types
 * Based on backend ISupplyChainEvent model eventType field
 */
export type SupplyChainEventType = 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';

/**
 * Location type for supply chain tracking
 * Based on backend Location model
 */
export type LocationType = 'factory' | 'warehouse' | 'distribution_center' | 'retail_store' | 'custom';

/**
 * Coordinates interface
 * Based on backend ISupplyChainEvent model eventData coordinates field
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Event data interface
 * Based on backend ISupplyChainEvent model eventData field
 */
export interface EventData {
  location?: string;
  coordinates?: Coordinates;
  temperature?: number; // For cold chain
  humidity?: number;
  qualityMetrics?: Record<string, any>;
  notes?: string;
  scannedAt?: string;
  qrCodeData?: string;
}

/**
 * Supply chain event interface
 * Based on backend ISupplyChainEvent model
 */
export interface SupplyChainEvent {
  _id: string;
  product: string; // Product ID reference
  certificate?: string; // Certificate ID reference
  manufacturer: string; // Manufacturer ID reference
  eventType: SupplyChainEventType;
  eventData: EventData;
  qrCodeUrl?: string;
  txHash?: string;
  blockNumber?: number;
  
  // Analytics integration
  viewCount: number;
  lastViewedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supply chain contract interface
 * Based on backend contract deployment response
 */
export interface SupplyChainContract {
  contractAddress: string;
  stats: {
    totalEvents: number;
    totalProducts: number;
    totalEndpoints: number;
    lastEventAt?: Date;
  };
  deployedAt: Date;
}

/**
 * Supply chain endpoint interface
 * Based on backend smart contract Endpoint struct
 */
export interface SupplyChainEndpoint {
  id: number;
  name: string;
  eventType: SupplyChainEventType;
  location: string;
  isActive: boolean;
  eventCount: number;
  createdAt: number;
}

/**
 * Supply chain product interface
 * Based on backend smart contract Product struct
 */
export interface SupplyChainProduct {
  id: number;
  productId: string;
  name: string;
  description: string;
  totalEvents: number;
  createdAt: number;
  isActive: boolean;
}

/**
 * Supply chain location interface
 * Based on backend Location model
 */
export interface SupplyChainLocation {
  _id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  coordinates: Coordinates;
  locationType: LocationType;
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
  isActive: boolean;
  eventCount: number;
  manufacturer: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tracking data interface
 * Based on backend getTrackingData response
 */
export interface TrackingData {
  productId: string;
  totalEvents: number;
  lastEvent: SupplyChainEvent | null;
  timeline: Array<{
    eventType: SupplyChainEventType;
    timestamp: Date;
    location?: string;
    txHash?: string;
  }>;
  completionPercentage: number;
}

/**
 * Rate limit information interface
 * Based on backend getRateLimitInfo response
 */
export interface RateLimitInfo {
  plan: string;
  limits: {
    eventsPerMinute: number;
    eventsPerHour: number;
    eventsPerDay: number;
    cooldownPeriod: number;
    burstAllowance: number;
  };
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
    cooldownRemaining: number;
  };
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  utilization: {
    minute: number;
    hour: number;
    day: number;
  };
  nextReset: {
    minute: Date;
    hour: Date;
    day: Date;
  };
  canLogEvent: boolean;
}

/**
 * Supply chain event creation request
 * For creating new supply chain events
 */
export interface CreateSupplyChainEventRequest {
  productId: string;
  eventType: SupplyChainEventType;
  eventData?: EventData;
}

/**
 * Supply chain event update request
 * For updating existing supply chain events
 */
export interface UpdateSupplyChainEventRequest {
  eventType?: SupplyChainEventType;
  eventData?: EventData;
}

/**
 * QR code scan request
 * Based on backend qrScanSchema
 */
export interface QRCodeScanRequest {
  qrCodeData: string;
  eventType: SupplyChainEventType;
  eventData?: EventData;
}

/**
 * Batch QR code generation request
 * Based on backend batchQrCodeSchema
 */
export interface BatchQRCodeRequest {
  productIds: string[];
  batchName?: string;
  batchDescription?: string;
  batchMetadata?: {
    batchSize?: number;
    productionDate?: Date;
    qualityGrade?: 'A' | 'B' | 'C' | 'Premium' | 'Standard' | 'Economy';
    shippingMethod?: string;
    destination?: string;
    specialInstructions?: string;
  };
}

/**
 * Location creation request
 * Based on backend locationSchema
 */
export interface CreateLocationRequest {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  coordinates: Coordinates;
  locationType: LocationType;
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
}

/**
 * Contract deployment request
 * Based on backend contractDeploymentSchema
 */
export interface ContractDeploymentRequest {
  manufacturerName: string;
}

/**
 * Endpoint creation request
 * Based on backend endpointSchema
 */
export interface CreateEndpointRequest {
  name: string;
  eventType: SupplyChainEventType;
  location: string;
}

/**
 * Product registration request
 * Based on backend productSchema
 */
export interface RegisterProductRequest {
  productId: string;
  name: string;
  description?: string;
}

/**
 * Supply chain event list response
 * For paginated supply chain event lists
 */
export interface SupplyChainEventListResponse extends PaginatedResponse<SupplyChainEvent> {
  events: SupplyChainEvent[];
  analytics: {
    totalEvents: number;
    eventsByType: Array<{
      eventType: SupplyChainEventType;
      count: number;
    }>;
    blockchainEvents: number;
    qrCodeEvents: number;
    averageViewCount: number;
  };
}

/**
 * Supply chain event detail response
 * For detailed supply chain event information
 */
export interface SupplyChainEventDetailResponse {
  event: SupplyChainEvent;
  product: {
    _id: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
  manufacturer: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  certificate?: {
    _id: string;
    tokenId: string;
    status: string;
  };
  blockchainInfo?: {
    txHash: string;
    blockNumber: number;
    verified: boolean;
  };
  analytics: {
    viewCount: number;
    lastViewedAt?: Date;
    qrCodeScans: number;
  };
  timeline: SupplyChainEvent[];
}

/**
 * Supply chain analytics response
 * For supply chain analytics and reporting
 */
export interface SupplyChainAnalyticsResponse {
  overview: {
    totalEvents: number;
    totalProducts: number;
    totalManufacturers: number;
    blockchainEvents: number;
    averageEventTime: number;
    averageViewCount: number;
  };
  eventTypeDistribution: Array<{
    eventType: SupplyChainEventType;
    count: number;
    percentage: number;
  }>;
  manufacturerStats: Array<{
    manufacturer: {
      _id: string;
      name: string;
    };
    eventCount: number;
    averageViewCount: number;
    blockchainEvents: number;
  }>;
  productStats: Array<{
    product: {
      _id: string;
      title: string;
    };
    eventCount: number;
    lastEvent?: Date;
    completionRate: number;
  }>;
  monthlyStats: Array<{
    month: string;
    events: number;
    products: number;
    manufacturers: number;
    blockchainEvents: number;
  }>;
  qualityMetrics: Array<{
    metric: string;
    averageValue: number;
    minValue: number;
    maxValue: number;
    eventCount: number;
  }>;
}

/**
 * Supply chain tracking response
 * For public supply chain tracking
 */
export interface SupplyChainTrackingResponse {
  product: {
    _id: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
  manufacturer: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  events: Array<{
    eventType: SupplyChainEventType;
    timestamp: Date;
    location?: string;
    coordinates?: Coordinates;
    temperature?: number;
    humidity?: number;
    qualityMetrics?: Record<string, any>;
    verified: boolean;
  }>;
  timeline: Array<{
    eventType: SupplyChainEventType;
    timestamp: Date;
    status: 'completed' | 'pending' | 'in_progress';
    description: string;
  }>;
  qrCode: {
    url: string;
    data: string;
  };
  blockchain: {
    verified: boolean;
    txHash?: string;
    blockNumber?: number;
  };
}

/**
 * Supply chain search response
 * For supply chain event search results
 */
export interface SupplyChainSearchResponse extends PaginatedResponse<SupplyChainEvent> {
  events: SupplyChainEvent[];
  filters: {
    eventTypes: SupplyChainEventType[];
    manufacturers: Array<{
      _id: string;
      name: string;
    }>;
    dateRange: {
      from: Date;
      to: Date;
    };
    hasBlockchain: boolean;
    hasQrCode: boolean;
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Supply chain event batch creation request
 * For creating multiple supply chain events
 */
export interface BatchCreateSupplyChainEventRequest {
  events: Array<{
    product: string;
    certificate?: string;
    manufacturer: string;
    eventType: SupplyChainEventType;
    eventData: EventData;
  }>;
  batchOptions?: {
    logToBlockchain?: boolean;
    generateQrCodes?: boolean;
  };
}

/**
 * Supply chain event batch creation response
 * For batch supply chain event creation results
 */
export interface BatchCreateSupplyChainEventResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
  results: Array<{
    index: number;
    eventId: string;
    status: 'success' | 'failed';
    qrCodeUrl?: string;
    txHash?: string;
    message?: string;
  }>;
}

/**
 * Supply chain settings interface
 * For supply chain management settings
 */
export interface SupplyChainSettings {
  blockchain: {
    enabled: boolean;
    autoLog: boolean;
    requiredEvents: SupplyChainEventType[];
  };
  qrCodes: {
    enabled: boolean;
    autoGenerate: boolean;
    baseUrl: string;
  };
  analytics: {
    trackViews: boolean;
    trackQualityMetrics: boolean;
    retentionDays: number;
  };
  notifications: {
    eventCreated: boolean;
    blockchainLogged: boolean;
    qrCodeGenerated: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
}

/**
 * Supply chain template interface
 * For supply chain event templates
 */
export interface SupplyChainTemplate {
  _id: string;
  name: string;
  description?: string;
  eventType: SupplyChainEventType;
  defaultEventData: EventData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Supply chain event type validation schema
 */
export const supplyChainEventTypeSchema = Joi.string()
  .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
  .required()
  .messages({
    'any.only': 'Event type must be one of: sourced, manufactured, quality_checked, packaged, shipped, delivered'
  });

/**
 * Coordinates validation schema
 */
export const coordinatesSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

/**
 * Event data validation schema
 */
export const eventDataSchema = Joi.object({
  location: Joi.string().max(200).optional(),
  coordinates: coordinatesSchema.optional(),
  temperature: Joi.number().min(-50).max(100).optional(),
  humidity: Joi.number().min(0).max(100).optional(),
  qualityMetrics: Joi.object().optional(),
  notes: Joi.string().max(1000).optional(),
  scannedAt: Joi.string().optional(),
  qrCodeData: Joi.string().optional()
});

/**
 * Create supply chain event request validation schema
 */
export const createSupplyChainEventRequestSchema = Joi.object({
  productId: Joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/).required(),
  eventType: supplyChainEventTypeSchema.required(),
  eventData: eventDataSchema.optional()
});

/**
 * Update supply chain event request validation schema
 */
export const updateSupplyChainEventRequestSchema = Joi.object({
  eventType: supplyChainEventTypeSchema.optional(),
  eventData: eventDataSchema.optional()
});

/**
 * QR code scan request validation schema
 */
export const qrCodeScanRequestSchema = Joi.object({
  qrCodeData: Joi.string().min(10).required(),
  eventType: supplyChainEventTypeSchema.required(),
  eventData: eventDataSchema.optional()
});

/**
 * Batch QR code request validation schema
 */
export const batchQRCodeRequestSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().pattern(/^[a-zA-Z0-9\-_]+$/)).min(1).max(50).required(),
  batchName: Joi.string().min(2).max(100).optional(),
  batchDescription: Joi.string().max(500).optional(),
  batchMetadata: Joi.object({
    batchSize: Joi.number().integer().min(1).max(1000).optional(),
    productionDate: Joi.date().iso().optional(),
    qualityGrade: Joi.string().valid('A', 'B', 'C', 'Premium', 'Standard', 'Economy').optional(),
    shippingMethod: Joi.string().max(50).optional(),
    destination: Joi.string().max(100).optional(),
    specialInstructions: Joi.string().max(1000).optional()
  }).optional()
});

/**
 * Location creation request validation schema
 */
export const createLocationRequestSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  address: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  postalCode: Joi.string().max(20).optional(),
  coordinates: coordinatesSchema.required(),
  locationType: Joi.string().valid('factory', 'warehouse', 'distribution_center', 'retail_store', 'custom').required(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  allowedEventTypes: Joi.array().items(supplyChainEventTypeSchema).min(1).required(),
  contactInfo: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    email: Joi.string().email().optional(),
    contactPerson: Joi.string().max(100).optional()
  }).optional(),
  environmentalConditions: Joi.object({
    temperatureRange: Joi.object({
      min: Joi.number().min(-50).max(100).required(),
      max: Joi.number().min(-50).max(100).required()
    }).optional(),
    humidityRange: Joi.object({
      min: Joi.number().min(0).max(100).required(),
      max: Joi.number().min(0).max(100).required()
    }).optional(),
    specialRequirements: Joi.array().items(Joi.string()).optional()
  }).optional()
});

/**
 * Contract deployment request validation schema
 */
export const contractDeploymentRequestSchema = Joi.object({
  manufacturerName: Joi.string().min(2).max(100).pattern(/^[a-zA-Z0-9\s\-&.,()]+$/).required()
});

/**
 * Endpoint creation request validation schema
 */
export const createEndpointRequestSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  eventType: supplyChainEventTypeSchema.required(),
  location: Joi.string().min(2).max(200).required()
});

/**
 * Product registration request validation schema
 */
export const registerProductRequestSchema = Joi.object({
  productId: Joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9\-_]+$/).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional()
});

/**
 * Supply chain event query validation schema
 */
export const supplyChainEventQuerySchema = Joi.object({
  product: commonSchemas.mongoId.optional(),
  certificate: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.optional(),
  eventType: supplyChainEventTypeSchema.optional(),
  hasBlockchain: Joi.boolean().optional(),
  hasQrCode: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'eventType', 'viewCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Export all supply chain validation schemas
 */
export const supplyChainValidationSchemas = {
  supplyChainEventType: supplyChainEventTypeSchema,
  coordinates: coordinatesSchema,
  eventData: eventDataSchema,
  createSupplyChainEventRequest: createSupplyChainEventRequestSchema,
  updateSupplyChainEventRequest: updateSupplyChainEventRequestSchema,
  qrCodeScanRequest: qrCodeScanRequestSchema,
  batchQRCodeRequest: batchQRCodeRequestSchema,
  createLocationRequest: createLocationRequestSchema,
  contractDeploymentRequest: contractDeploymentRequestSchema,
  createEndpointRequest: createEndpointRequestSchema,
  registerProductRequest: registerProductRequestSchema,
  supplyChainEventQuery: supplyChainEventQuerySchema
};