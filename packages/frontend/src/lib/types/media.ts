// src/lib/types/media.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Media type types
 * Based on backend IMedia model type field
 */
export type MediaType = 'image' | 'video' | 'gif' | 'document';

/**
 * Media category types
 * Based on backend IMedia model category field
 */
export type MediaCategory = 'profile' | 'product' | 'banner' | 'certificate' | 'document';

/**
 * Media interface
 * Based on backend IMedia model
 */
export interface Media {
  _id: string;
  url: string;
  type: MediaType;
  uploadedBy: string; // Business ID reference
  createdAt: Date;
  updatedAt: Date;
  
  // File metadata
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  
  // S3 Storage fields
  s3Key?: string;
  s3Bucket?: string;
  s3ETag?: string;
  s3Region?: string;
  
  // Organization
  category: MediaCategory;
  resourceId?: string;
  
  // Additional metadata and tags
  metadata?: Record<string, any>;
  tags?: string[];
  description?: string;
  
  // File status and flags
  isActive?: boolean;
  isProcessed?: boolean;
  processingError?: string;
  
  // Access control
  isPublic?: boolean;
  accessPermissions?: string[];
  
  // File versioning
  version?: number;
  parentFileId?: string;
  
  // Statistics
  downloadCount?: number;
  lastAccessedAt?: Date;
  lastDownloadedAt?: Date;
}

/**
 * Media upload request
 * For uploading new media files
 */
export interface MediaUploadRequest {
  file: File;
  category: MediaCategory;
  resourceId?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  accessPermissions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Media update request
 * For updating existing media files
 */
export interface MediaUpdateRequest {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  accessPermissions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Media list response
 * For paginated media lists
 */
export interface MediaListResponse extends PaginatedResponse<Media> {
  media: Media[];
  analytics: {
    totalMedia: number;
    totalSize: number;
    byType: Array<{
      type: MediaType;
      count: number;
      size: number;
    }>;
    byCategory: Array<{
      category: MediaCategory;
      count: number;
      size: number;
    }>;
  };
}

/**
 * Media detail response
 * For detailed media information
 */
export interface MediaDetailResponse {
  media: Media;
  uploader: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  analytics: {
    downloadCount: number;
    lastAccessedAt?: Date;
    lastDownloadedAt?: Date;
    accessFrequency: number;
  };
  versions: Media[];
  relatedMedia: Media[];
}

/**
 * Media search response
 * For media search results
 */
export interface MediaSearchResponse extends PaginatedResponse<Media> {
  media: Media[];
  filters: {
    types: MediaType[];
    categories: MediaCategory[];
    sizeRange: {
      min: number;
      max: number;
    };
    dateRange: {
      from: Date;
      to: Date;
    };
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Media analytics response
 * For media analytics and reporting
 */
export interface MediaAnalyticsResponse {
  overview: {
    totalMedia: number;
    totalSize: number;
    totalDownloads: number;
    averageFileSize: number;
    storageUsed: number;
  };
  typeDistribution: Array<{
    type: MediaType;
    count: number;
    percentage: number;
    size: number;
  }>;
  categoryDistribution: Array<{
    category: MediaCategory;
    count: number;
    percentage: number;
    size: number;
  }>;
  monthlyStats: Array<{
    month: string;
    uploads: number;
    downloads: number;
    size: number;
  }>;
  topMedia: Array<{
    media: Media;
    metrics: {
      downloads: number;
      size: number;
      lastAccessed?: Date;
    };
  }>;
  storageBreakdown: Array<{
    category: MediaCategory;
    size: number;
    percentage: number;
  }>;
}

/**
 * Media processing response
 * For media processing status
 */
export interface MediaProcessingResponse {
  mediaId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
  processedUrl?: string;
  thumbnails?: Array<{
    size: string;
    url: string;
  }>;
}

/**
 * Media batch upload response
 * For batch media uploads
 */
export interface MediaBatchUploadResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    filename: string;
    error: string;
  }>;
  results: Array<{
    filename: string;
    mediaId: string;
    status: 'success' | 'failed';
    message?: string;
  }>;
}

/**
 * Media settings interface
 * For media management settings
 */
export interface MediaSettings {
  upload: {
    maxFileSize: number;
    allowedTypes: MediaType[];
    allowedMimeTypes: string[];
    maxFilesPerUpload: number;
    autoProcess: boolean;
  };
  storage: {
    provider: 'local' | 's3' | 'cloudinary';
    s3Bucket?: string;
    s3Region?: string;
    cloudinaryCloud?: string;
  };
  processing: {
    generateThumbnails: boolean;
    thumbnailSizes: string[];
    compressImages: boolean;
    imageQuality: number;
    videoCompression: boolean;
  };
  access: {
    defaultPublic: boolean;
    requireAuth: boolean;
    allowedDomains: string[];
  };
}

/**
 * Media template interface
 * For media templates
 */
export interface MediaTemplate {
  _id: string;
  name: string;
  description?: string;
  category: MediaCategory;
  type: MediaType;
  templateUrl: string;
  thumbnailUrl?: string;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Media type validation schema
 */
export const mediaTypeSchema = Joi.string()
  .valid('image', 'video', 'gif', 'document')
  .required()
  .messages({
    'any.only': 'Media type must be one of: image, video, gif, document'
  });

/**
 * Media category validation schema
 */
export const mediaCategorySchema = Joi.string()
  .valid('profile', 'product', 'banner', 'certificate', 'document')
  .required()
  .messages({
    'any.only': 'Media category must be one of: profile, product, banner, certificate, document'
  });

/**
 * Media upload request validation schema
 */
export const mediaUploadRequestSchema = Joi.object({
  file: Joi.object().required(),
  category: mediaCategorySchema.required(),
  resourceId: Joi.string().optional(),
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isPublic: Joi.boolean().default(false),
  accessPermissions: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional()
});

/**
 * Media update request validation schema
 */
export const mediaUpdateRequestSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  isPublic: Joi.boolean().optional(),
  accessPermissions: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional()
});

/**
 * Media query validation schema
 */
export const mediaQuerySchema = Joi.object({
  type: mediaTypeSchema.optional(),
  category: mediaCategorySchema.optional(),
  uploadedBy: commonSchemas.mongoId.optional(),
  resourceId: Joi.string().optional(),
  isPublic: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  isProcessed: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  minSize: Joi.number().min(0).optional(),
  maxSize: Joi.number().min(0).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'filename', 'size', 'downloadCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Media settings validation schema
 */
export const mediaSettingsSchema = Joi.object({
  upload: Joi.object({
    maxFileSize: Joi.number().min(1024).max(100 * 1024 * 1024).required(), // 1KB to 100MB
    allowedTypes: Joi.array().items(mediaTypeSchema).required(),
    allowedMimeTypes: Joi.array().items(Joi.string()).required(),
    maxFilesPerUpload: Joi.number().min(1).max(50).default(10),
    autoProcess: Joi.boolean().default(true)
  }).required(),
  storage: Joi.object({
    provider: Joi.string().valid('local', 's3', 'cloudinary').required(),
    s3Bucket: Joi.string().optional(),
    s3Region: Joi.string().optional(),
    cloudinaryCloud: Joi.string().optional()
  }).required(),
  processing: Joi.object({
    generateThumbnails: Joi.boolean().default(true),
    thumbnailSizes: Joi.array().items(Joi.string()).default(['150x150', '300x300', '600x600']),
    compressImages: Joi.boolean().default(true),
    imageQuality: Joi.number().min(1).max(100).default(80),
    videoCompression: Joi.boolean().default(false)
  }).required(),
  access: Joi.object({
    defaultPublic: Joi.boolean().default(false),
    requireAuth: Joi.boolean().default(true),
    allowedDomains: Joi.array().items(Joi.string().hostname()).optional()
  }).required()
});

/**
 * Media template validation schema
 */
export const mediaTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: mediaCategorySchema.required(),
  type: mediaTypeSchema.required(),
  templateUrl: commonSchemas.url.required(),
  thumbnailUrl: commonSchemas.optionalUrl,
  metadata: Joi.object().optional(),
  isActive: Joi.boolean().default(true)
});

/**
 * Export all media validation schemas
 */
export const mediaValidationSchemas = {
  mediaType: mediaTypeSchema,
  mediaCategory: mediaCategorySchema,
  mediaUploadRequest: mediaUploadRequestSchema,
  mediaUpdateRequest: mediaUpdateRequestSchema,
  mediaQuery: mediaQuerySchema,
  mediaSettings: mediaSettingsSchema,
  mediaTemplate: mediaTemplateSchema
};
