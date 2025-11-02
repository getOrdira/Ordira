// src/controllers/features/media/mediaData.controller.ts
// Controller for media data operations (CRUD)

import { Response, NextFunction } from 'express';
import { MediaBaseController, MediaBaseRequest } from './mediaBase.controller';

interface GetMediaByIdRequest extends MediaBaseRequest {
  validatedParams: {
    mediaId: string;
  };
}

interface ListMediaRequest extends MediaBaseRequest {
  validatedQuery?: {
    page?: number;
    limit?: number;
    type?: 'image' | 'video' | 'gif' | 'document';
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    tags?: string;
    search?: string;
    isPublic?: boolean;
    sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
    sortOrder?: 'asc' | 'desc';
  };
}

interface UpdateMediaMetadataRequest extends MediaBaseRequest {
  validatedParams: {
    mediaId: string;
  };
  validatedBody: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  };
}

interface GetMediaByCategoryRequest extends MediaBaseRequest {
  validatedQuery: {
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  };
}

interface GetRecentMediaRequest extends MediaBaseRequest {
  validatedQuery?: {
    limit?: number;
  };
}

/**
 * MediaDataController exposes data operations aligned with media data service.
 */
export class MediaDataController extends MediaBaseController {
  /**
   * Get media by ID
   */
  async getMediaById(req: GetMediaByIdRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const mediaId = this.resolveMediaId(req);
      const uploaderId = this.resolveUploaderId(req);

      this.recordPerformance(req, 'GET_MEDIA');

      const media = await this.mediaServices.data.getMediaById(mediaId, uploaderId, true);

      if (!media) {
        throw { statusCode: 404, message: 'Media not found' };
      }

      this.logAction(req, 'GET_MEDIA_SUCCESS', {
        mediaId,
        uploaderId,
      });

      return { media };
    }, res, 'Media retrieved', this.getRequestMeta(req));
  }

  /**
   * List media with pagination and filters
   */
  async listMedia(req: ListMediaRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const pagination = this.parsePagination(req.validatedQuery, 20);
      const query = req.validatedQuery ?? {};

      const options = {
        page: pagination.page,
        limit: pagination.limit,
        offset: pagination.offset,
        type: this.parseString(query.type) as 'image' | 'video' | 'gif' | 'document' | undefined,
        category: this.parseString(query.category) as 'profile' | 'product' | 'banner' | 'certificate' | 'document' | undefined,
        tags: query.tags ? this.parseArray(query.tags) : undefined,
        search: this.parseString(query.search),
        isPublic: query.isPublic !== undefined ? this.parseBoolean(query.isPublic) : undefined,
        sortBy: this.parseString(query.sortBy) as 'createdAt' | 'filename' | 'size' | 'category' | undefined,
        sortOrder: this.parseString(query.sortOrder) === 'asc' ? 'asc' : 'desc' as 'asc' | 'desc',
      };

      this.recordPerformance(req, 'LIST_MEDIA');

      const result = await this.mediaServices.data.listMediaByUser(uploaderId, options);

      const paginationMeta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.total
      );

      this.logAction(req, 'LIST_MEDIA_SUCCESS', {
        uploaderId,
        total: result.total,
      });

      return {
        media: result.media,
        pagination: paginationMeta,
        total: result.total,
      };
    }, res, 'Media list retrieved', this.getRequestMeta(req));
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(
    req: UpdateMediaMetadataRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const mediaId = this.resolveMediaId(req);
      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      // Get existing media to verify ownership
      const existing = await this.mediaServices.data.getMediaById(mediaId, uploaderId, false);
      if (!existing) {
        throw { statusCode: 404, message: 'Media not found or access denied' };
      }

      const updates = req.validatedBody;
      if (Object.keys(updates).length === 0) {
        throw { statusCode: 400, message: 'At least one field must be updated' };
      }

      this.recordPerformance(req, 'UPDATE_MEDIA');

      // For now, we'll need to update through the model directly
      // TODO: Add updateMediaMetadata method to mediaDataService
      const { Media } = await import('../../../models/media/media.model');
      const updated = await Media.findByIdAndUpdate(
        mediaId,
        {
          $set: {
            ...(updates.category && { category: updates.category }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.tags && { tags: updates.tags }),
            ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
          },
        },
        { new: true }
      ).lean();

      if (!updated) {
        throw { statusCode: 404, message: 'Media not found' };
      }

      // Invalidate cache
      await this.mediaServices.cache.invalidateMediaCaches(uploaderId, updated.category);

      this.logAction(req, 'UPDATE_MEDIA_SUCCESS', {
        mediaId,
        uploaderId,
      });

      return { media: updated };
    }, res, 'Media updated', this.getRequestMeta(req));
  }

  /**
   * Get media by category
   */
  async getMediaByCategory(
    req: GetMediaByCategoryRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const category = req.validatedQuery.category;

      this.recordPerformance(req, 'GET_MEDIA_BY_CATEGORY');

      const media = await this.mediaServices.data.getMediaByCategory(uploaderId, category);

      this.logAction(req, 'GET_MEDIA_BY_CATEGORY_SUCCESS', {
        uploaderId,
        category,
        count: media.length,
      });

      return { media, category };
    }, res, 'Media by category retrieved', this.getRequestMeta(req));
  }

  /**
   * Get recent media
   */
  async getRecentMedia(
    req: GetRecentMediaRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_RECENT_MEDIA');

      const media = await this.mediaServices.data.getRecentMedia(uploaderId, limit);

      this.logAction(req, 'GET_RECENT_MEDIA_SUCCESS', {
        uploaderId,
        limit,
        count: media.length,
      });

      return { media };
    }, res, 'Recent media retrieved', this.getRequestMeta(req));
  }
}

export const mediaDataController = new MediaDataController();

