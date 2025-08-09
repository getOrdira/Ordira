// src/services/business/media.service.ts

import path from 'path';
import fs from 'fs/promises';
import { Media, IMedia } from '../../models/media.model';

const UPLOAD_URL_PREFIX = process.env.UPLOAD_URL_PREFIX || '/uploads';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

export interface MediaUploadOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  compress?: boolean;
}

export interface MediaListOptions {
  page?: number;
  limit?: number;
  type?: 'image' | 'video' | 'gif' | 'document';
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  sortBy?: 'createdAt' | 'filename' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  storageUsed: string;
}

/**
 * Custom error class for media operations with status codes
 */
class MediaError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'MediaError';
    this.statusCode = statusCode;
  }
}

/**
 * Enhanced media management service for brands and manufacturers
 */
export class MediaService {

  /**
   * Save an uploaded media file record with enhanced metadata
   */
  async saveMedia(
    file: Express.Multer.File | undefined,
    uploaderId: string,
    options: MediaUploadOptions = {}
  ): Promise<IMedia> {
    try {
      // Validate inputs
      if (!file) {
        throw new MediaError('No file provided', 400);
      }

      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }

      // Validate file type if restrictions exist
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        throw new MediaError(
          `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
          400
        );
      }

      // Validate file size if restriction exists
      if (options.maxFileSize && file.size > options.maxFileSize) {
        throw new MediaError(
          `File size ${this.formatFileSize(file.size)} exceeds limit of ${this.formatFileSize(options.maxFileSize)}`,
          400
        );
      }

      // Additional file validations
      if (!file.filename) {
        throw new MediaError('File must have a filename', 400);
      }

      if (file.size <= 0) {
        throw new MediaError('File appears to be empty', 400);
      }

      // Determine type from MIME
      const mime = file.mimetype;
      const type = this.determineMediaType(mime);

      // Build a URL. If you later host on S3/Cloudfront, just change UPLOAD_URL_PREFIX
      const url = `${UPLOAD_URL_PREFIX}/${file.filename}`;

      const media = new Media({
        url,
        type,
        uploadedBy: uploaderId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: options.category || 'product'
      });

      return await media.save();
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new MediaError(`Validation failed: ${validationErrors.join(', ')}`, 400);
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        throw new MediaError('Media file already exists', 409);
      }

      throw new MediaError(`Failed to save media: ${error.message}`, 500);
    }
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
        throw new MediaError('Uploader ID is required', 400);
      }

      const page = options.page && options.page > 0 ? options.page : 1;
      const limit = options.limit && options.limit > 0 && options.limit <= 200 ? options.limit : 50;

      // Validate pagination parameters
      if (page > 10000) {
        throw new MediaError('Page number too large', 400);
      }

      // Build filter
      const filter: Record<string, any> = { uploadedBy: uploaderId };
      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;

      // Build sort - fix TypeScript error by using string format
      const sortField = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      const sortQuery = `${sortOrder === 1 ? '' : '-'}${sortField}`;

      const [media, total] = await Promise.all([
        Media
          .find(filter)
          .sort(sortQuery)
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(), // Use .exec() instead of .lean() to get proper IMedia types
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
        throw new MediaError('Database error while fetching media', 503);
      }

      throw new MediaError(`Failed to list media: ${error.message}`, 500);
    }
  }

  /**
   * Get media by ID with ownership verification
   */
  async getMediaById(mediaId: string, uploaderId?: string): Promise<IMedia> {
    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400);
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
        throw new MediaError('Invalid media ID format', 400);
      }

      const filter: any = { _id: mediaId };
      if (uploaderId) {
        if (!uploaderId.trim()) {
          throw new MediaError('Uploader ID cannot be empty', 400);
        }
        filter.uploadedBy = uploaderId;
      }

      const media = await Media.findOne(filter);
      if (!media) {
        throw new MediaError('Media not found', 404);
      }

      return media;
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        throw new MediaError('Invalid media ID format', 400);
      }

      throw new MediaError(`Failed to get media: ${error.message}`, 500);
    }
  }

  /**
   * Delete media file and database record
   */
  async deleteMedia(mediaId: string, uploaderId: string): Promise<void> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }

      const media = await this.getMediaById(mediaId, uploaderId);
      
      try {
        // Delete physical file
        const filePath = path.join(UPLOAD_DIR, path.basename(media.url));
        await fs.unlink(filePath);
      } catch (error: any) {
        // Log warning but don't fail the operation if file doesn't exist
        console.warn(`Could not delete file ${media.url}:`, error.message);
      }

      // Delete database record
      const deletedMedia = await Media.findByIdAndDelete(mediaId);
      if (!deletedMedia) {
        throw new MediaError('Media not found or already deleted', 404);
      }
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to delete media: ${error.message}`, 500);
    }
  }

  /**
   * Get media statistics for a user
   */
  async getMediaStats(uploaderId: string): Promise<MediaStats> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }

      const [stats, typeStats, categoryStats] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' }
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
        ])
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;

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
        storageUsed: this.formatFileSize(totalSize)
      };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle aggregation errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new MediaError('Database error while calculating media statistics', 503);
      }

      throw new MediaError(`Failed to get media stats: ${error.message}`, 500);
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
    }
  ): Promise<IMedia> {
    try {
      if (!mediaId?.trim()) {
        throw new MediaError('Media ID is required', 400);
      }
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
        throw new MediaError('Invalid media ID format', 400);
      }

      // Validate updates object
      if (!updates || Object.keys(updates).length === 0) {
        throw new MediaError('No updates provided', 400);
      }

      // Validate tags if provided
      if (updates.tags) {
        if (!Array.isArray(updates.tags)) {
          throw new MediaError('Tags must be an array', 400);
        }
        if (updates.tags.length > 20) {
          throw new MediaError('Maximum 20 tags allowed', 400);
        }
      }

      const media = await Media.findOneAndUpdate(
        { _id: mediaId, uploadedBy: uploaderId },
        updates,
        { new: true }
      );

      if (!media) {
        throw new MediaError('Media not found or access denied', 404);
      }

      return media;
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new MediaError(`Validation failed: ${validationErrors.join(', ')}`, 400);
      }

      throw new MediaError(`Failed to update media metadata: ${error.message}`, 500);
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
        throw new MediaError('Uploader ID is required', 400);
      }
      if (!category?.trim()) {
        throw new MediaError('Category is required', 400);
      }

      const validCategories = ['profile', 'product', 'banner', 'certificate', 'document'];
      if (!validCategories.includes(category)) {
        throw new MediaError(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
      }

      return await Media.find({
        uploadedBy: uploaderId,
        category
      }).sort({ createdAt: -1 });
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get media by category: ${error.message}`, 500);
    }
  }

  /**
   * Bulk delete media files
   */
  async bulkDeleteMedia(mediaIds: string[], uploaderId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }
      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new MediaError('Media IDs array is required and cannot be empty', 400);
      }
      if (mediaIds.length > 100) {
        throw new MediaError('Maximum 100 files can be deleted at once', 400);
      }

      // Validate all media IDs format
      for (const mediaId of mediaIds) {
        if (!/^[0-9a-fA-F]{24}$/.test(mediaId)) {
          throw new MediaError(`Invalid media ID format: ${mediaId}`, 400);
        }
      }

      const errors: string[] = [];
      let deleted = 0;

      for (const mediaId of mediaIds) {
        try {
          await this.deleteMedia(mediaId, uploaderId);
          deleted++;
        } catch (error: any) {
          errors.push(`Failed to delete ${mediaId}: ${error.message}`);
        }
      }

      return { deleted, errors };
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to bulk delete media: ${error.message}`, 500);
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
        throw new MediaError('Uploader ID is required', 400);
      }
      if (!query?.trim()) {
        throw new MediaError('Search query is required', 400);
      }
      if (query.length < 2) {
        throw new MediaError('Search query must be at least 2 characters', 400);
      }
      if (query.length > 100) {
        throw new MediaError('Search query too long (max 100 characters)', 400);
      }

      const filter: any = {
        uploadedBy: uploaderId,
        $or: [
          { originalName: { $regex: query, $options: 'i' } },
          { filename: { $regex: query, $options: 'i' } },
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

      throw new MediaError(`Failed to search media: ${error.message}`, 500);
    }
  }

  /**
   * Get recently uploaded media
   */
  async getRecentMedia(uploaderId: string, limit: number = 10): Promise<IMedia[]> {
    try {
      if (!uploaderId?.trim()) {
        throw new MediaError('Uploader ID is required', 400);
      }
      if (limit <= 0 || limit > 100) {
        throw new MediaError('Limit must be between 1 and 100', 400);
      }

      return await Media.find({ uploadedBy: uploaderId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }

      throw new MediaError(`Failed to get recent media: ${error.message}`, 500);
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    // This would be used in a cleanup job
    const errors: string[] = [];
    let cleaned = 0;

    try {
      const uploadDir = path.resolve(UPLOAD_DIR);
      
      // Check if upload directory exists
      try {
        await fs.access(uploadDir);
      } catch {
        throw new MediaError(`Upload directory does not exist: ${uploadDir}`, 500);
      }

      const files = await fs.readdir(uploadDir);
      
      for (const file of files) {
        try {
          const fileUrl = `${UPLOAD_URL_PREFIX}/${file}`;
          const mediaRecord = await Media.findOne({ url: fileUrl });
          
          if (!mediaRecord) {
            await fs.unlink(path.join(uploadDir, file));
            cleaned++;
          }
        } catch (error: any) {
          errors.push(`Failed to process file ${file}: ${error.message}`);
        }
      }
    } catch (error: any) {
      if (error instanceof MediaError) {
        throw error;
      }
      
      throw new MediaError(`Failed to cleanup orphaned files: ${error.message}`, 500);
    }

    return { cleaned, errors };
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
}