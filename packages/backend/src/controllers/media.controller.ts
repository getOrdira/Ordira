
// src/controllers/media.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { MediaService } from '../services/business/media.service';

// Initialize service
const mediaService = new MediaService();

/**
 * Extended request interfaces for type safety
 */
interface TenantMediaRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
  file?: Express.Multer.File;
}

interface MediaUploadRequest extends TenantMediaRequest {
  validatedBody: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    resourceId?: string;
    isPublic?: boolean;
  };
}

interface MediaListRequest extends TenantMediaRequest {
  validatedQuery: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    tags?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
    sortOrder?: 'asc' | 'desc';
    isPublic?: boolean;
  };
}

interface MediaUpdateRequest extends TenantMediaRequest {
  validatedParams: { mediaId: string };
  validatedBody: {
    category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  };
}

/**
 * Unified file upload endpoint - handles ALL file types
 * POST /api/media/upload
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'file' field
 * @optional validation: metadata (category, description, tags, resourceId, etc.)
 * @returns { media, uploadStats, autoUpdates }
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

  // Handle automatic updates based on category and resourceId
  const autoUpdates = await handleAutomaticUpdates(media, businessId, metadata);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
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
        uploadedAt: media.createdAt,
        // S3 information if available
        ...(media.s3Key && {
          storage: {
            type: 's3',
            s3Key: media.s3Key,
            s3Bucket: media.s3Bucket,
            s3Region: media.s3Region
          }
        })
      },
      uploadStats: {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        storageLocation: media.s3Key ? 's3' : 'local'
      },
      autoUpdates
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
  const results = await mediaService.saveMultipleMedia(req.files, businessId);

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
  const media = await mediaService.getMediaByCategory(businessId, category);
  const categoryStats = await mediaService.getCategoryStatistics(businessId, category);

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

/**
 * Get storage health status
 * GET /api/media/health
 * 
 * @requires authentication & tenant context
 * @returns { status, s3Available, latency, errors }
 */
export const getStorageHealth = asyncHandler(async (
  req: TenantMediaRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get storage health through service
  const healthStatus = await mediaService.getStorageHealth();

  // Return standardized response
  res.json({
    success: true,
    message: 'Storage health status retrieved successfully',
    data: {
      storage: healthStatus,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Migrate local files to S3
 * POST /api/media/migrate-to-s3
 * 
 * @requires authentication & tenant context
 * @returns { migrated, failed, errors }
 */
export const migrateToS3 = asyncHandler(async (
  req: TenantMediaRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Migrate files through service
  const migrationResult = await mediaService.migrateLocalFilesToS3(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: `Migration completed: ${migrationResult.migrated} files migrated, ${migrationResult.failed} failed`,
    data: {
      migration: migrationResult,
      migratedAt: new Date().toISOString()
    }
  });
});

/**
 * Generate direct upload URL for S3
 * POST /api/media/upload-url
 * 
 * @requires authentication & tenant context
 * @requires validation: { filename, mimeType, resourceId? }
 * @returns { uploadUrl, s3Key, formData }
 */
export const generateUploadUrl = asyncHandler(async (
  req: TenantMediaRequest & { 
    validatedBody: { 
      filename: string; 
      mimeType: string; 
      resourceId?: string;
      expiresIn?: number;
    } 
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { filename, mimeType, resourceId, expiresIn } = req.validatedBody;

  // Generate upload URL through service
  const uploadInfo = await mediaService.generateUploadUrl(businessId, filename, mimeType, {
    resourceId,
    expiresIn
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Upload URL generated successfully',
    data: {
      upload: uploadInfo,
      expiresIn: expiresIn || 3600,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Bulk delete media files
 * DELETE /api/media/bulk
 * 
 * @requires authentication & tenant context
 * @requires validation: { mediaIds: string[] }
 * @returns { deleted, errors, s3KeysDeleted }
 */
export const bulkDeleteMedia = asyncHandler(async (
  req: TenantMediaRequest & { validatedBody: { mediaIds: string[] } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { mediaIds } = req.validatedBody;

  if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
    throw createAppError('Media IDs array is required and cannot be empty', 400, 'MISSING_MEDIA_IDS');
  }

  // Bulk delete through service
  const deleteResult = await mediaService.bulkDeleteMedia(mediaIds, businessId);

  // Return standardized response
  res.json({
    success: true,
    message: `Bulk deletion completed: ${deleteResult.deleted} files deleted`,
    data: {
      deletion: deleteResult,
      deletedAt: new Date().toISOString()
    }
  });
});

// Update the existing uploadMedia response to include S3 information
export const uploadMediaEnhanced = asyncHandler(async (
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

  // Return enhanced response with S3 information
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
        uploadedAt: media.createdAt,
        // S3 information if available
        ...(media.s3Key && {
          storage: {
            type: 's3',
            s3Key: media.s3Key,
            s3Bucket: media.s3Bucket,
            s3Region: media.s3Region
          }
        })
      },
      uploadStats: {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        storageLocation: media.s3Key ? 's3' : 'local'
      }
    }
  });
});

/**
 * Handle automatic updates based on file category and resourceId
 */
async function handleAutomaticUpdates(media: any, businessId: string, metadata: any): Promise<any> {
  const updates = {
    updated: [],
    errors: []
  };

  try {
    // Profile picture updates
    if (media.category === 'profile') {
      try {
        // Update brand profile picture
        const { BrandAccountService } = await import('../services/business/brandAccount.service');
        const brandService = new BrandAccountService();
        await brandService.updateBrandAccount(businessId, {
          profilePictureUrl: media.url
        });
        updates.updated.push('Brand profile picture updated');
      } catch (error) {
        updates.errors.push('Failed to update brand profile picture');
      }

      try {
        // Update manufacturer profile picture
        const { ManufacturerAccountService } = await import('../services/business/manufacturerAccount.service');
        const manufacturerService = new ManufacturerAccountService();
        await manufacturerService.updateManufacturerAccount(businessId, {
          profilePictureUrl: media.url
        });
        updates.updated.push('Manufacturer profile picture updated');
      } catch (error) {
        updates.errors.push('Failed to update manufacturer profile picture');
      }
    }

    // Product image updates
    if (media.category === 'product' && metadata.resourceId) {
      try {
        const { ProductService } = await import('../services/business/product.service');
        const productService = new ProductService();
        
        // Get current product
        const product = await productService.getProduct(metadata.resourceId, businessId);
        if (product) {
          // Add new image URL to product media array
          const updatedMedia = [...(product.media || []), media.url];
          await productService.updateProduct(metadata.resourceId, {
            media: updatedMedia
          }, businessId);
          updates.updated.push(`Product ${metadata.resourceId} images updated`);
        }
      } catch (error) {
        updates.errors.push(`Failed to update product ${metadata.resourceId} images`);
      }
    }

    // Brand logo updates
    if (media.category === 'banner' && metadata.description === 'Brand logo') {
      try {
        const { BrandSettingsService } = await import('../services/business/brandSettings.service');
        const brandSettingsService = new BrandSettingsService();
        await brandSettingsService.updateSettings(businessId, {
          logoUrl: media.url
        });
        updates.updated.push('Brand logo updated');
      } catch (error) {
        updates.errors.push('Failed to update brand logo');
      }
    }

    // Brand banner updates
    if (media.category === 'banner' && metadata.description === 'Brand banner image') {
      try {
        const { BrandSettingsService } = await import('../services/business/brandSettings.service');
        const brandSettingsService = new BrandSettingsService();
        
        // Get current settings and add new banner
        const currentSettings = await brandSettingsService.getSettings(businessId);
        const updatedBannerImages = [...(currentSettings.bannerImages || []), media.url];
        
        await brandSettingsService.updateSettings(businessId, {
          bannerImages: updatedBannerImages
        });
        updates.updated.push('Brand banner updated');
      } catch (error) {
        updates.errors.push('Failed to update brand banner');
      }
    }

    // Certificate document updates
    if (media.category === 'certificate' && metadata.resourceId) {
      try {
        // For now, just log that certificate document was uploaded
        // The certificate can be updated separately with the document URL
        updates.updated.push(`Certificate ${metadata.resourceId} document uploaded (URL: ${media.url})`);
      } catch (error) {
        updates.errors.push(`Failed to process certificate ${metadata.resourceId} document`);
      }
    }

  } catch (error) {
    console.error('Error in handleAutomaticUpdates:', error);
    updates.errors.push('Failed to process automatic updates');
  }

  return updates;
}

// Update the existing downloadMedia to handle S3 signed URLs
export const downloadMediaEnhanced = asyncHandler(async (
  req: TenantMediaRequest & { 
    params: { mediaId: string };
    query: { redirect?: 'true' | 'false' };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  const { mediaId } = req.params;
  const shouldRedirect = req.query.redirect === 'true';

  // Get media and initiate download through service
  const downloadResult = await mediaService.initiateDownload(mediaId, businessId);

  // For S3 files, optionally provide direct redirect to signed URL
  if (downloadResult.signedUrl && shouldRedirect) {
    res.redirect(downloadResult.signedUrl);
    return;
  }

  // Set appropriate headers for file download
  res.setHeader('Content-Type', downloadResult.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
  res.setHeader('Content-Length', downloadResult.fileSize);

  // Add S3 information to headers if available
  if (downloadResult.signedUrl) {
    res.setHeader('X-S3-Signed-URL', downloadResult.signedUrl);
  }

  // Stream the file
  downloadResult.stream.pipe(res);
});
