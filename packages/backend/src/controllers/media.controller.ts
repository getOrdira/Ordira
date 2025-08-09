// src/controllers/media.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { MediaService } from '../services/business/media.service';

// Initialize service
const mediaService = new MediaService();

/**
 * Extended request interfaces for type safety
 */
interface TenantMediaRequest extends AuthRequest {
  tenant?: { business: { toString: () => string } };
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

interface MediaUploadRequest extends TenantMediaRequest, ValidatedRequest {
  validatedBody: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    resourceId?: string;
    isPublic?: boolean;
  };
}

interface MediaListRequest extends TenantMediaRequest, ValidatedRequest {
  validatedQuery: {
    category?: string;
    tags?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
    sortOrder?: 'asc' | 'desc';
    isPublic?: boolean;
  };
}

interface MediaUpdateRequest extends TenantMediaRequest, ValidatedRequest {
  validatedParams: { mediaId: string };
  validatedBody: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  };
}

/**
 * Upload a single media file
 * POST /api/media/upload
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'file' field
 * @optional validation: metadata (category, description, tags, etc.)
 * @returns { media, uploadStats }
 */
export const uploadMedia = asyncHandler(async (
  req: MediaUploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Validate file upload
  if (!req.file) {
    throw createAppError('No file provided for upload', 400, 'MISSING_FILE');
  }

  // Extract validated metadata
  const metadata = req.validatedBody || {};

  // Upload media through service
  const media = await mediaService.saveMedia(req.file, businessId, metadata);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Media uploaded successfully',
    data: {
      media: {
        id: media._id.toString(),
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        url: media.url,
        category: media.category,
        description: media.description,
        tags: media.tags,
        isPublic: media.isPublic,
        uploadedAt: media.createdAt
      },
      uploadStats: {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        processingTime: Date.now() - req.file.uploadStartTime || 0
      }
    }
  });
});

/**
 * Upload multiple media files
 * POST /api/media/upload/batch
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with multiple 'files' fields
 * @returns { uploaded[], failed[], stats }
 */
export const uploadMultipleMedia = asyncHandler(async (
  req: TenantMediaRequest & { validatedBody: { category?: string; description?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Validate files upload
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw createAppError('No files provided for upload', 400, 'MISSING_FILES');
  }

  if (req.files.length > 10) {
    throw createAppError('Maximum 10 files can be uploaded at once', 400, 'TOO_MANY_FILES');
  }

  // Extract metadata
  const metadata = req.validatedBody || {};

  // Upload multiple files through service
  const results = await mediaService.saveMultipleMedia(req.files, businessId, metadata);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: `${results.successful.length} files uploaded successfully`,
    data: {
      uploaded: results.successful,
      failed: results.failed,
      stats: {
        totalFiles: req.files.length,
        successful: results.successful.length,
        failed: results.failed.length,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0)
      }
    }
  });
});

/**
 * List media files with filtering and pagination
 * GET /api/media
 * 
 * @requires authentication & tenant context
 * @optional query: filtering, pagination, sorting options
 * @returns { media[], pagination, filters, stats }
 */
export const listMedia = asyncHandler(async (
  req: MediaListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract and validate query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build filter options
  const filterOptions = {
    category: queryParams.category,
    tags: queryParams.tags?.split(','),
    search: queryParams.search,
    isPublic: queryParams.isPublic,
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc',
    limit,
    offset
  };

  // Get media list through service
  const result = await mediaService.listMediaByUser(businessId, filterOptions);

  // Get storage statistics
  const storageStats = await mediaService.getStorageStatistics(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Media files retrieved successfully',
    data: {
      media: result.media,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      },
      filters: {
        category: queryParams.category,
        tags: queryParams.tags,
        search: queryParams.search,
        isPublic: queryParams.isPublic
      },
      stats: storageStats
    }
  });
});

/**
 * Get media file details by ID
 * GET /api/media/:mediaId
 * 
 * @requires authentication & tenant context
 * @requires params: { mediaId: string }
 * @returns { media, analytics, relatedFiles }
 */
export const getMediaDetails = asyncHandler(async (
  req: TenantMediaRequest & { params: { mediaId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { mediaId } = req.params;

  // Get media details through service
  const media = await mediaService.getMediaById(mediaId, businessId);

  if (!media) {
    throw createAppError('Media file not found', 404, 'MEDIA_NOT_FOUND');
  }

  // Get additional analytics and related files
  const analytics = await mediaService.getMediaAnalytics(mediaId);
  const relatedFiles = await mediaService.getRelatedMedia(mediaId, businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Media details retrieved successfully',
    data: {
      media: {
        id: media._id.toString(),
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        url: media.url,
        category: media.category,
        description: media.description,
        tags: media.tags,
        metadata: media.metadata,
        isPublic: media.isPublic,
        downloadCount: media.downloadCount,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt
      },
      analytics,
      relatedFiles,
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Update media metadata
 * PUT /api/media/:mediaId
 * 
 * @requires authentication & tenant context
 * @requires params: { mediaId: string }
 * @requires validation: metadata updates
 * @returns { updatedMedia, changedFields }
 */
export const updateMediaMetadata = asyncHandler(async (
  req: MediaUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { mediaId } = req.validatedParams;
  const updateData = req.validatedBody;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Update media metadata through service
  const updatedMedia = await mediaService.updateMediaMetadata(mediaId, businessId, updateData);

  // Determine which fields were changed
  const changedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);

  // Return standardized response
  res.json({
    success: true,
    message: 'Media metadata updated successfully',
    data: {
      media: {
        id: updatedMedia._id.toString(),
        filename: updatedMedia.filename,
        category: updatedMedia.category,
        description: updatedMedia.description,
        tags: updatedMedia.tags,
        isPublic: updatedMedia.isPublic,
        updatedAt: updatedMedia.updatedAt
      },
      changedFields,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete media file
 * DELETE /api/media/:mediaId
 * 
 * @requires authentication & tenant context
 * @requires params: { mediaId: string }
 * @returns { deleted, storageFreed }
 */
export const deleteMedia = asyncHandler(async (
  req: TenantMediaRequest & { params: { mediaId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { mediaId } = req.params;

  // Delete media through service
  const deletionResult = await mediaService.deleteMedia(mediaId, businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Media file deleted successfully',
    data: {
      deleted: true,
      mediaId,
      storageFreed: deletionResult.fileSize,
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Get media by category
 * GET /api/media/category/:category
 * 
 * @requires authentication & tenant context
 * @requires params: { category: string }
 * @returns { media[], categoryStats }
 */
export const getMediaByCategory = asyncHandler(async (
  req: TenantMediaRequest & { params: { category: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { category } = req.params;

  // Validate category
  const validCategories = ['profile', 'product', 'banner', 'certificate', 'document'];
  if (!validCategories.includes(category)) {
    throw createAppError(`Invalid category. Valid categories: ${validCategories.join(', ')}`, 400, 'INVALID_CATEGORY');
  }

  // Get media by category through service
  const media = await mediaService.getMediaByCategory(businessId, category as any);
  const categoryStats = await mediaService.getCategoryStatistics(businessId, category as any);

  // Return standardized response
  res.json({
    success: true,
    message: `Media files in category '${category}' retrieved successfully`,
    data: {
      category,
      media,
      stats: categoryStats,
      total: media.length
    }
  });
});

/**
 * Download media file
 * GET /api/media/:mediaId/download
 * 
 * @requires authentication & tenant context (or public file)
 * @requires params: { mediaId: string }
 * @returns file stream
 */
export const downloadMedia = asyncHandler(async (
  req: TenantMediaRequest & { params: { mediaId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  const { mediaId } = req.params;

  // Get media and initiate download through service
  const downloadResult = await mediaService.initiateDownload(mediaId, businessId);

  // Set appropriate headers for file download
  res.setHeader('Content-Type', downloadResult.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
  res.setHeader('Content-Length', downloadResult.fileSize);

  // Stream the file
  downloadResult.stream.pipe(res);
});
