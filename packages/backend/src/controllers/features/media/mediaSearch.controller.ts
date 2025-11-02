// src/controllers/features/media/mediaSearch.controller.ts
// Controller for media search operations

import { Response, NextFunction } from 'express';
import { MediaBaseController, MediaBaseRequest } from './mediaBase.controller';

interface SearchMediaRequest extends MediaBaseRequest {
  validatedQuery: {
    q: string;
    type?: 'image' | 'video' | 'gif' | 'document';
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    limit?: number;
    page?: number;
  };
}

interface SearchByTagsRequest extends MediaBaseRequest {
  validatedQuery: {
    tags: string | string[];
    type?: 'image' | 'video' | 'gif' | 'document';
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    limit?: number;
  };
}

/**
 * MediaSearchController exposes search operations aligned with media search service.
 */
export class MediaSearchController extends MediaBaseController {
  /**
   * Search media with text query
   */
  async searchMedia(req: SearchMediaRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const query = this.parseString(req.validatedQuery.q);
      if (!query || query.length < 2) {
        throw { statusCode: 400, message: 'Search query must be at least 2 characters' };
      }

      const options = {
        type: this.parseString(req.validatedQuery.type) as 'image' | 'video' | 'gif' | 'document' | undefined,
        category: this.parseString(req.validatedQuery.category) as 'profile' | 'product' | 'banner' | 'certificate' | 'document' | undefined,
        limit: this.parseNumber(req.validatedQuery.limit, 50, { min: 1, max: 100 }),
        page: this.parseNumber(req.validatedQuery.page, 1, { min: 1 }),
      };

      this.recordPerformance(req, 'SEARCH_MEDIA');

      const result = await this.mediaServices.search.searchMedia(uploaderId, query, options);

      this.logAction(req, 'SEARCH_MEDIA_SUCCESS', {
        uploaderId,
        query,
        resultsCount: result.media?.length || 0,
        total: result.total,
      });

      return {
        media: result.media,
        total: result.total,
        query,
      };
    }, res, 'Media search completed', this.getRequestMeta(req));
  }

  /**
   * Search media by tags
   */
  async searchByTags(req: SearchByTagsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const tags = req.validatedQuery.tags
        ? this.parseArray(req.validatedQuery.tags)
        : [];
      if (tags.length === 0) {
        throw { statusCode: 400, message: 'At least one tag is required' };
      }

      const options = {
        type: this.parseString(req.validatedQuery.type) as 'image' | 'video' | 'gif' | 'document' | undefined,
        category: this.parseString(req.validatedQuery.category) as 'profile' | 'product' | 'banner' | 'certificate' | 'document' | undefined,
        limit: this.parseNumber(req.validatedQuery.limit, 100, { min: 1, max: 100 }),
      };

      this.recordPerformance(req, 'SEARCH_MEDIA_BY_TAGS');

      const result = await this.mediaServices.search.searchByTags(uploaderId, tags, options);

      this.logAction(req, 'SEARCH_MEDIA_BY_TAGS_SUCCESS', {
        uploaderId,
        tags,
        resultsCount: result.media?.length || 0,
        total: result.total,
      });

      return {
        media: result.media,
        total: result.total,
        tags,
      };
    }, res, 'Tag search completed', this.getRequestMeta(req));
  }
}

export const mediaSearchController = new MediaSearchController();

