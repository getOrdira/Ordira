/**
 * Optimized Media Service
 * - Enhanced caching for frequently accessed media
 * - Query optimization service for complex media searches
 * - Analytics caching for storage statistics
 * - Performance monitoring and logging
 * - Batch operations optimization
 */

import path from 'path';
import { logger } from '../../utils/logger';
import { createReadStream } from 'fs';
import { Media, IMedia } from '../../models/media.model';
import { S3Service } from '../external/s3.service';
import { queryOptimizationService } from '../external/query-optimization.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';

// Re-export interfaces from original service
export interface MediaUploadOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  resourceId?: string;
  isPublic?: boolean;
  compress?: boolean;
}

export interface MediaListOptions {
  page?: number;
  limit?: number;
  offset?: number;
  type?: 'image' | 'video' | 'gif' | 'document';
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  storageUsed: string;
  averageFileSize?: string;
  largestFile?: {
    filename: string;
    size: string;
    uploadDate: Date;
  };
}

export interface CategoryStats {
  category: string;
  totalFiles: number;
  totalSize: string;
  averageFileSize: string;
  mostRecentUpload?: Date;
  fileTypes: Record<string, number>;
}

export interface BatchUploadResult {
  successful: Array<{
    id: string;
    filename: string;
    originalName: string;
    url: string;
    size: number;
    s3Key?: string;
  }>;
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

export interface BatchUploadSuccess {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  s3Key?: string;
}

export interface BatchUploadFailure {
  filename: string;
  error: string;
}

export interface DownloadResult {
  mimeType: string;
  filename: string;
  fileSize: number;
  stream: NodeJS.ReadableStream;
  signedUrl?: string;
}

export interface MediaLeanDocument {
  _id: any;
  url: string;
  s3Key?: string;
  s3Bucket?: string;
  s3ETag?: string;
  type: 'image' | 'video' | 'gif' | 'document';
  uploadedBy: any;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  resourceId?: string;
  downloadCount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom error class for media operations
 */
class MediaError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'MediaError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Optimized media service with caching and query optimization
 */
export class MediaService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour for stats
  private readonly SHORT_CACHE_TTL = 60; // 1 minute for search results

  /**
   * Save media with optimized S3 upload and caching
   */
  async saveMedia(
    file: Express.Multer.File | undefined,
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<IMedia> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!file) {
        throw new MediaError('No file provided', 400, 'MISSING_FILE');
      }

      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Use existing validation logic
      const validation = this.validateFileUpload(file, options);
      if (!validation.valid) {
        throw new MediaError(validation.error || 'File validation failed', 400, 'VALIDATION_ERROR');
      }

      // Generate secure filename and S3 key
      const secureFilename = S3Service.generateSecureFilename(file.originalname);
      const s3Key = S3Service.buildS3Key(uploaderId, options.resourceId, secureFilename);

      // Upload to S3
      let s3Result;
      try {
        s3Result = await S3Service.uploadFile(file.buffer, {
          businessId: uploaderId,
          resourceId: options.resourceId,
          filename: secureFilename,
          mimeType: file.mimetype,
          isPublic: options.isPublic || false,
          metadata: {
            originalName: file.originalname,
            category: options.category || 'product',
            uploadedBy: uploaderId,
            ...(options.description && { description: options.description }),
            ...(options.tags && { tags: options.tags.join(',') })
          }
        });
      } catch (s3Error) {
        throw new MediaError(`S3 upload failed: ${s3Error.message}`, 500, 'S3_UPLOAD_ERROR');
      }

      // Determine type from MIME
      const type = this.determineMediaType(file.mimetype);

      const media = new Media({
        url: s3Result.url,
        s3Key: s3Result.key,
        s3Bucket: s3Result.bucket,
        s3ETag: s3Result.etag,
        type,
        uploadedBy: uploaderId,
        filename: secureFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: options.category || 'product',
        description: options.description,
        tags: options.tags || [],
        isPublic: options.isPublic || false,
        resourceId: options.resourceId,
        downloadCount: 0,
        metadata: {
          uploadedAt: new Date(),
          fileExtension: path.extname(file.originalname),
          s3Location: s3Result.location,
          storageProvider: 's3'
        }
      });

      const savedMedia = await media.save();

      // Invalidate relevant caches
      await this.invalidateMediaCaches(uploaderId, options.category);

      const processingTime = Date.now() - startTime;
      logger.info('Media uploaded successfully', {
        mediaId: savedMedia._id,
        filename: secureFilename,
        size: file.size,
        type,
        uploaderId,
        processingTime
      });

      return savedMedia;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to save media', {
        error: error.message,
        uploaderId,
        filename: file?.originalname,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to save media: ${error.message}`, 500, 'SAVE_ERROR');
    }
  }

  /**
   * Get media by ID with caching
   */
  async getMediaById(mediaId: string, uploaderId?: string, useCache: boolean = true): Promise<MediaLeanDocument | null> {
    const startTime = Date.now();

    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400, 'MISSING_MEDIA_ID');
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
        throw new MediaError('Invalid media ID format', 400, 'INVALID_MEDIA_ID');
      }

      // Try cache first
      if (useCache) {
        const cacheKey = `media:${mediaId}:${uploaderId || 'public'}`;
        const cached = await enhancedCacheService.getCachedUser(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build query
      const filter: any = { _id: mediaId };
      if (uploaderId) {
        filter.uploadedBy = uploaderId;
      }

      const media = await Media.findOne(filter).lean();

      // Cache the result if found
      if (media && useCache) {
        const cacheKey = `media:${mediaId}:${uploaderId || 'public'}`;
        await enhancedCacheService.cacheUser(cacheKey, media, {
          ttl: this.CACHE_TTL
        });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Media lookup completed', {
        mediaId,
        uploaderId,
        found: !!media,
        cached: false,
        processingTime
      });

      return media;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get media by ID', {
        mediaId,
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get media: ${error.message}`, 500, 'GET_ERROR');
    }
  }

  /**
   * List media with optimized queries and caching
   */
  async listMediaByUser(
    uploaderId: string,
    options: MediaListOptions = {}
  ): Promise<{
    media: MediaLeanDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first for common queries
      const cacheKey = `media_list:${uploaderId}:${JSON.stringify(options)}`;
      const cached = await enhancedCacheService.getCachedUser(cacheKey);
      if (cached) {
        logger.info('Media list served from cache', {
          uploaderId,
          resultsCount: cached.media?.length || 0,
          totalCount: cached.total
        });
        return cached;
      }

      // Use optimized media lookup
      const params = {
        businessId: uploaderId,
        manufacturerId: uploaderId, // Media can be uploaded by both
        category: options.category,
        limit: options.limit || 50,
        offset: options.offset || ((options.page || 1) - 1) * (options.limit || 50)
      };

      const result = await queryOptimizationService.optimizedMediaLookup(params, Media);

      // Apply additional filters that aren't in the optimization service
      let filteredMedia = result.media;

      if (options.type) {
        filteredMedia = filteredMedia.filter(m => m.type === options.type);
      }

      if (options.isPublic !== undefined) {
        filteredMedia = filteredMedia.filter(m => m.isPublic === options.isPublic);
      }

      if (options.tags && options.tags.length > 0) {
        filteredMedia = filteredMedia.filter(m =>
          options.tags!.some(tag => m.tags?.includes(tag))
        );
      }

      if (options.search) {
        const searchRegex = new RegExp(options.search, 'i');
        filteredMedia = filteredMedia.filter(m =>
          searchRegex.test(m.originalName) ||
          searchRegex.test(m.filename) ||
          searchRegex.test(m.description || '') ||
          m.tags?.some(tag => searchRegex.test(tag))
        );
      }

      // Apply sorting
      if (options.sortBy) {
        const sortMultiplier = options.sortOrder === 'asc' ? 1 : -1;
        filteredMedia.sort((a, b) => {
          const aVal = (a as any)[options.sortBy!];
          const bVal = (b as any)[options.sortBy!];
          return aVal > bVal ? sortMultiplier : aVal < bVal ? -sortMultiplier : 0;
        });
      }

      const page = options.page || 1;
      const limit = options.limit || 50;
      const total = filteredMedia.length;
      const totalPages = Math.ceil(total / limit);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedMedia = filteredMedia.slice(startIndex, startIndex + limit);

      const response = {
        media: paginatedMedia,
        total,
        page,
        totalPages
      };

      // Cache the result
      await enhancedCacheService.cacheUser(cacheKey, response, {
        ttl: this.SHORT_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Media list generated', {
        uploaderId,
        resultsCount: paginatedMedia.length,
        totalCount: total,
        queryTime: result.queryTime,
        processingTime
      });

      return response;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to list media by user', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to list media: ${error.message}`, 500, 'LIST_ERROR');
    }
  }

  /**
   * Search media with optimization and caching
   */
  async searchMedia(
    uploaderId: string,
    query: string,
    options: MediaListOptions = {}
  ): Promise<{
    media: MediaLeanDocument[];
    total: number;
  }> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!query?.trim()) {
        throw new MediaError('Search query is required', 400, 'MISSING_QUERY');
      }
      if (query.length < 2) {
        throw new MediaError('Search query must be at least 2 characters', 400, 'QUERY_TOO_SHORT');
      }

      // Try cache first
      const cacheKey = `media_search:${uploaderId}:${query}:${JSON.stringify(options)}`;
      const cached = await enhancedCacheService.getCachedUser(cacheKey);
      if (cached) {
        logger.info('Media search served from cache', {
          uploaderId,
          query,
          resultsCount: cached.media?.length || 0
        });
        return cached;
      }

      // Build optimized search filter
      const filter: any = {
        uploadedBy: uploaderId,
        $text: { $search: query }  // Use text index for better performance
      };

      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;
      if (options.isPublic !== undefined) filter.isPublic = options.isPublic;

      // Execute optimized query with text search scoring
      const [media, total] = await Promise.all([
        Media.find(filter)
          .select('url s3Key filename originalName mimeType size type category tags isPublic createdAt uploadedBy')
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .limit(50)
          .lean(),
        Media.countDocuments(filter)
      ]);

      const result = { media, total };

      // Cache the result
      await enhancedCacheService.cacheUser(cacheKey, result, {
        ttl: this.SHORT_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Media search completed', {
        uploaderId,
        query,
        resultsCount: media.length,
        totalCount: total,
        processingTime
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to search media', {
        uploaderId,
        query,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to search media: ${error.message}`, 500, 'SEARCH_ERROR');
    }
  }

  /**
   * Get storage statistics with caching
   */
  async getStorageStatistics(uploaderId: string): Promise<MediaStats> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first
      const cacheKey = `storage_stats:${uploaderId}`;
      const cached = await enhancedCacheService.getCachedAnalytics('media', { uploaderId });
      if (cached) {
        logger.info('Storage statistics served from cache', { uploaderId });
        return cached;
      }

      // Use optimized aggregation pipelines
      const [stats, typeStats, categoryStats, largestFileData] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' }
            }
          }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Media.findOne({ uploadedBy: uploaderId })
          .sort({ size: -1 })
          .select('filename size createdAt')
          .lean()
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;
      const averageSize = stats[0]?.averageSize || 0;

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat._id || 'unknown'] = stat.count;
      });

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat._id || 'unknown'] = stat.count;
      });

      const mediaStats: MediaStats = {
        totalFiles,
        totalSize,
        byType,
        byCategory,
        storageUsed: this.formatFileSize(totalSize),
        averageFileSize: this.formatFileSize(averageSize),
        largestFile: largestFileData ? {
          filename: largestFileData.filename,
          size: this.formatFileSize(largestFileData.size),
          uploadDate: largestFileData.createdAt
        } : undefined
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('media', { uploaderId }, mediaStats, {
        ttl: this.LONG_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Storage statistics generated', {
        uploaderId,
        totalFiles,
        totalSize,
        processingTime
      });

      return mediaStats;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get storage statistics', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get storage statistics: ${error.message}`, 500, 'STATS_ERROR');
    }
  }

  /**
   * Get media by category with caching
   */
  async getMediaByCategory(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<MediaLeanDocument[]> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!category?.trim()) {
        throw new MediaError('Category is required', 400, 'MISSING_CATEGORY');
      }

      // Try cache first
      const cacheKey = `media_category:${uploaderId}:${category}`;
      const cached = await enhancedCacheService.getCachedUser(cacheKey);
      if (cached) {
        logger.info('Media by category served from cache', {
          uploaderId,
          category,
          count: cached.length
        });
        return cached;
      }

      // Use optimized query
      const media = await Media.find({
        uploadedBy: uploaderId,
        category
      })
      .select('url s3Key filename originalName mimeType size type tags isPublic createdAt')
      .sort({ createdAt: -1 })
      .lean();

      // Cache the result
      await enhancedCacheService.cacheUser(cacheKey, media, {
        ttl: this.CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Media by category retrieved', {
        uploaderId,
        category,
        count: media.length,
        processingTime
      });

      return media;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get media by category', {
        uploaderId,
        category,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get media by category: ${error.message}`, 500, 'CATEGORY_ERROR');
    }
  }

  /**
   * Delete media with cache invalidation
   */
  async deleteMedia(mediaId: string, uploaderId: string): Promise<{
    fileSize: number;
    filename: string;
    deletedAt: Date;
    s3Key?: string;
  }> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      const media = await this.getMediaById(mediaId, uploaderId, false);
      if (!media) {
        throw new MediaError('Media not found or access denied', 404, 'MEDIA_NOT_FOUND');
      }

      const fileSize = media.size;
      const filename = media.filename;
      const s3Key = media.s3Key;

      // Delete from S3 if stored there
      if (s3Key) {
        try {
          await S3Service.deleteFile(s3Key);
        } catch (s3Error) {
          logger.warn(`Could not delete S3 file ${s3Key}:`, s3Error.message);
        }
      }

      // Delete database record
      const deletedMedia = await Media.findByIdAndDelete(mediaId);
      if (!deletedMedia) {
        throw new MediaError('Media not found or already deleted', 404, 'MEDIA_NOT_FOUND');
      }

      // Invalidate caches
      await this.invalidateMediaCaches(uploaderId, media.category);

      const processingTime = Date.now() - startTime;
      logger.info('Media deleted successfully', {
        mediaId,
        filename,
        uploaderId,
        processingTime
      });

      return {
        fileSize,
        filename,
        deletedAt: new Date(),
        s3Key
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to delete media', {
        mediaId,
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to delete media: ${error.message}`, 500, 'DELETE_ERROR');
    }
  }

  /**
   * Batch upload media with optimized processing
   */
  async saveMultipleMedia(
    files: Express.Multer.File[],
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const successful: BatchUploadSuccess[] = [];
    const failed: BatchUploadFailure[] = [];

    // Process files in parallel batches for better performance
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchPromises = batch.map(async (file): Promise<{ success: true; data: BatchUploadSuccess } | { success: false; data: BatchUploadFailure }> => {
        try {
          const media = await this.saveMedia(file, uploaderId, options);
          return {
            success: true,
            data: {
              id: media._id.toString(),
              filename: media.filename,
              originalName: media.originalName,
              url: media.url,
              size: media.size,
              s3Key: media.s3Key
            }
          };
        } catch (error: any) {
          return {
            success: false,
            data: {
              filename: file.originalname || file.filename || 'unknown',
              error: error.message
            }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        if (result.success) {
          successful.push(result.data as BatchUploadSuccess);
        } else {
          failed.push(result.data as BatchUploadFailure);
        }
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Batch media upload completed', {
      uploaderId,
      totalFiles: files.length,
      successful: successful.length,
      failed: failed.length,
      processingTime
    });

    return { successful, failed };
  }

  /**
   * Get recent media with caching
   */
  async getRecentMedia(uploaderId: string, limit: number = 10): Promise<MediaLeanDocument[]> {
    const startTime = Date.now();

    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first
      const cacheKey = `recent_media:${uploaderId}:${limit}`;
      const cached = await enhancedCacheService.getCachedUser(cacheKey);
      if (cached) {
        return cached;
      }

      const media = await Media.find({ uploadedBy: uploaderId })
        .select('url s3Key filename originalName mimeType size type category createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Cache the result
      await enhancedCacheService.cacheUser(cacheKey, media, {
        ttl: this.SHORT_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Recent media retrieved', {
        uploaderId,
        limit,
        count: media.length,
        processingTime
      });

      return media;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get recent media', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get recent media: ${error.message}`, 500, 'RECENT_ERROR');
    }
  }

  /**
   * Private helper methods
   */
  private async invalidateMediaCaches(uploaderId: string, category?: string): Promise<void> {
    const tags = [
      `media:${uploaderId}`,
      'media_list',
      'media_search',
      'storage_stats',
      'recent_media'
    ];

    if (category) {
      tags.push(`media_category:${uploaderId}:${category}`);
    }

    await enhancedCacheService.invalidateByTags(tags);
  }

  private determineMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'document' {
    if (!mimeType) return 'document';

    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  private formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Invalid size';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file upload constraints
   */
  validateFileUpload(
    file: Express.Multer.File,
    options: MediaUploadOptions = {}
  ): { valid: boolean; error?: string } {
    try {
      if (!file) {
        return { valid: false, error: 'No file provided' };
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        };
      }

      // Check file size
      if (options.maxFileSize && file.size > options.maxFileSize) {
        return {
          valid: false,
          error: `File size ${this.formatFileSize(file.size)} exceeds limit of ${this.formatFileSize(options.maxFileSize)}`
        };
      }

      // Check if file is empty
      if (file.size <= 0) {
        return { valid: false, error: 'File appears to be empty' };
      }

      // Check filename
      if (!file.filename && !file.originalname) {
        return { valid: false, error: 'File must have a valid filename' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `File validation error: ${error.message}` };
    }
  }
}

export const mediaService = new MediaService();