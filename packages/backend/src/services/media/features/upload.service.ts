import path from 'path';
import { Media, IMedia } from '../../../models/media.model';
import { storageProviderService } from '../core/storageProvider.service';
import { fileValidationService } from '../validation/fileValidation.service';
import { mediaCacheService } from '../utils/cache';
import { MediaUploadOptions, BatchUploadResult, BatchUploadSuccess, BatchUploadFailure } from '../utils/types';
import { MediaError } from '../utils/errors';
import { determineMediaType } from '../utils/helpers';
import { logger } from '../../../utils/logger';

/**
 * Media upload service for single and batch uploads
 */
export class MediaUploadService {
  /**
   * Save single media file
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

      // Validate file upload
      const validation = fileValidationService.validateFileUpload(file, options);
      if (!validation.valid) {
        throw new MediaError(validation.error || 'File validation failed', 400, 'VALIDATION_ERROR');
      }

      // Upload to storage provider
      const s3Result = await storageProviderService.uploadFile(file, uploaderId, options);

      // Determine type from MIME
      const type = determineMediaType(file.mimetype);

      // Create database record
      const media = new Media({
        url: s3Result.url,
        s3Key: s3Result.key,
        s3Bucket: s3Result.bucket,
        s3ETag: s3Result.etag,
        type,
        uploadedBy: uploaderId,
        filename: storageProviderService.generateSecureFilename(file.originalname),
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
      await mediaCacheService.invalidateMediaCaches(uploaderId, options.category);

      const processingTime = Date.now() - startTime;
      logger.info('Media uploaded successfully', {
        mediaId: savedMedia._id,
        filename: savedMedia.filename,
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
   * Batch upload media files with parallel processing
   */
  async saveMultipleMedia(
    files: Express.Multer.File[],
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const successful: BatchUploadSuccess[] = [];
    const failed: BatchUploadFailure[] = [];

    try {
      // Validate batch
      const validation = fileValidationService.validateBatchUpload(files);
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'BATCH_VALIDATION_ERROR');
      }

      // Process files in parallel batches for better performance
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async (file): Promise<{
          success: true;
          data: BatchUploadSuccess
        } | {
          success: false;
          data: BatchUploadFailure
        }> => {
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

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Batch upload failed', {
        uploaderId,
        totalFiles: files.length,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Batch upload failed: ${error.message}`, 500, 'BATCH_UPLOAD_ERROR');
    }
  }
}

export const mediaUploadService = new MediaUploadService();

