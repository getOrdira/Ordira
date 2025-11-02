// src/controllers/features/media/mediaDeletion.controller.ts
// Controller for media deletion operations

import { Response, NextFunction } from 'express';
import { MediaBaseController, MediaBaseRequest } from './mediaBase.controller';

interface DeleteMediaRequest extends MediaBaseRequest {
  validatedParams: {
    mediaId: string;
  };
}

interface DeleteMultipleMediaRequest extends MediaBaseRequest {
  validatedBody: {
    mediaIds: string[];
  };
}

interface DeleteByCategoryRequest extends MediaBaseRequest {
  validatedQuery: {
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  };
}

interface CleanupOrphanedRequest extends MediaBaseRequest {
  // No additional params needed
}

/**
 * MediaDeletionController exposes deletion operations aligned with media deletion service.
 */
export class MediaDeletionController extends MediaBaseController {
  /**
   * Delete a single media file
   */
  async deleteMedia(req: DeleteMediaRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const mediaId = this.resolveMediaId(req);
      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      this.recordPerformance(req, 'DELETE_MEDIA');

      const result = await this.mediaServices.deletion.deleteMedia(mediaId, uploaderId);

      this.logAction(req, 'DELETE_MEDIA_SUCCESS', {
        mediaId,
        uploaderId,
        filename: result.filename,
      });

      return { deleted: true, ...result };
    }, res, 'Media deleted successfully', this.getRequestMeta(req));
  }

  /**
   * Delete multiple media files
   */
  async deleteMultipleMedia(
    req: DeleteMultipleMediaRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const mediaIds = req.validatedBody.mediaIds;
      if (!mediaIds || mediaIds.length === 0) {
        throw { statusCode: 400, message: 'Media IDs are required' };
      }

      if (mediaIds.length > 100) {
        throw { statusCode: 400, message: 'Maximum 100 media files can be deleted at once' };
      }

      this.recordPerformance(req, 'DELETE_MULTIPLE_MEDIA');

      const result = await this.mediaServices.deletion.deleteMultipleMedia(mediaIds, uploaderId);

      this.logAction(req, 'DELETE_MULTIPLE_MEDIA_SUCCESS', {
        uploaderId,
        total: mediaIds.length,
        deleted: result.deleted,
        failed: result.failed,
      });

      return result;
    }, res, 'Bulk deletion completed', this.getRequestMeta(req));
  }

  /**
   * Delete all media for a category
   */
  async deleteByCategory(
    req: DeleteByCategoryRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const category = req.validatedQuery.category;

      this.recordPerformance(req, 'DELETE_BY_CATEGORY');

      const result = await this.mediaServices.deletion.deleteByCategory(uploaderId, category);

      this.logAction(req, 'DELETE_BY_CATEGORY_SUCCESS', {
        uploaderId,
        category,
        deleted: result.deleted,
      });

      return result;
    }, res, 'Category deletion completed', this.getRequestMeta(req));
  }

  /**
   * Clean up orphaned media files
   */
  async cleanupOrphanedMedia(
    req: CleanupOrphanedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      this.recordPerformance(req, 'CLEANUP_ORPHANED_MEDIA');

      const result = await this.mediaServices.deletion.cleanupOrphanedMedia(uploaderId);

      this.logAction(req, 'CLEANUP_ORPHANED_MEDIA_SUCCESS', {
        uploaderId,
        cleaned: result.cleaned,
      });

      return result;
    }, res, 'Orphaned media cleanup completed', this.getRequestMeta(req));
  }
}

export const mediaDeletionController = new MediaDeletionController();

