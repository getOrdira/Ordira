// src/controllers/features/media/mediaUpload.controller.ts
// Controller for media upload operations

import { Response, NextFunction } from 'express';
import { MediaBaseController, MediaBaseRequest } from './mediaBase.controller';

interface UploadMediaRequest extends MediaBaseRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  validatedBody?: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    resourceId?: string;
    isPublic?: boolean;
    allowedTypes?: string[];
    maxFileSize?: number;
  };
}

/**
 * MediaUploadController exposes upload operations aligned with media upload service.
 */
export class MediaUploadController extends MediaBaseController {
  /**
   * Upload single media file
   */
  async uploadMedia(req: UploadMediaRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const file = req.file;
      if (!file) {
        throw { statusCode: 400, message: 'No file provided' };
      }

      const options = {
        category: req.validatedBody?.category || ('product' as const),
        description: req.validatedBody?.description,
        tags: req.validatedBody?.tags || [],
        resourceId: req.validatedBody?.resourceId,
        isPublic: req.validatedBody?.isPublic || false,
        allowedTypes: req.validatedBody?.allowedTypes,
        maxFileSize: req.validatedBody?.maxFileSize,
      };

      this.recordPerformance(req, 'UPLOAD_MEDIA');

      const media = await this.mediaServices.upload.saveMedia(file, uploaderId, options);

      this.logAction(req, 'UPLOAD_MEDIA_SUCCESS', {
        mediaId: media._id?.toString(),
        uploaderId,
        filename: media.filename,
        size: media.size,
      });

      this.sendSuccess(res, { media }, 'Media uploaded successfully', this.getRequestMeta(req), 201);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }

  /**
   * Upload multiple media files (batch upload)
   */
  async uploadBatchMedia(
    req: UploadMediaRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw { statusCode: 400, message: 'No files provided' };
      }

      if (files.length > 20) {
        throw { statusCode: 400, message: 'Maximum 20 files allowed per batch' };
      }

      const options = {
        category: req.validatedBody?.category || ('product' as const),
        description: req.validatedBody?.description,
        tags: req.validatedBody?.tags || [],
        resourceId: req.validatedBody?.resourceId,
        isPublic: req.validatedBody?.isPublic || false,
        allowedTypes: req.validatedBody?.allowedTypes,
        maxFileSize: req.validatedBody?.maxFileSize,
      };

      this.recordPerformance(req, 'UPLOAD_BATCH_MEDIA');

      const result = await this.mediaServices.upload.saveMultipleMedia(files, uploaderId, options);

      this.logAction(req, 'UPLOAD_BATCH_MEDIA_SUCCESS', {
        uploaderId,
        totalFiles: files.length,
        successful: result.successful.length,
        failed: result.failed.length,
      });

      this.sendSuccess(
        res,
        {
          successful: result.successful,
          failed: result.failed,
          summary: {
            totalFiles: files.length,
            successfulUploads: result.successful.length,
            failedUploads: result.failed.length,
            successRate: ((result.successful.length / files.length) * 100).toFixed(1) + '%',
          },
        },
        'Batch media upload completed',
        this.getRequestMeta(req),
        201
      );
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }
}

export const mediaUploadController = new MediaUploadController();

