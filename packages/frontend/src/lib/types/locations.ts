// src/lib/types/locations.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Location type types
 * Based on backend ILocation model locationType field
 */
export type LocationType = 'factory' | 'warehouse' | 'distribution_center' | 'retail_store' | 'custom';

/**
 * Supply chain event type types
 * Based on backend ILocation model allowedEventTypes field
 */
export type AllowedEventType = 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';

/**
 * Coordinates interface
 * Based on backend ILocation model coordinates field
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Contact info interface
 * Based on backend ILocation model contactInfo field
 */
export interface ContactInfo {
  phone?: string;
  email?: string;
  contactPerson?: string;
}

/**
 * Environmental conditions interface
 * Based on backend ILocation model environmentalConditions field
 */
export interface EnvironmentalConditions {
  temperatureRange?: {
    min: number;
    max: number;
  };
  humidityRange?: {
    min: number;
    max: number;
  };
  specialRequirements?: string[];
}

/**
 * Location interface
 * Based on backend ILocation model
 */
export interface Location {
  _id: string;
  
  // Core location information
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  
  // Geographic coordinates
  coordinates: Coordinates;
  
  // Location type and capabilities
  locationType: LocationType;
  capabilities: string[];
  
  // Event types that can occur at this location
  allowedEventTypes: AllowedEventType[];
  
  // Owner information
  manufacturer: string; // Manufacturer ID reference
  
  // Status and metadata
  isActive: boolean;
  contactInfo?: ContactInfo;
  
  // Environmental conditions
  environmentalConditions?: EnvironmentalConditions;
  
  // Analytics
  eventCount: number;
  lastEventAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location creation request
 * For creating new locations
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
  capabilities: string[];
  allowedEventTypes: AllowedEventType[];
  manufacturer: string;
  contactInfo?: ContactInfo;
  environmentalConditions?: EnvironmentalConditions;
}

/**
 * Location update request
 * For updating existing locations
 */
export interface UpdateLocationRequest {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: Coordinates;
  locationType?: LocationType;
  capabilities?: string[];
  allowedEventTypes?: AllowedEventType[];
  isActive?: boolean;
  contactInfo?: ContactInfo;
  environmentalConditions?: EnvironmentalConditions;
}

/**
 * Location list response
 * For paginated location lists
 */
export interface LocationListResponse extends PaginatedResponse<Location> {
  locations: Location[];
  analytics: {
    totalLocations: number;
    activeLocations: number;
    locationsByType: Array<{
      type: LocationType;
      count: number;
    }>;
    totalEvents: number;
    averageEventsPerLocation: number;
  };
}

/**
 * Location detail response
 * For detailed location information
 */
export interface LocationDetailResponse {
  location: Location;
  manufacturer: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  capabilities: Array<{
    capability: string;
    description?: string;
  }>;
  recentEvents: Array<{
    eventType: AllowedEventType;
    timestamp: Date;
    product: string;
    description?: string;
  }>;
  analytics: {
    eventCount: number;
    lastEventAt?: Date;
    averageEventsPerMonth: number;
    topEventTypes: Array<{
      eventType: AllowedEventType;
      count: number;
    }>;
  };
  nearbyLocations: Array<{
    location: Location;
    distance: number; // in kilometers
  }>;
}

/**
 * Location analytics response
 * For location analytics and reporting
 */
export interface LocationAnalyticsResponse {
  overview: {
    totalLocations: number;
    activeLocations: number;
    totalEvents: number;
    averageEventsPerLocation: number;
    locationsByCountry: number;
    locationsByType: number;
  };
  typeDistribution: Array<{
    type: LocationType;
    count: number;
    percentage: number;
    averageEvents: number;
  }>;
  countryDistribution: Array<{
    country: string;
    count: number;
    percentage: number;
    averageEvents: number;
  }>;
  capabilityDistribution: Array<{
    capability: string;
    count: number;
    percentage: number;
  }>;
  eventTypeDistribution: Array<{
    eventType: AllowedEventType;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    locationsAdded: number;
    events: number;
    averageEventsPerLocation: number;
  }>;
  topLocations: Array<{
    location: Location;
    metrics: {
      eventCount: number;
      lastEventAt?: Date;
      averageEventsPerMonth: number;
    };
  }>;
}

/**
 * Location search response
 * For location search results
 */
export interface LocationSearchResponse extends PaginatedResponse<Location> {
  locations: Location[];
  filters: {
    types: LocationType[];
    countries: string[];
    capabilities: string[];
    eventTypes: AllowedEventType[];
    hasEnvironmentalConditions: boolean;
    isActive: boolean;
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Location distance search request
 * For finding locations within a radius
 */
export interface LocationDistanceSearchRequest {
  coordinates: Coordinates;
  radiusKm: number;
  locationTypes?: LocationType[];
  capabilities?: string[];
  allowedEventTypes?: AllowedEventType[];
  maxResults?: number;
}

/**
 * Location distance search response
 * For location distance search results
 */
export interface LocationDistanceSearchResponse {
  locations: Array<{
    location: Location;
    distance: number; // in kilometers
  }>;
  searchCenter: Coordinates;
  searchRadius: number;
  totalFound: number;
}

/**
 * Location batch creation request
 * For creating multiple locations
 */
export interface BatchCreateLocationRequest {
  locations: Array<{
    name: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    coordinates: Coordinates;
    locationType: LocationType;
    capabilities: string[];
    allowedEventTypes: AllowedEventType[];
    manufacturer: string;
    contactInfo?: ContactInfo;
    environmentalConditions?: EnvironmentalConditions;
  }>;
  batchOptions?: {
    validateCoordinates?: boolean;
    checkDuplicates?: boolean;
  };
}

/**
 * Location batch creation response
 * For batch location creation results
 */
export interface BatchCreateLocationResponse {
  success: boolean;
  processed: number;
  created: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
  results: Array<{
    index: number;
    locationId?: string;
    status: 'created' | 'failed' | 'skipped';
    message?: string;
  }>;
}

/**
 * Location settings interface
 * For location management settings
 */
export interface LocationSettings {
  validation: {
    requireCoordinates: boolean;
    validateAddress: boolean;
    checkDuplicates: boolean;
    maxLocationsPerManufacturer: number;
  };
  capabilities: {
    predefinedCapabilities: string[];
    allowCustomCapabilities: boolean;
    maxCapabilitiesPerLocation: number;
  };
  environmental: {
    trackEnvironmentalConditions: boolean;
    requiredConditions: string[];
    temperatureUnit: 'celsius' | 'fahrenheit';
  };
  analytics: {
    trackEventCount: boolean;
    trackLastEvent: boolean;
    retentionDays: number;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Location type validation schema
 */
export const locationTypeSchema = Joi.string()
  .valid('factory', 'warehouse', 'distribution_center', 'retail_store', 'custom')
  .required()
  .messages({
    'any.only': 'Location type must be one of: factory, warehouse, distribution_center, retail_store, custom'
  });

/**
 * Allowed event type validation schema
 */
export const allowedEventTypeSchema = Joi.string()
  .valid('sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered')
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
 * Contact info validation schema
 */
export const contactInfoSchema = Joi.object({
  phone: Joi.string().max(20).optional(),
  email: commonSchemas.optionalEmail,
  contactPerson: Joi.string().max(100).optional()
});

/**
 * Environmental conditions validation schema
 */
export const environmentalConditionsSchema = Joi.object({
  temperatureRange: Joi.object({
    min: Joi.number().min(-50).max(100).required(),
    max: Joi.number().min(-50).max(100).required()
  }).optional(),
  humidityRange: Joi.object({
    min: Joi.number().min(0).max(100).required(),
    max: Joi.number().min(0).max(100).required()
  }).optional(),
  specialRequirements: Joi.array().items(Joi.string().max(200)).optional()
});

/**
 * Create location request validation schema
 */
export const createLocationRequestSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  address: Joi.string().min(1).max(500).required(),
  city: Joi.string().min(1).max(100).required(),
  state: Joi.string().min(1).max(100).required(),
  country: Joi.string().min(1).max(100).required(),
  postalCode: Joi.string().max(20).optional(),
  coordinates: coordinatesSchema.required(),
  locationType: locationTypeSchema.required(),
  capabilities: Joi.array().items(Joi.string().max(100)).min(1).required(),
  allowedEventTypes: Joi.array().items(allowedEventTypeSchema).min(1).required(),
  manufacturer: commonSchemas.mongoId.required(),
  contactInfo: contactInfoSchema.optional(),
  environmentalConditions: environmentalConditionsSchema.optional()
});

/**
 * Update location request validation schema
 */
export const updateLocationRequestSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  address: Joi.string().min(1).max(500).optional(),
  city: Joi.string().min(1).max(100).optional(),
  state: Joi.string().min(1).max(100).optional(),
  country: Joi.string().min(1).max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  coordinates: coordinatesSchema.optional(),
  locationType: locationTypeSchema.optional(),
  capabilities: Joi.array().items(Joi.string().max(100)).optional(),
  allowedEventTypes: Joi.array().items(allowedEventTypeSchema).optional(),
  isActive: Joi.boolean().optional(),
  contactInfo: contactInfoSchema.optional(),
  environmentalConditions: environmentalConditionsSchema.optional()
});

/**
 * Location query validation schema
 */
export const locationQuerySchema = Joi.object({
  manufacturer: commonSchemas.mongoId.optional(),
  locationType: locationTypeSchema.optional(),
  country: Joi.string().optional(),
  city: Joi.string().optional(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  allowedEventTypes: Joi.array().items(allowedEventTypeSchema).optional(),
  isActive: Joi.boolean().optional(),
  hasEnvironmentalConditions: Joi.boolean().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'city', 'country', 'eventCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Location distance search request validation schema
 */
export const locationDistanceSearchRequestSchema = Joi.object({
  coordinates: coordinatesSchema.required(),
  radiusKm: Joi.number().min(0.1).max(10000).required(),
  locationTypes: Joi.array().items(locationTypeSchema).optional(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  allowedEventTypes: Joi.array().items(allowedEventTypeSchema).optional(),
  maxResults: Joi.number().min(1).max(100).default(50)
});

/**
 * Batch create location request validation schema
 */
export const batchCreateLocationRequestSchema = Joi.object({
  locations: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(200).required(),
      description: Joi.string().max(1000).optional(),
      address: Joi.string().min(1).max(500).required(),
      city: Joi.string().min(1).max(100).required(),
      state: Joi.string().min(1).max(100).required(),
      country: Joi.string().min(1).max(100).required(),
      postalCode: Joi.string().max(20).optional(),
      coordinates: coordinatesSchema.required(),
      locationType: locationTypeSchema.required(),
      capabilities: Joi.array().items(Joi.string().max(100)).min(1).required(),
      allowedEventTypes: Joi.array().items(allowedEventTypeSchema).min(1).required(),
      manufacturer: commonSchemas.mongoId.required(),
      contactInfo: contactInfoSchema.optional(),
      environmentalConditions: environmentalConditionsSchema.optional()
    })
  ).min(1).max(100).required(),
  batchOptions: Joi.object({
    validateCoordinates: Joi.boolean().default(true),
    checkDuplicates: Joi.boolean().default(true)
  }).optional()
});

/**
 * Location settings validation schema
 */
export const locationSettingsSchema = Joi.object({
  validation: Joi.object({
    requireCoordinates: Joi.boolean().default(true),
    validateAddress: Joi.boolean().default(true),
    checkDuplicates: Joi.boolean().default(true),
    maxLocationsPerManufacturer: Joi.number().min(1).max(1000).default(100)
  }).required(),
  capabilities: Joi.object({
    predefinedCapabilities: Joi.array().items(Joi.string().max(100)).required(),
    allowCustomCapabilities: Joi.boolean().default(true),
    maxCapabilitiesPerLocation: Joi.number().min(1).max(50).default(20)
  }).required(),
  environmental: Joi.object({
    trackEnvironmentalConditions: Joi.boolean().default(true),
    requiredConditions: Joi.array().items(Joi.string().max(100)).optional(),
    temperatureUnit: Joi.string().valid('celsius', 'fahrenheit').default('celsius')
  }).required(),
  analytics: Joi.object({
    trackEventCount: Joi.boolean().default(true),
    trackLastEvent: Joi.boolean().default(true),
    retentionDays: Joi.number().min(30).max(3650).default(365)
  }).required()
});

/**
 * Export all location validation schemas
 */
export const locationValidationSchemas = {
  locationType: locationTypeSchema,
  allowedEventType: allowedEventTypeSchema,
  coordinates: coordinatesSchema,
  contactInfo: contactInfoSchema,
  environmentalConditions: environmentalConditionsSchema,
  createLocationRequest: createLocationRequestSchema,
  updateLocationRequest: updateLocationRequestSchema,
  locationQuery: locationQuerySchema,
  locationDistanceSearchRequest: locationDistanceSearchRequestSchema,
  batchCreateLocationRequest: batchCreateLocationRequestSchema,
  locationSettings: locationSettingsSchema
};
