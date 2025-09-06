// src/services/business/media.service.ts

import path from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { Media, IMedia } from '../../models/media.model';
import { S3Service } from '../external/s3.service';

// Enhanced interfaces to match controller expectations
export interface MediaUploadOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  description?: string;
  tags?: string[];
  resourceId?: string;
  isPublic?: boolean;
  compress?: boolean;
}

export interface MediaListOptions {
  page?: number;
  limit?: number;
  offset?: number;
  type?: 'image' | 'video' | 'gif' | 'document';
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'filename' | 'size' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  storageUsed: string;
  averageFileSize?: string;
  largestFile?: {
    filename: string;
    size: string;
    uploadDate: Date;
  };
}

export interface CategoryStats {
  category: string;
  totalFiles: number;
  totalSize: string;
  averageFileSize: string;
  mostRecentUpload?: Date;
  fileTypes: Record<string, number>;
}

export interface MediaAnalytics {
  downloadCount: number;
  viewCount: number;
  lastDownloaded?: Date;
  lastViewed?: Date;
  popularityScore: number;
  recentActivity: {
    date: Date;
    action: 'download' | 'view' | 'share';
    count: number;
  }[];
}

export interface DownloadResult {
  mimeType: string;
  filename: string;
  fileSize: number;
  stream: NodeJS.ReadableStream;
  signedUrl?: string; // For S3 direct downloads
}

export interface BatchUploadResult {
  successful: Array<{
    id: string;
    filename: string;
    originalName: string;
    url: string;
    size: number;
    s3Key?: string;
  }>;
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

export interface DeletionResult {
  fileSize: number;
  filename: string;
  deletedAt: Date;
  s3Key?: string;
}

/**
 * Custom error class for media operations with status codes
 */
class MediaError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'MediaError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Enhanced media management service with S3 integration
 */
export class MediaService {

  /**
   * Save an uploaded media file record with S3 storage
   */
  async saveMedia(
    file: Express.Multer.File | undefined,
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<IMedia> {
    try {
      // Validate inputs
      if (!file) {
        throw new MediaError('No file provided', 400, 'MISSING_FILE');
      }

      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Validate file type if restrictions exist
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        throw new MediaError(
          `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
          400,
          'INVALID_FILE_TYPE'
        );
      }

      // Validate file size if restriction exists
      if (options.maxFileSize && file.size > options.maxFileSize) {
        throw new MediaError(
          `File size ${this.formatFileSize(file.size)} exceeds limit of ${this.formatFileSize(options.maxFileSize)}`,
          400,
          'FILE_SIZE_EXCEEDED'
        );
      }

      // Additional file validations
      if (!file.filename) {
        throw new MediaError('File must have a filename', 400, 'MISSING_FILENAME');
      }

      if (file.size <= 0) {
        throw new MediaError('File appears to be empty', 400, 'EMPTY_FILE');
      }

      // Generate secure filename and S3 key
      const secureFilename = S3Service.generateSecureFilename(file.originalname);
      const s3Key = S3Service.buildS3Key(uploaderId, options.resourceId, secureFilename);

      // Upload to S3
      let s3Result;
      try {
        s3Result = await S3Service.uploadFile(file.buffer, {
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
      } catch (s3Error) {
        throw new MediaError(`S3 upload failed: ${s3Error.message}`, 500, 'S3_UPLOAD_ERROR');
      }

      // Determine type from MIME
      const type = this.determineMediaType(file.mimetype);

      const media = new Media({
        url: s3Result.url,
        s3Key: s3Result.key,
        s3Bucket: s3Result.bucket,
        s3ETag: s3Result.etag,
        type,
        uploadedBy: uploaderId,
        filename: secureFilename,
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

      return await media.save();
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new MediaError(`Validation failed: ${validationErrors.join(', ')}`, 400, 'VALIDATION_ERROR');
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        throw new MediaError('Media file already exists', 409, 'DUPLICATE_FILE');
      }

      throw new MediaError(`Failed to save media: ${error.message}`, 500, 'SAVE_ERROR');
    }
  }

  /**
   * Save multiple uploaded media files with S3 storage
   */
  async saveMultipleMedia(
    files: Express.Multer.File[],
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const successful: BatchUploadResult['successful'] = [];
    const failed: BatchUploadResult['failed'] = [];

    for (const file of files) {
      try {
        const media = await this.saveMedia(file, uploaderId, options);
        successful.push({
          id: media._id.toString(),
          filename: media.filename,
          originalName: media.originalName,
          url: media.url,
          size: media.size,
          s3Key: media.s3Key
        });
      } catch (error: any) {
        failed.push({
          filename: file.originalname || file.filename || 'unknown',
          error: error.message
        });
      }
    }

    return { successful, failed };
  }

  /**
   * List media uploaded by a given user/business with enhanced filtering
   */
  async listMediaByUser(
    uploaderId: string,
    options: MediaListOptions = {}
  ): Promise<{
    media: IMedia[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      const page = options.page && options.page > 0 ? options.page : 1;
      const limit = options.limit && options.limit > 0 && options.limit <= 200 ? options.limit : 50;
      const offset = options.offset || (page - 1) * limit;

      // Validate pagination parameters
      if (page > 10000) {
        throw new MediaError('Page number too large', 400, 'INVALID_PAGE');
      }

      // Build filter
      const filter: Record<string, any> = { uploadedBy: uploaderId };
      
      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;
      if (options.isPublic !== undefined) filter.isPublic = options.isPublic;
      
      // Handle tags filtering
      if (options.tags && options.tags.length > 0) {
        filter.tags = { $in: options.tags };
      }
      
      // Handle search
      if (options.search) {
        filter.$or = [
          { originalName: { $regex: options.search, $options: 'i' } },
          { filename: { $regex: options.search, $options: 'i' } },
          { description: { $regex: options.search, $options: 'i' } },
          { tags: { $in: [new RegExp(options.search, 'i')] } }
        ];
      }

      // Build sort
      const sortField = options.sortBy || 'createdAt';
      const sortDirection = options.sortOrder === 'asc' ? '' : '-';
      const sortString = `${sortDirection}${sortField}`;

      const [media, total] = await Promise.all([
        Media
          .find(filter)
          .sort(sortString)
          .skip(offset)
          .limit(limit)
          .exec(),
        Media.countDocuments(filter)
      ]);

      return {
        media,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle database connection errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new MediaError('Database error while fetching media', 503, 'DATABASE_ERROR');
      }

      throw new MediaError(`Failed to list media: ${error.message}`, 500, 'LIST_ERROR');
    }
  }

  /**
   * Get storage statistics for a user with S3 integration
   */
  async getStorageStatistics(uploaderId: string): Promise<MediaStats> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      const [stats, typeStats, categoryStats, largestFileData, s3Stats] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' }
            }
          }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Media.findOne({ uploadedBy: uploaderId })
          .sort({ size: -1 })
          .select('filename size createdAt'),
        // Get S3 storage stats to verify consistency
        S3Service.getStorageStats(uploaderId).catch(() => ({ totalFiles: 0, totalSize: 0, sizeFormatted: '0 MB' }))
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;
      const averageSize = stats[0]?.averageSize || 0;

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat._id || 'unknown'] = stat.count;
      });

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat._id || 'unknown'] = stat.count;
      });

      return {
        totalFiles,
        totalSize,
        byType,
        byCategory,
        storageUsed: this.formatFileSize(totalSize),
        averageFileSize: this.formatFileSize(averageSize),
        largestFile: largestFileData ? {
          filename: largestFileData.filename,
          size: this.formatFileSize(largestFileData.size),
          uploadDate: largestFileData.createdAt
        } : undefined
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get storage statistics: ${error.message}`, 500, 'STATS_ERROR');
    }
  }

  /**
   * Get media analytics
   */
  async getMediaAnalytics(mediaId: string): Promise<MediaAnalytics> {
    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400, 'MISSING_MEDIA_ID');
      }

      const media = await Media.findById(mediaId);
      if (!media) {
        throw new MediaError('Media not found', 404, 'MEDIA_NOT_FOUND');
      }

      return {
        downloadCount: media.downloadCount || 0,
        viewCount: 0, // Can be tracked separately
        popularityScore: (media.downloadCount || 0) * 1.5,
        recentActivity: []
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get media analytics: ${error.message}`, 500, 'ANALYTICS_ERROR');
    }
  }

  /**
   * Get related media files
   */
  async getRelatedMedia(mediaId: string, uploaderId: string, limit: number = 5): Promise<IMedia[]> {
    try {
      const media = await Media.findById(mediaId);
      if (!media) {
        return [];
      }

      // Find related files by category and tags
      const relatedFilter: any = {
        uploadedBy: uploaderId,
        _id: { $ne: mediaId },
        $or: [
          { category: media.category },
          { tags: { $in: media.tags || [] } }
        ]
      };

      return await Media
        .find(relatedFilter)
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error: any) {
      throw new MediaError(`Failed to get related media: ${error.message}`, 500, 'RELATED_ERROR');
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics(uploaderId: string, category: string): Promise<CategoryStats> {
    try {
      const [stats, typeStats, recentFile] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId, category } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' }
            }
          }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId, category } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Media.findOne({ uploadedBy: uploaderId, category })
          .sort({ createdAt: -1 })
          .select('createdAt')
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;
      const averageSize = stats[0]?.averageSize || 0;

      const fileTypes: Record<string, number> = {};
      typeStats.forEach(stat => {
        fileTypes[stat._id || 'unknown'] = stat.count;
      });

      return {
        category,
        totalFiles,
        totalSize: this.formatFileSize(totalSize),
        averageFileSize: this.formatFileSize(averageSize),
        mostRecentUpload: recentFile?.createdAt,
        fileTypes
      };
    } catch (error: any) {
      throw new MediaError(`Failed to get category statistics: ${error.message}`, 500, 'CATEGORY_STATS_ERROR');
    }
  }

  /**
   * Initiate file download with S3 support
   */
  async initiateDownload(mediaId: string, uploaderId?: string): Promise<DownloadResult> {
    try {
      const filter: any = { _id: mediaId };
      if (uploaderId) {
        // For private files, check ownership or public status
        filter.$or = [
          { uploadedBy: uploaderId },
          { isPublic: true }
        ];
      } else {
        // Only public files for anonymous access
        filter.isPublic = true;
      }

      const media = await Media.findOne(filter);
      if (!media) {
        throw new MediaError('Media not found or access denied', 404, 'MEDIA_NOT_FOUND');
      }

      // Update download count
      await Media.findByIdAndUpdate(mediaId, { 
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: new Date() }
      });

      // For S3 storage, provide both signed URL and stream options
      if (media.s3Key) {
        try {
          const signedUrl = await S3Service.getSignedUrl(media.s3Key, 'getObject', 3600); // 1 hour
          const stream = S3Service.getFileStream(media.s3Key);

          return {
            mimeType: media.mimeType,
            filename: media.originalName,
            fileSize: media.size,
            stream,
            signedUrl
          };
        } catch (s3Error) {
          throw new MediaError(`S3 download failed: ${s3Error.message}`, 500, 'S3_DOWNLOAD_ERROR');
        }
      }

      // Fallback for legacy local files (if any exist)
      const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', path.basename(media.url));
      try {
        const stream = createReadStream(filePath);
        return {
          mimeType: media.mimeType,
          filename: media.originalName,
          fileSize: media.size,
          stream
        };
      } catch {
        throw new MediaError('File not found', 404, 'FILE_NOT_FOUND');
      }
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to initiate download: ${error.message}`, 500, 'DOWNLOAD_ERROR');
    }
  }

  /**
   * Get media by ID with ownership verification
   */
  async getMediaById(mediaId: string, uploaderId?: string): Promise<IMedia | null> {
    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400, 'MISSING_MEDIA_ID');
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
        throw new MediaError('Invalid media ID format', 400, 'INVALID_MEDIA_ID');
      }

      const filter: any = { _id: mediaId };
      if (uploaderId) {
        if (!uploaderId.trim()) {
          throw new MediaError('Uploader ID cannot be empty', 400, 'EMPTY_UPLOADER_ID');
        }
        filter.uploadedBy = uploaderId;
      }

      return await Media.findOne(filter);
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        throw new MediaError('Invalid media ID format', 400, 'INVALID_MEDIA_ID');
      }

      throw new MediaError(`Failed to get media: ${error.message}`, 500, 'GET_ERROR');
    }
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(
    mediaId: string,
    uploaderId: string,
    updates: {
      category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<IMedia> {
    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400, 'MISSING_MEDIA_ID');
      }
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
        throw new MediaError('Invalid media ID format', 400, 'INVALID_MEDIA_ID');
      }

      // Validate updates object
      if (!updates || Object.keys(updates).length === 0) {
        throw new MediaError('No updates provided', 400, 'EMPTY_UPDATES');
      }

      // Validate tags if provided
      if (updates.tags) {
        if (!Array.isArray(updates.tags)) {
          throw new MediaError('Tags must be an array', 400, 'INVALID_TAGS');
        }
        if (updates.tags.length > 20) {
          throw new MediaError('Maximum 20 tags allowed', 400, 'TOO_MANY_TAGS');
        }
      }

      const media = await Media.findOneAndUpdate(
        { _id: mediaId, uploadedBy: uploaderId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!media) {
        throw new MediaError('Media not found or access denied', 404, 'MEDIA_NOT_FOUND');
      }

      // Update S3 metadata if the file is stored in S3
      if (media.s3Key) {
        try {
          const s3Metadata: Record<string, string> = {
            category: updates.category || media.category,
            uploadedBy: uploaderId,
            lastUpdated: new Date().toISOString()
          };

          if (updates.description) s3Metadata.description = updates.description;
          if (updates.tags) s3Metadata.tags = updates.tags.join(',');
          if (updates.isPublic !== undefined) s3Metadata.isPublic = updates.isPublic.toString();

          await S3Service.updateMetadata(media.s3Key, s3Metadata);
        } catch (s3Error) {
          // Log warning but don't fail the operation
          console.warn(`Failed to update S3 metadata for ${media.s3Key}:`, s3Error.message);
        }
      }

      return media;
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new MediaError(`Validation failed: ${validationErrors.join(', ')}`, 400, 'VALIDATION_ERROR');
      }

      throw new MediaError(`Failed to update media metadata: ${error.message}`, 500, 'UPDATE_ERROR');
    }
  }

  /**
   * Delete media file and database record with S3 support
   */
  async deleteMedia(mediaId: string, uploaderId: string): Promise<DeletionResult> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }

      const media = await this.getMediaById(mediaId, uploaderId);
      if (!media) {
        throw new MediaError('Media not found or access denied', 404, 'MEDIA_NOT_FOUND');
      }

      const fileSize = media.size;
      const filename = media.filename;
      const s3Key = media.s3Key;

      // Delete from S3 if stored there
      if (s3Key) {
        try {
          await S3Service.deleteFile(s3Key);
        } catch (s3Error) {
          // Log warning but continue with database deletion
          console.warn(`Could not delete S3 file ${s3Key}:`, s3Error.message);
        }
      }

      // Delete database record
      const deletedMedia = await Media.findByIdAndDelete(mediaId);
      if (!deletedMedia) {
        throw new MediaError('Media not found or already deleted', 404, 'MEDIA_NOT_FOUND');
      }

      return {
        fileSize,
        filename,
        deletedAt: new Date(),
        s3Key
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to delete media: ${error.message}`, 500, 'DELETE_ERROR');
    }
  }

  /**
   * Get media by category
   */
  async getMediaByCategory(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<IMedia[]> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!category?.trim()) {
        throw new MediaError('Category is required', 400, 'MISSING_CATEGORY');
      }

      const validCategories = ['profile', 'product', 'banner', 'certificate', 'document'];
      if (!validCategories.includes(category)) {
        throw new MediaError(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400, 'INVALID_CATEGORY');
      }

      return await Media.find({
        uploadedBy: uploaderId,
        category
      }).sort({ createdAt: -1 });
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get media by category: ${error.message}`, 500, 'CATEGORY_ERROR');
    }
  }

  /**
   * Bulk delete media files with S3 support
   */
  async bulkDeleteMedia(mediaIds: string[], uploaderId: string): Promise<{
    deleted: number;
    errors: string[];
    s3KeysDeleted: string[];
  }> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new MediaError('Media IDs array is required and cannot be empty', 400, 'MISSING_MEDIA_IDS');
      }
      if (mediaIds.length > 100) {
        throw new MediaError('Maximum 100 files can be deleted at once', 400, 'TOO_MANY_FILES');
      }

      // Validate all media IDs format
      for (const mediaId of mediaIds) {
        if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
          throw new MediaError(`Invalid media ID format: ${mediaId}`, 400, 'INVALID_MEDIA_ID');
        }
      }

      // Get all media records first
      const mediaRecords = await Media.find({
        _id: { $in: mediaIds },
        uploadedBy: uploaderId
      });

      // Collect S3 keys for batch deletion
      const s3Keys = mediaRecords
        .filter(media => media.s3Key)
        .map(media => media.s3Key!);

      // Delete from S3 in batch
      let s3KeysDeleted: string[] = [];
      if (s3Keys.length > 0) {
        try {
          const s3Result = await S3Service.deleteFiles(s3Keys);
          s3KeysDeleted = s3Result.deleted;
          
          // Log S3 errors but don't fail the operation
          if (s3Result.errors.length > 0) {
            console.warn('S3 deletion errors:', s3Result.errors);
          }
        } catch (s3Error) {
          console.warn('S3 batch deletion failed:', s3Error.message);
        }
      }

      // Delete from database
      const dbResult = await Media.deleteMany({
        _id: { $in: mediaIds },
        uploadedBy: uploaderId
      });

      return {
        deleted: dbResult.deletedCount || 0,
        errors: [],
        s3KeysDeleted
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to bulk delete media: ${error.message}`, 500, 'BULK_DELETE_ERROR');
    }
  }

  /**
   * Search media by filename or tags
   */
  async searchMedia(
    uploaderId: string,
    query: string,
    options: MediaListOptions = {}
  ): Promise<{
    media: IMedia[];
    total: number;
  }> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!query?.trim()) {
        throw new MediaError('Search query is required', 400, 'MISSING_QUERY');
      }
      if (query.length < 2) {
        throw new MediaError('Search query must be at least 2 characters', 400, 'QUERY_TOO_SHORT');
      }
      if (query.length > 100) {
        throw new MediaError('Search query too long (max 100 characters)', 400, 'QUERY_TOO_LONG');
      }

      const filter: any = {
        uploadedBy: uploaderId,
        $or: [
          { originalName: { $regex: query, $options: 'i' } },
          { filename: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;

      const [media, total] = await Promise.all([
        Media.find(filter).sort({ createdAt: -1 }).limit(50).exec(),
        Media.countDocuments(filter)
      ]);

      return { media, total };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to search media: ${error.message}`, 500, 'SEARCH_ERROR');
    }
  }

  /**
   * Get recently uploaded media
   */
  async getRecentMedia(uploaderId: string, limit: number = 10): Promise<IMedia[]> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (limit <= 0 || limit > 100) {
        throw new MediaError('Limit must be between 1 and 100', 400, 'INVALID_LIMIT');
      }

      return await Media.find({ uploadedBy: uploaderId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get recent media: ${error.message}`, 500, 'RECENT_ERROR');
    }
  }

  /**
   * Clean up orphaned files - S3 version
   */
  async cleanupOrphanedFiles(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // Get all media records from database
      const allMedia = await Media.find({}, 'uploadedBy s3Key').lean();
      const dbS3Keys = new Set(allMedia.map(media => media.s3Key).filter(Boolean));

      // Group by business ID for efficient S3 listing
      const businessIds = [...new Set(allMedia.map(media => media.uploadedBy))];

      for (const businessId of businessIds) {
        try {
          // List all files in S3 for this business
          const s3Result = await S3Service.listFiles({ 
            prefix: `${businessId}/`,
            maxKeys: 1000 
          });

          // Find S3 files not in database
          const orphanedS3Keys = s3Result.files
            .map(file => file.key)
            .filter(key => !dbS3Keys.has(key));

          if (orphanedS3Keys.length > 0) {
            // Delete orphaned files from S3
            const deleteResult = await S3Service.deleteFiles(orphanedS3Keys);
            cleaned += deleteResult.deleted.length;
            
            // Add any deletion errors
            errors.push(...deleteResult.errors.map(err => err.error));
          }
        } catch (error: any) {
          errors.push(`Failed to cleanup files for business ${businessId}: ${error.message}`);
        }
      }

      // Also check for database records without corresponding S3 files
      const orphanedDbRecords = await Media.find({
        s3Key: { $exists: true, $ne: null }
      });

      for (const record of orphanedDbRecords) {
        if (record.s3Key) {
          try {
            const exists = await S3Service.fileExists(record.s3Key);
            if (!exists) {
              // Remove database record for non-existent S3 file
              await Media.findByIdAndDelete(record._id);
              cleaned++;
            }
          } catch (error: any) {
            errors.push(`Failed to check S3 file ${record.s3Key}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      errors.push(`Failed to cleanup orphaned files: ${error.message}`);
    }

    return { cleaned, errors };
  }

  /**
   * Migrate existing local files to S3
   */
  async migrateLocalFilesToS3(uploaderId?: string): Promise<{
    migrated: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;
    let failed = 0;

    try {
      // Find media records that don't have S3 keys (local files)
      const filter: any = {
        $or: [
          { s3Key: { $exists: false } },
          { s3Key: null },
          { s3Key: '' }
        ]
      };

      if (uploaderId) {
        filter.uploadedBy = uploaderId;
      }

      const localMedia = await Media.find(filter);

      for (const media of localMedia) {
        try {
          // Construct local file path
          const localPath = path.join(
            process.env.UPLOAD_DIR || 'uploads',
            media.url.replace('/uploads/', '')
          );

          // Check if local file exists
          const fs = require('fs').promises;
          let fileBuffer: Buffer;
          
          try {
            fileBuffer = await fs.readFile(localPath);
          } catch (readError) {
            errors.push(`Local file not found: ${localPath}`);
            failed++;
            continue;
          }

          // Generate S3 key
          const s3Key = S3Service.buildS3Key(
            media.uploadedBy.toString(),
            media.resourceId,
            media.filename
          );

          // Upload to S3
          const s3Result = await S3Service.uploadFile(fileBuffer, {
            businessId: media.uploadedBy.toString(),
            resourceId: media.resourceId,
            filename: media.filename,
            mimeType: media.mimeType,
            isPublic: media.isPublic || false,
            metadata: {
              originalName: media.originalName,
              category: media.category,
              migratedFrom: 'local',
              migrationDate: new Date().toISOString()
            }
          });

          // Update database record with S3 information
          await Media.findByIdAndUpdate(media._id, {
            url: s3Result.url,
            s3Key: s3Result.key,
            s3Bucket: s3Result.bucket,
            s3ETag: s3Result.etag,
            'metadata.storageProvider': 's3',
            'metadata.migratedAt': new Date(),
            'metadata.s3Location': s3Result.location
          });

          // Optionally delete local file after successful migration
          try {
            await fs.unlink(localPath);
          } catch (unlinkError) {
            // Log but don't fail migration
            console.warn(`Could not delete local file ${localPath}:`, unlinkError.message);
          }

          migrated++;
        } catch (error: any) {
          errors.push(`Failed to migrate ${media.filename}: ${error.message}`);
          failed++;
        }
      }
    } catch (error: any) {
      errors.push(`Migration process failed: ${error.message}`);
    }

    return { migrated, failed, errors };
  }

  /**
   * Get media statistics for a user (legacy method - kept for compatibility)
   */
  async getMediaStats(uploaderId: string): Promise<MediaStats> {
    return this.getStorageStatistics(uploaderId);
  }

  /**
   * Generate presigned URLs for direct S3 uploads
   */
  async generateUploadUrl(
    uploaderId: string,
    filename: string,
    mimeType: string,
    options: {
      resourceId?: string;
      expiresIn?: number;
    } = {}
  ): Promise<{
    uploadUrl: string;
    s3Key: string;
    formData?: Record<string, string>;
  }> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400, 'MISSING_UPLOADER_ID');
      }
      if (!filename?.trim()) {
        throw new MediaError('Filename is required', 400, 'MISSING_FILENAME');
      }
      if (!mimeType?.trim()) {
        throw new MediaError('MIME type is required', 400, 'MISSING_MIME_TYPE');
      }

      const secureFilename = S3Service.generateSecureFilename(filename);
      const s3Key = S3Service.buildS3Key(uploaderId, options.resourceId, secureFilename);
      
      const uploadUrl = await S3Service.getSignedUrl(
        s3Key,
        'putObject',
        options.expiresIn || 3600
      );

      return {
        uploadUrl,
        s3Key,
        formData: {
          'Content-Type': mimeType,
          'x-amz-meta-original-name': filename,
          'x-amz-meta-uploaded-by': uploaderId,
          'x-amz-meta-upload-timestamp': new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new MediaError(`Failed to generate upload URL: ${error.message}`, 500, 'UPLOAD_URL_ERROR');
    }
  }

  /**
   * Determine media type from MIME type
   */
  private determineMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'document' {
    if (!mimeType) return 'document';
    
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Invalid size';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file upload constraints
   */
  validateFileUpload(
    file: Express.Multer.File,
    options: MediaUploadOptions = {}
  ): { valid: boolean; error?: string } {
    try {
      if (!file) {
        return { valid: false, error: 'No file provided' };
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        };
      }

      // Check file size
      if (options.maxFileSize && file.size > options.maxFileSize) {
        return {
          valid: false,
          error: `File size ${this.formatFileSize(file.size)} exceeds limit of ${this.formatFileSize(options.maxFileSize)}`
        };
      }

      // Check if file is empty
      if (file.size <= 0) {
        return { valid: false, error: 'File appears to be empty' };
      }

      // Check filename
      if (!file.filename || !file.originalname) {
        return { valid: false, error: 'File must have a valid filename' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `File validation error: ${error.message}` };
    }
  }

  /**
   * Get S3 storage health check
   */
  async getStorageHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    s3Available: boolean;
    latency?: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let s3Available = false;
    let latency: number | undefined;

    try {
      const startTime = Date.now();
      const validation = await S3Service.validateConfiguration();
      latency = Date.now() - startTime;

      s3Available = validation.configured && validation.canConnect && validation.bucketExists;
      
      if (validation.errors.length > 0) {
        errors.push(...validation.errors);
      }

      const status = s3Available && errors.length === 0 ? 'healthy' : 
                    s3Available ? 'degraded' : 'unhealthy';

      return {
        status,
        s3Available,
        latency,
        errors
      };
    } catch (error: any) {
      errors.push(`Storage health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        s3Available: false,
        errors
      };
    }
  }
}