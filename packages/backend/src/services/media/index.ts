// Core Services
import {
  MediaDataService,
  mediaDataService
} from './core/mediaData.service';
import {
  StorageProviderService,
  storageProviderService
} from './core/storageProvider.service';
import { S3Service } from './core/s3.service';

// Feature Services
import {
  MediaUploadService,
  mediaUploadService
} from './features/upload.service';
import {
  MediaSearchService,
  mediaSearchService
} from './features/search.service';
import {
  MediaAnalyticsService,
  mediaAnalyticsService
} from './features/analytics.service';
import {
  MediaDeletionService,
  mediaDeletionService
} from './features/deletion.service';

// Validation Services
import {
  FileValidationService,
  fileValidationService
} from './validation/fileValidation.service';

// Utils
import {
  MediaCacheService,
  mediaCacheService
} from './utils/cache';
import { MediaError } from './utils/errors';
import * as mediaHelpers from './utils/helpers';

// Export core services
export {
  MediaDataService,
  mediaDataService,
  StorageProviderService,
  storageProviderService,
  S3Service
};

// Export feature services
export {
  MediaUploadService,
  mediaUploadService,
  MediaSearchService,
  mediaSearchService,
  MediaAnalyticsService,
  mediaAnalyticsService,
  MediaDeletionService,
  mediaDeletionService
};

// Export validation services
export {
  FileValidationService,
  fileValidationService
};

// Export utils
export {
  MediaCacheService,
  mediaCacheService,
  MediaError,
  mediaHelpers
};

// Export all types
export type {
  MediaUploadOptions,
  MediaListOptions,
  MediaStats,
  CategoryStats,
  BatchUploadResult,
  BatchUploadSuccess,
  BatchUploadFailure,
  DownloadResult,
  MediaLeanDocument,
  S3UploadResult,
  MediaListResult,
  MediaSearchResult,
  MediaDocument
} from './utils/types';

export type { ValidationResult } from './validation/fileValidation.service';

/**
 * Aggregated media services for convenient access
 */
export const mediaServices = {
  // Core
  data: mediaDataService,
  storage: storageProviderService,
  
  // Features
  upload: mediaUploadService,
  search: mediaSearchService,
  analytics: mediaAnalyticsService,
  deletion: mediaDeletionService,
  
  // Validation
  validation: fileValidationService,
  
  // Utils
  cache: mediaCacheService,
  helpers: mediaHelpers
};

/**
 * Convenience functions that delegate to appropriate services
 * These maintain backward compatibility with the legacy MediaService
 */
export class MediaService {
  // Upload operations
  async saveMedia(file: Express.Multer.File | undefined, uploaderId: string, options: any = {}) {
    return mediaUploadService.saveMedia(file, uploaderId, options);
  }

  async saveMultipleMedia(files: Express.Multer.File[], uploaderId: string, options: any = {}) {
    return mediaUploadService.saveMultipleMedia(files, uploaderId, options);
  }

  // Data operations
  async getMediaById(mediaId: string, uploaderId?: string, useCache: boolean = true) {
    return mediaDataService.getMediaById(mediaId, uploaderId, useCache);
  }

  async listMediaByUser(uploaderId: string, options: any = {}) {
    return mediaDataService.listMediaByUser(uploaderId, options);
  }

  async getMediaByCategory(uploaderId: string, category: any) {
    return mediaDataService.getMediaByCategory(uploaderId, category);
  }

  async getRecentMedia(uploaderId: string, limit: number = 10) {
    return mediaDataService.getRecentMedia(uploaderId, limit);
  }

  // Search operations
  async searchMedia(uploaderId: string, query: string, options: any = {}) {
    return mediaSearchService.searchMedia(uploaderId, query, options);
  }

  // Analytics operations
  async getStorageStatistics(uploaderId: string) {
    return mediaAnalyticsService.getStorageStatistics(uploaderId);
  }

  async getCategoryStatistics(uploaderId: string, category: any) {
    return mediaAnalyticsService.getCategoryStatistics(uploaderId, category);
  }

  async getUsageTrends(uploaderId: string, days: number = 30) {
    return mediaAnalyticsService.getUsageTrends(uploaderId, days);
  }

  // Deletion operations
  async deleteMedia(mediaId: string, uploaderId: string) {
    return mediaDeletionService.deleteMedia(mediaId, uploaderId);
  }

  async deleteMultipleMedia(mediaIds: string[], uploaderId: string) {
    return mediaDeletionService.deleteMultipleMedia(mediaIds, uploaderId);
  }

  // Validation
  validateFileUpload(file: Express.Multer.File, options: any = {}) {
    return fileValidationService.validateFileUpload(file, options);
  }
}

// Export singleton instance for backward compatibility
export const mediaService = new MediaService();

