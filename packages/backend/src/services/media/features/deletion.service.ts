import { Media } from '../../../models/deprecated/media.model';
import { mediaDataService } from '../core/mediaData.service';
import { storageProviderService } from '../core/storageProvider.service';
import { mediaCacheService } from '../utils/cache';
import { MediaError } from '../utils/errors';
import { validateString } from '../utils/helpers';
import { logger } from '../../../utils/logger';

/**
 * Media deletion service with cleanup and cache invalidation
 */
export class MediaDeletionService {
  /**
   * Delete a single media file
   */
  async deleteMedia(
    mediaId: string,
    uploaderId: string
  ): Promise<{
    fileSize: number;
    filename: string;
    deletedAt: Date;
    s3Key?: string;
  }> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // Get media first
      const media = await mediaDataService.getMediaById(mediaId, uploaderId, false);
      if (!media) {
        throw new MediaError('Media not found or access denied', 404, 'MEDIA_NOT_FOUND');
      }

      const fileSize = media.size;
      const filename = media.filename;
      const s3Key = media.s3Key;
      const category = media.category;

      // Delete from storage if stored there
      if (s3Key) {
        await storageProviderService.deleteFile(s3Key);
      }

      // Delete database record
      const deletedMedia = await Media.findByIdAndDelete(mediaId);
      if (!deletedMedia) {
        throw new MediaError('Media not found or already deleted', 404, 'MEDIA_NOT_FOUND');
      }

      // Invalidate caches
      await mediaCacheService.invalidateMediaCaches(uploaderId, category);

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
   * Delete multiple media files
   */
  async deleteMultipleMedia(
    mediaIds: string[],
    uploaderId: string
  ): Promise<{
    deleted: number;
    failed: number;
    totalSize: number;
    errors: string[];
  }> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      if (!mediaIds || mediaIds.length === 0) {
        throw new MediaError('Media IDs are required', 400, 'MISSING_MEDIA_IDS');
      }

      let deleted = 0;
      let failed = 0;
      let totalSize = 0;
      const errors: string[] = [];

      // Process deletions in parallel batches
      const batchSize = 10;
      for (let i = 0; i < mediaIds.length; i += batchSize) {
        const batch = mediaIds.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(id => this.deleteMedia(id, uploaderId))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            deleted++;
            totalSize += result.value.fileSize;
          } else {
            failed++;
            errors.push(`Failed to delete ${batch[index]}: ${result.reason?.message || 'Unknown error'}`);
          }
        });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Batch deletion completed', {
        uploaderId,
        total: mediaIds.length,
        deleted,
        failed,
        totalSize,
        processingTime
      });

      return {
        deleted,
        failed,
        totalSize,
        errors
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed batch deletion', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed batch deletion: ${error.message}`, 500, 'BATCH_DELETE_ERROR');
    }
  }

  /**
   * Delete all media for a category
   */
  async deleteByCategory(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<{
    deleted: number;
    totalSize: number;
  }> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // Get all media in category
      const mediaList = await Media.find({
        uploadedBy: uploaderId,
        category
      }).select('_id size s3Key').lean();

      if (mediaList.length === 0) {
        return { deleted: 0, totalSize: 0 };
      }

      // Delete from storage provider
      await Promise.allSettled(
        mediaList.map(media => 
          media.s3Key ? storageProviderService.deleteFile(media.s3Key) : Promise.resolve()
        )
      );

      // Delete from database
      const result = await Media.deleteMany({
        uploadedBy: uploaderId,
        category
      });

      const totalSize = mediaList.reduce((sum, media) => sum + media.size, 0);

      // Invalidate caches
      await mediaCacheService.invalidateMediaCaches(uploaderId, category);

      const processingTime = Date.now() - startTime;
      logger.info('Category deletion completed', {
        uploaderId,
        category,
        deleted: result.deletedCount,
        totalSize,
        processingTime
      });

      return {
        deleted: result.deletedCount || 0,
        totalSize
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed category deletion', {
        uploaderId,
        category,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed category deletion: ${error.message}`, 500, 'CATEGORY_DELETE_ERROR');
    }
  }

  /**
   * Clean up orphaned media (files without database records)
   */
  async cleanupOrphanedMedia(uploaderId: string): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // This is a placeholder for a more complex cleanup operation
      // In practice, you'd need to list S3 files and compare with database
      logger.info('Orphaned media cleanup initiated', { uploaderId });

      const processingTime = Date.now() - startTime;
      logger.info('Orphaned media cleanup completed', {
        uploaderId,
        processingTime
      });

      return {
        cleaned: 0,
        errors: []
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed orphaned media cleanup', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed orphaned media cleanup: ${error.message}`, 500, 'CLEANUP_ERROR');
    }
  }
}

export const mediaDeletionService = new MediaDeletionService();

