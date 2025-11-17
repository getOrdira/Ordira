import { Media } from '../../../models/media/media.model';
import { queryOptimizationService } from '../../infrastructure/database/features/queryOptimization.service';
import { MediaLeanDocument, MediaListOptions, MediaListResult, MediaSearchResult } from '../utils/types';
import { MediaError } from '../utils/errors';
import { mediaCacheService } from '../utils/cache';
import { CacheKeys, isValidObjectId, validateString } from '../utils/helpers';
import { logger } from '../../../utils/logger';

/**
 * Media data service for CRUD operations and queries
 */
export class MediaDataService {
  /**
   * Get media by ID with optional caching
   */
  async getMediaById(
    mediaId: string,
    uploaderId?: string,
    useCache: boolean = true
  ): Promise<MediaLeanDocument | null> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const validation = validateString(mediaId, 'Media ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_MEDIA_ID');
      }

      if (!isValidObjectId(mediaId)) {
        throw new MediaError('Invalid media ID format', 400, 'INVALID_MEDIA_ID');
      }

      // Try cache first
      if (useCache) {
        const cacheKey = CacheKeys.media(mediaId, uploaderId);
        const cached = await mediaCacheService.get<MediaLeanDocument>(cacheKey);
        if (cached) {
          logger.info('Media served from cache', { mediaId, uploaderId });
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
        const cacheKey = CacheKeys.media(mediaId, uploaderId);
        await mediaCacheService.set(cacheKey, media);
      }

      const processingTime = Date.now() - startTime;
      logger.info('Media lookup completed', {
        mediaId,
        uploaderId,
        found: !!media,
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
   * List media by user with pagination and filters
   */
  async listMediaByUser(
    uploaderId: string,
    options: MediaListOptions = {}
  ): Promise<MediaListResult> {
    const startTime = Date.now();

    try {
      // Validate uploader ID
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first
      const cacheKey = CacheKeys.mediaList(uploaderId, options);
      const cached = await mediaCacheService.get<MediaListResult>(cacheKey);
      if (cached) {
        logger.info('Media list served from cache', {
          uploaderId,
          resultsCount: cached.media?.length || 0
        });
        return cached;
      }

      // Use optimized media lookup
      const params = {
        businessId: uploaderId,
        manufacturerId: uploaderId,
        category: options.category,
        limit: options.limit || 50,
        offset: options.offset || ((options.page || 1) - 1) * (options.limit || 50)
      };

      const result = await queryOptimizationService.optimizedMediaLookup(params, Media);

      // Apply additional filters
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

      const response: MediaListResult = {
        media: paginatedMedia,
        total,
        page,
        totalPages
      };

      // Cache the result
      await mediaCacheService.setShortTerm(cacheKey, response);

      const processingTime = Date.now() - startTime;
      logger.info('Media list generated', {
        uploaderId,
        resultsCount: paginatedMedia.length,
        totalCount: total,
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
   * Get media by category
   */
  async getMediaByCategory(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<MediaLeanDocument[]> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const uploaderValidation = validateString(uploaderId, 'Uploader ID');
      if (!uploaderValidation.valid) {
        throw new MediaError(uploaderValidation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      const categoryValidation = validateString(category, 'Category');
      if (!categoryValidation.valid) {
        throw new MediaError(categoryValidation.error!, 400, 'MISSING_CATEGORY');
      }

      // Try cache first
      const cacheKey = CacheKeys.mediaCategory(uploaderId, category);
      const cached = await mediaCacheService.get<MediaLeanDocument[]>(cacheKey);
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
      await mediaCacheService.set(cacheKey, media);

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
   * Get recent media
   */
  async getRecentMedia(uploaderId: string, limit: number = 10): Promise<MediaLeanDocument[]> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first
      const cacheKey = CacheKeys.recentMedia(uploaderId, limit);
      const cached = await mediaCacheService.get<MediaLeanDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const media = await Media.find({ uploadedBy: uploaderId })
        .select('url s3Key filename originalName mimeType size type category createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Cache the result
      await mediaCacheService.setShortTerm(cacheKey, media);

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
}

export const mediaDataService = new MediaDataService();


