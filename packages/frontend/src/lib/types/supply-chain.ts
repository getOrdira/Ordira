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
 * Supply chain event creation request
 * For creating new supply chain events
 */
export interface CreateSupplyChainEventRequest {
  product: string;
  certificate?: string;
  manufacturer: string;
  eventType: SupplyChainEventType;
  eventData: EventData;
  logToBlockchain?: boolean;
}

/**
 * Supply chain event update request
 * For updating existing supply chain events
 */
export interface UpdateSupplyChainEventRequest {
  eventType?: SupplyChainEventType;
  eventData?: EventData;
  logToBlockchain?: boolean;
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
  qualityMetrics: Joi.object().optional()
});

/**
 * Create supply chain event request validation schema
 */
export const createSupplyChainEventRequestSchema = Joi.object({
  product: commonSchemas.mongoId.required(),
  certificate: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.required(),
  eventType: supplyChainEventTypeSchema.required(),
  eventData: eventDataSchema.required(),
  logToBlockchain: Joi.boolean().default(false)
});

/**
 * Update supply chain event request validation schema
 */
export const updateSupplyChainEventRequestSchema = Joi.object({
  eventType: supplyChainEventTypeSchema.optional(),
  eventData: eventDataSchema.optional(),
  logToBlockchain: Joi.boolean().optional()
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
 * Batch create supply chain event request validation schema
 */
export const batchCreateSupplyChainEventRequestSchema = Joi.object({
  events: Joi.array().items(
    Joi.object({
      product: commonSchemas.mongoId.required(),
      certificate: commonSchemas.mongoId.optional(),
      manufacturer: commonSchemas.mongoId.required(),
      eventType: supplyChainEventTypeSchema.required(),
      eventData: eventDataSchema.required()
    })
  ).min(1).max(100).required(),
  batchOptions: Joi.object({
    logToBlockchain: Joi.boolean().default(false),
    generateQrCodes: Joi.boolean().default(true)
  }).optional()
});

/**
 * Supply chain settings validation schema
 */
export const supplyChainSettingsSchema = Joi.object({
  blockchain: Joi.object({
    enabled: Joi.boolean().default(true),
    autoLog: Joi.boolean().default(false),
    requiredEvents: Joi.array().items(supplyChainEventTypeSchema).optional()
  }).required(),
  qrCodes: Joi.object({
    enabled: Joi.boolean().default(true),
    autoGenerate: Joi.boolean().default(true),
    baseUrl: commonSchemas.url.required()
  }).required(),
  analytics: Joi.object({
    trackViews: Joi.boolean().default(true),
    trackQualityMetrics: Joi.boolean().default(true),
    retentionDays: Joi.number().min(30).max(3650).default(365)
  }).required(),
  notifications: Joi.object({
    eventCreated: Joi.boolean().default(true),
    blockchainLogged: Joi.boolean().default(true),
    qrCodeGenerated: Joi.boolean().default(true),
    emailNotifications: Joi.boolean().default(true),
    inAppNotifications: Joi.boolean().default(true)
  }).required()
});

/**
 * Supply chain template validation schema
 */
export const supplyChainTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  eventType: supplyChainEventTypeSchema.required(),
  defaultEventData: eventDataSchema.required(),
  isActive: Joi.boolean().default(true)
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
  supplyChainEventQuery: supplyChainEventQuerySchema,
  batchCreateSupplyChainEventRequest: batchCreateSupplyChainEventRequestSchema,
  supplyChainSettings: supplyChainSettingsSchema,
  supplyChainTemplate: supplyChainTemplateSchema
};
