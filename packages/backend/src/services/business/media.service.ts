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
    if (!file) {
      throw { statusCode: 400, message: 'No file provided' };
    }

    // Validate file type if restrictions exist
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw { statusCode: 400, message: `File type ${file.mimetype} not allowed` };
    }

    // Validate file size if restriction exists
    if (options.maxFileSize && file.size > options.maxFileSize) {
      throw { statusCode: 400, message: `File size exceeds limit of ${options.maxFileSize} bytes` };
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

    return media.save();
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
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 200 ? options.limit : 50;

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
  }

  /**
   * Get media by ID with ownership verification
   */
  async getMediaById(mediaId: string, uploaderId?: string): Promise<IMedia> {
    const filter: any = { _id: mediaId };
    if (uploaderId) {
      filter.uploadedBy = uploaderId;
    }

    const media = await Media.findOne(filter);
    if (!media) {
      throw { statusCode: 404, message: 'Media not found' };
    }

    return media;
  }

  /**
   * Delete media file and database record
   */
  async deleteMedia(mediaId: string, uploaderId: string): Promise<void> {
    const media = await this.getMediaById(mediaId, uploaderId);
    
    try {
      // Delete physical file
      const filePath = path.join(UPLOAD_DIR, path.basename(media.url));
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Could not delete file ${media.url}:`, error);
    }

    // Delete database record
    await Media.findByIdAndDelete(mediaId);
  }

  /**
   * Get media statistics for a user
   */
  async getMediaStats(uploaderId: string): Promise<MediaStats> {
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
    const media = await Media.findOneAndUpdate(
      { _id: mediaId, uploadedBy: uploaderId },
      updates,
      { new: true }
    );

    if (!media) {
      throw { statusCode: 404, message: 'Media not found' };
    }

    return media;
  }

  /**
   * Get media by category
   */
  async getMediaByCategory(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<IMedia[]> {
    return Media.find({
      uploadedBy: uploaderId,
      category
    }).sort({ createdAt: -1 });
  }

  /**
   * Bulk delete media files
   */
  async bulkDeleteMedia(mediaIds: string[], uploaderId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const mediaId of mediaIds) {
      try {
        await this.deleteMedia(mediaId, uploaderId);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete ${mediaId}: ${error.message}`);
      }
    }

    return { deleted, errors };
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
  }

  /**
   * Get recently uploaded media
   */
  async getRecentMedia(uploaderId: string, limit: number = 10): Promise<IMedia[]> {
    return Media.find({ uploadedBy: uploaderId })
      .sort({ createdAt: -1 })
      .limit(limit);
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
      const files = await fs.readdir(uploadDir);
      
      for (const file of files) {
        const fileUrl = `${UPLOAD_URL_PREFIX}/${file}`;
        const mediaRecord = await Media.findOne({ url: fileUrl });
        
        if (!mediaRecord) {
          try {
            await fs.unlink(path.join(uploadDir, file));
            cleaned++;
          } catch (error) {
            errors.push(`Failed to delete orphaned file ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to read upload directory: ${error.message}`);
    }

    return { cleaned, errors };
  }

  /**
   * Determine media type from MIME type
   */
  private determineMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'document' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
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

    return { valid: true };
  }
}