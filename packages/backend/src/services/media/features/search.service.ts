import { Media } from '../../../models/media/media.model';
import { mediaCacheService } from '../utils/cache';
import { MediaListOptions, MediaSearchResult } from '../utils/types';
import { MediaError } from '../utils/errors';
import { CacheKeys, validateString } from '../utils/helpers';
import { logger } from '../../../utils/logger';

/**
 * Media search service for text search and advanced filtering
 */
export class MediaSearchService {
  /**
   * Search media with text search and filters
   */
  async searchMedia(
    uploaderId: string,
    query: string,
    options: MediaListOptions = {}
  ): Promise<MediaSearchResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const uploaderValidation = validateString(uploaderId, 'Uploader ID');
      if (!uploaderValidation.valid) {
        throw new MediaError(uploaderValidation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      const queryValidation = validateString(query, 'Search query');
      if (!queryValidation.valid) {
        throw new MediaError(queryValidation.error!, 400, 'MISSING_QUERY');
      }

      if (query.length < 2) {
        throw new MediaError('Search query must be at least 2 characters', 400, 'QUERY_TOO_SHORT');
      }

      // Try cache first
      const cacheKey = CacheKeys.mediaSearch(uploaderId, query, options);
      const cached = await mediaCacheService.get<MediaSearchResult>(cacheKey);
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

      const result: MediaSearchResult = { media, total };

      // Cache the result
      await mediaCacheService.setShortTerm(cacheKey, result);

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
   * Search by tags
   */
  async searchByTags(
    uploaderId: string,
    tags: string[],
    options: MediaListOptions = {}
  ): Promise<MediaSearchResult> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      if (!tags || tags.length === 0) {
        throw new MediaError('At least one tag is required', 400, 'MISSING_TAGS');
      }

      const filter: any = {
        uploadedBy: uploaderId,
        tags: { $in: tags }
      };

      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;

      const [media, total] = await Promise.all([
        Media.find(filter)
          .select('url s3Key filename originalName mimeType size type category tags isPublic createdAt')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Media.countDocuments(filter)
      ]);

      const result: MediaSearchResult = { media, total };

      const processingTime = Date.now() - startTime;
      logger.info('Tag search completed', {
        uploaderId,
        tags,
        resultsCount: media.length,
        processingTime
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to search by tags', {
        uploaderId,
        tags,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to search by tags: ${error.message}`, 500, 'TAG_SEARCH_ERROR');
    }
  }
}

export const mediaSearchService = new MediaSearchService();


