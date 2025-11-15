import path from 'path';
import { S3Service } from './s3.service';
import { S3UploadResult, MediaUploadOptions } from '../utils/types';
import { MediaError } from '../utils/errors';
import { logger } from '../../../utils/logger';

/**
 * Storage provider abstraction layer for media files
 * Currently implements S3, can be extended for other providers
 */
export class StorageProviderService {
  /**
   * Upload file to storage provider
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<S3UploadResult> {
    const startTime = Date.now();

    try {
      // Generate secure filename and S3 key
      const secureFilename = S3Service.generateSecureFilename(file.originalname);
      const s3Key = S3Service.buildS3Key(uploaderId, options.resourceId, secureFilename);

      // Upload to S3
      const s3Result = await S3Service.uploadFile(file.buffer, {
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

      const processingTime = Date.now() - startTime;
      logger.info('File uploaded to storage', {
        filename: secureFilename,
        size: file.size,
        uploaderId,
        s3Key,
        processingTime
      });

      return s3Result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Storage upload failed', {
        error: error.message,
        uploaderId,
        filename: file.originalname,
        processingTime
      });
      throw new MediaError(`Storage upload failed: ${error.message}`, 500, 'STORAGE_UPLOAD_ERROR');
    }
  }

  /**
   * Delete file from storage provider
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      if (!s3Key) {
        logger.warn('No S3 key provided for deletion');
        return;
      }

      await S3Service.deleteFile(s3Key);
      logger.info('File deleted from storage', { s3Key });

    } catch (error: any) {
      logger.warn(`Could not delete file from storage: ${s3Key}`, {
        error: error.message
      });
      // Don't throw - deletion is best effort
    }
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = await S3Service.getSignedUrl(s3Key, 'getObject', expiresIn);
      logger.info('Generated signed URL', { s3Key, expiresIn });
      return url;
    } catch (error: any) {
      logger.error('Failed to generate signed URL', {
        error: error.message,
        s3Key
      });
      throw new MediaError(`Failed to generate signed URL: ${error.message}`, 500, 'SIGNED_URL_ERROR');
    }
  }

  /**
   * Generate secure filename
   */
  generateSecureFilename(originalName: string): string {
    return S3Service.generateSecureFilename(originalName);
  }

  /**
   * Build storage key path
   */
  buildStorageKey(uploaderId: string, resourceId: string | undefined, filename: string): string {
    return S3Service.buildS3Key(uploaderId, resourceId, filename);
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    return path.extname(filename);
  }
}

export const storageProviderService = new StorageProviderService();

