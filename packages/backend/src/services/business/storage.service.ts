// src/services/business/storage.service.ts

import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Media, IMedia } from '../../models/media.model';
import { Types } from 'mongoose';
import { UtilsService } from '../utils/utils.service';
import { S3Service } from '../external/s3.service';

// Environment-based storage configuration
const getUseS3 = () => process.env.STORAGE_PROVIDER === 's3' && !!process.env.AWS_S3_BUCKET;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Export for testing
export { getUseS3 };

export interface StorageUploadOptions {
  businessId: string;
  resourceId?: string;
  category?: 'profile' | 'product' | 'banner' | 'certificate' | 'document' | 'metadata';
  metadata?: Record<string, any>;
  maxFileSize?: number;
  allowedTypes?: string[];
  isPublic?: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  storageUsed: string;
  storageQuota?: string;
  quotaUsagePercentage?: number;
  byBusinessId: Record<string, number>;
  byFileType: Record<string, number>;
  byCategory: Record<string, number>;
  averageFileSize: string;
  largestFile: {
    filename: string;
    size: string;
    uploadDate: Date;
  } | null;
  storageProvider: 'local' | 's3';
}

export interface FileInfo {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  businessId: string;
  resourceId?: string;
  category: string;
  metadata?: Record<string, any>;
  type: 'image' | 'video' | 'gif' | 'document';
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  description?: string;
  isPublic?: boolean;
  downloadCount?: number;
  sizeFormatted?: string;
  slug?: string;
  checksum?: string;
  s3Key?: string; // For S3 storage
}

/**
 * Enhanced storage service supporting both local and S3 storage
 */
export class StorageService {

  // Private validation methods
  private validateBusinessId(businessId: string): void {
    if (!businessId || typeof businessId !== 'string' || businessId.trim().length === 0) {
      throw { statusCode: 400, message: 'Valid business ID is required' };
    }
  }

  private validateUploadOptions(options: StorageUploadOptions): void {
    this.validateBusinessId(options.businessId);

    if (options.category && !['profile', 'product', 'banner', 'certificate', 'document', 'metadata'].includes(options.category)) {
      throw { statusCode: 400, message: 'Invalid category specified' };
    }

    if (options.maxFileSize && options.maxFileSize <= 0) {
      throw { statusCode: 400, message: 'Max file size must be positive' };
    }
  }

  private generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const slug = UtilsService.generateSlug(baseName);
    const uniqueId = uuidv4().split('-')[0];
    return `${slug}-${uniqueId}${ext}`;
  }

  private async calculateFileChecksum(buffer: Buffer): Promise<string> {
    try {
      const crypto = await import('crypto');
      return crypto.createHash('md5').update(buffer).digest('hex');
    } catch (error) {
      logger.warn('Could not calculate file checksum:', error);
      return '';
    }
  }

  private logStorageEvent(event: string, businessId: string, filename: string, success: boolean, provider?: string): void {
    const maskedBusinessId = businessId.substring(0, 8) + '***';
    const storageInfo = provider ? ` [${provider.toUpperCase()}]` : '';
    logger.info(`[STORAGE]${storageInfo} ${event} - Business: ${maskedBusinessId} - File: ${filename} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private determineMediaType(mimeType: string): 'image' | 'video' | 'gif' | 'document' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
  }

  private validateFile(file: Express.Multer.File, options: StorageUploadOptions): void {
    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw {
        statusCode: 400,
        message: `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (options.maxFileSize && file.size > options.maxFileSize) {
      throw {
        statusCode: 400,
        message: `File size ${UtilsService.formatFileSize(file.size)} exceeds limit of ${UtilsService.formatFileSize(options.maxFileSize)}`
      };
    }

    // Validate filename for security
    const filename = file.originalname;
    if (!filename || filename.length === 0) {
      throw { statusCode: 400, message: 'Invalid filename' };
    }

    // Check for dangerous extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
    const extension = path.extname(filename).toLowerCase();
    if (dangerousExtensions.includes(extension)) {
      throw { statusCode: 400, message: `File type ${extension} is not allowed for security reasons` };
    }

    // Check filename length
    if (filename.length > 255) {
      throw { statusCode: 400, message: 'Filename is too long (maximum 255 characters)' };
    }

    // Validate safe characters
    if (!UtilsService.containsOnlyAllowedChars(filename, 'a-zA-Z0-9\\s\\-_\\.\\(\\)')) {
      logger.warn('Filename contains special characters that will be sanitized: ${filename}');
    }
  }

  private buildFilePath(businessId: string, resourceId?: string): string {
    const basePath = path.resolve(__dirname, '../../', UPLOAD_DIR, businessId);
    return resourceId ? path.join(basePath, resourceId) : basePath;
  }

  private mapToFileInfo(media: IMedia, additionalData?: { slug?: string; checksum?: string }): FileInfo {
    return {
      id: media._id.toString(),
      url: media.url,
      filename: media.filename,
      originalName: media.originalName,
      size: media.size,
      mimeType: media.mimeType,
      businessId: media.uploadedBy.toString(),
      resourceId: media.resourceId,
      category: media.category,
      metadata: media.metadata || {},
      type: media.type,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      tags: media.tags,
      description: media.description,
      isPublic: media.isPublic,
      downloadCount: media.downloadCount,
      sizeFormatted: UtilsService.formatFileSize(media.size),
      slug: additionalData?.slug || UtilsService.generateSlug(path.basename(media.originalName, path.extname(media.originalName))),
      checksum: additionalData?.checksum || media.metadata?.checksum,
      s3Key: media.metadata?.s3Key // Include S3 key if available
    };
  }

  private async getAllFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...await this.getAllFilesRecursively(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn('Could not read directory ${dir}:', error);
    }

    return files;
  }

  // Public methods

  /**
   * Upload a file with enhanced validation and S3/local storage support
   */
  async uploadFile(file: Express.Multer.File, options: StorageUploadOptions): Promise<FileInfo> {
    if (!file) {
      throw { statusCode: 400, message: 'No file provided' };
    }

    this.validateUploadOptions(options);
    this.validateFile(file, options);

    const { businessId, resourceId, category = 'document', metadata, isPublic = false } = options;
    const secureFilename = this.generateSecureFilename(file.originalname);

    try {
      let fileUrl: string;
      let fileBuffer: Buffer;
      let checksum: string;
      let s3Key: string | undefined;

      // Read file buffer for processing
      fileBuffer = await fs.readFile(file.path);
      checksum = await this.calculateFileChecksum(fileBuffer);

      if (getUseS3()) {
        // Upload to S3
        s3Key = S3Service.buildS3Key(businessId, resourceId, secureFilename);
        
        const uploadResult = await S3Service.uploadFile(fileBuffer, {
          businessId,
          resourceId,
          filename: secureFilename,
          mimeType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            checksum,
            ...metadata
          },
          isPublic
        });

        fileUrl = uploadResult.url;
        this.logStorageEvent('FILE_UPLOAD', businessId, secureFilename, true, 's3');
      } else {
        // Upload to local filesystem
        const targetDir = this.buildFilePath(businessId, resourceId);
        await this.ensureDirectoryExists(targetDir);
        const filePath = path.join(targetDir, secureFilename);
        
        await fs.rename(file.path, filePath);
        
        fileUrl = resourceId 
          ? `/uploads/${businessId}/${resourceId}/${secureFilename}`
          : `/uploads/${businessId}/${secureFilename}`;
        
        this.logStorageEvent('FILE_UPLOAD', businessId, secureFilename, true, 'local');
      }

      // Clean up temporary file
      try {
        await fs.unlink(file.path);
      } catch {}

      const slug = UtilsService.generateSlug(path.basename(file.originalname, path.extname(file.originalname)));

      const mediaRecord = new Media({
        url: fileUrl,
        type: this.determineMediaType(file.mimetype),
        uploadedBy: businessId,
        filename: secureFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category,
        resourceId,
        s3Key: getUseS3() ? s3Key : undefined,
        s3Bucket: getUseS3() ? process.env.AWS_S3_BUCKET : undefined,
        metadata: UtilsService.cleanObject({
          ...metadata,
          uploadTimestamp: new Date().toISOString(),
          checksum,
          s3Key,
          storageProvider: getUseS3() ? 's3' : 'local'
        }),
        isActive: true,
        isProcessed: true,
        isPublic
      });

      const savedMedia = await mediaRecord.save();
      return this.mapToFileInfo(savedMedia, { slug, checksum });

    } catch (error) {
      this.logStorageEvent('FILE_UPLOAD', businessId, file.originalname, false, getUseS3() ? 's3' : 'local');
      
      // Clean up temporary file on error
      try {
        await fs.unlink(file.path);
      } catch {}
      
      throw { statusCode: 500, message: `File upload failed: ${error.message}` };
    }
  }

  /**
   * Upload JSON metadata with S3/local storage support
   */
  async uploadJsonMetadata(
    businessId: string,
    resourceId: string,
    metadata: Record<string, any>,
    options: { category?: string; filename?: string; isPublic?: boolean } = {}
  ): Promise<string> {
    this.validateBusinessId(businessId);

    if (!resourceId || typeof resourceId !== 'string') {
      throw { statusCode: 400, message: 'Valid resource ID is required' };
    }

    if (!metadata || typeof metadata !== 'object') {
      throw { statusCode: 400, message: 'Valid metadata object is required' };
    }

    const cleanedMetadata = UtilsService.cleanObject({
      ...metadata,
      uploadedAt: new Date().toISOString(),
      version: metadata.version || '1.0',
      businessId,
      resourceId
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = options.filename || `metadata-${timestamp}`;
    const fileName = `${UtilsService.generateSlug(baseFileName)}-${uuidv4().split('-')[0]}.json`;
    const jsonContent = JSON.stringify(cleanedMetadata, null, 2);
    const jsonBuffer = Buffer.from(jsonContent, 'utf8');
    
    try {
      let fileUrl: string;
      let s3Key: string | undefined;

      if (getUseS3()) {
        // Upload to S3
        s3Key = S3Service.buildS3Key(businessId, resourceId, fileName);
        
        const uploadResult = await S3Service.uploadFile(jsonBuffer, {
          businessId,
          resourceId,
          filename: fileName,
          mimeType: 'application/json',
          metadata: {
            type: 'metadata',
            version: cleanedMetadata.version
          },
          isPublic: options.isPublic || false
        });

        fileUrl = uploadResult.url;
      } else {
        // Upload to local filesystem
        const targetDir = this.buildFilePath(businessId, resourceId);
        await this.ensureDirectoryExists(targetDir);
        const filePath = path.join(targetDir, fileName);
        
        await fs.writeFile(filePath, jsonContent, 'utf-8');
        fileUrl = `/uploads/${businessId}/${resourceId}/${fileName}`;
      }

      const checksum = await this.calculateFileChecksum(jsonBuffer);

      const mediaRecord = new Media({
        url: fileUrl,
        type: 'document',
        uploadedBy: businessId,
        filename: fileName,
        originalName: fileName,
        mimeType: 'application/json',
        size: jsonBuffer.length,
        category: options.category || 'metadata',
        resourceId,
        s3Key: getUseS3() ? s3Key : undefined,
        s3Bucket: getUseS3() ? process.env.AWS_S3_BUCKET : undefined,
        metadata: {
          ...cleanedMetadata,
          checksum,
          s3Key,
          storageProvider: getUseS3() ? 's3' : 'local'
        },
        isActive: true,
        isProcessed: true,
        isPublic: options.isPublic || false
      });

      await mediaRecord.save();

      this.logStorageEvent('JSON_UPLOAD', businessId, fileName, true, getUseS3() ? 's3' : 'local');

      return fileUrl;

    } catch (error) {
      this.logStorageEvent('JSON_UPLOAD', businessId, fileName, false, getUseS3() ? 's3' : 'local');
      throw { statusCode: 500, message: `JSON upload failed: ${error.message}` };
    }
  }

  /**
   * Delete file with S3/local cleanup
   */
  async deleteFile(fileId: string, businessId: string): Promise<void> {
    this.validateBusinessId(businessId);

    const media = await Media.findOne({
      _id: fileId,
      uploadedBy: businessId,
      isActive: true
    });

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    try {
      const s3Key = media.metadata?.s3Key;
      
      if (s3Key && getUseS3()) {
        // Delete from S3
        await S3Service.deleteFile(s3Key);
      } else {
        // Delete from local filesystem
        const fullPath = path.resolve(UPLOAD_DIR, media.url.replace('/uploads/', ''));
        await fs.unlink(fullPath);
      }
    } catch (error) {
      logger.warn('Could not delete file ${media.url}:', error);
    }

    await media.updateOne({ isActive: false, deletedAt: new Date() });

    this.logStorageEvent('FILE_DELETE', businessId, media.filename, true, getUseS3() ? 's3' : 'local');
  }

  /**
   * Get storage statistics with S3 support
   */
  async getStorageStats(businessId: string): Promise<StorageStats> {
    this.validateBusinessId(businessId);

    let s3Stats = null;
    if (getUseS3()) {
      try {
        s3Stats = await S3Service.getStorageStats(businessId);
      } catch (error) {
        logger.warn('Could not get S3 storage stats:', error);
      }
    }

    const [businessStats, typeStats, categoryStats, largestFile] = await Promise.all([
      Media.aggregate([
        { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$size' },
            avgSize: { $avg: '$size' }
          }
        }
      ]),
      Media.aggregate([
        { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
        { 
          $group: { 
            _id: '$type', 
            count: { $sum: 1 },
            size: { $sum: '$size' }
          } 
        }
      ]),
      Media.aggregate([
        { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
        { 
          $group: { 
            _id: '$category', 
            count: { $sum: 1 },
            size: { $sum: '$size' }
          } 
        }
      ]),
      Media.findOne({ uploadedBy: businessId, isActive: true })
        .sort({ size: -1 })
        .select('filename size createdAt')
    ]);

    const totalFiles = s3Stats?.totalFiles || businessStats[0]?.totalFiles || 0;
    const totalSize = s3Stats?.totalSize || businessStats[0]?.totalSize || 0;
    const avgSize = businessStats[0]?.avgSize || 0;

    const byFileType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byFileType[stat._id || 'unknown'] = stat.count;
    });

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      byCategory[stat._id || 'unknown'] = stat.count;
    });

    const storageQuotaBytes = 5 * 1024 * 1024 * 1024; // 5GB default
    const quotaUsagePercentage = Math.round((totalSize / storageQuotaBytes) * 100);

    return {
      totalFiles,
      totalSize,
      storageUsed: s3Stats?.sizeFormatted || UtilsService.formatFileSize(totalSize),
      storageQuota: UtilsService.formatFileSize(storageQuotaBytes),
      quotaUsagePercentage,
      byBusinessId: { [businessId]: totalFiles },
      byFileType,
      byCategory,
      averageFileSize: UtilsService.formatFileSize(avgSize),
      largestFile: largestFile ? {
        filename: largestFile.filename,
        size: UtilsService.formatFileSize(largestFile.size),
        uploadDate: largestFile.createdAt
      } : null,
      storageProvider: getUseS3() ? 's3' : 'local'
    };
  }

  /**
   * Get files with filtering options
   */
  async getFiles(
    businessId: string,
    resourceId?: string,
    options: {
      category?: string;
      type?: 'image' | 'video' | 'document' | 'gif';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: FileInfo[]; total: number }> {
    this.validateBusinessId(businessId);

    const filter: any = { uploadedBy: businessId, isActive: true };
    if (resourceId) filter.resourceId = resourceId;
    if (options.category) filter.category = options.category;
    if (options.type) filter.type = options.type;

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [files, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      Media.countDocuments(filter)
    ]);

    return {
      files: files.map(file => this.mapToFileInfo(file)),
      total
    };
  }

  /**
   * Get file by ID with ownership verification
   */
  async getFileById(fileId: string, businessId: string): Promise<FileInfo> {
    this.validateBusinessId(businessId);

    const media = await Media.findOne({
      _id: fileId,
      uploadedBy: businessId,
      isActive: true
    });

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    await media.updateOne({ lastAccessedAt: new Date() });

    return this.mapToFileInfo(media);
  }

  /**
   * Generate signed URL for direct S3 access (S3 only)
   */
  async getSignedUrl(fileId: string, businessId: string, expiresIn: number = 3600): Promise<string> {
    this.validateBusinessId(businessId);

    if (!getUseS3()) {
      throw { statusCode: 400, message: 'Signed URLs only available with S3 storage' };
    }

    const media = await Media.findOne({
      _id: fileId,
      uploadedBy: businessId,
      isActive: true
    });

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    const s3Key = media.metadata?.s3Key;
    if (!s3Key) {
      throw { statusCode: 400, message: 'File not stored in S3' };
    }

    return await S3Service.getSignedUrl(s3Key, 'getObject', expiresIn);
  }

  /**
   * Search files with advanced options
   */
  async searchFiles(
    businessId: string,
    searchTerm: string,
    options: {
      type?: 'image' | 'video' | 'document' | 'gif';
      category?: string;
      limit?: number;
    } = {}
  ): Promise<{ files: FileInfo[]; total: number }> {
    this.validateBusinessId(businessId);

    const filter: any = {
      uploadedBy: businessId,
      isActive: true,
      $or: [
        { originalName: { $regex: searchTerm, $options: 'i' } },
        { filename: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    };

    if (options.type) filter.type = options.type;
    if (options.category) filter.category = options.category;

    const limit = options.limit || 50;

    const [files, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec(),
      Media.countDocuments(filter)
    ]);

    return {
      files: files.map(file => this.mapToFileInfo(file)),
      total
    };
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    businessId: string,
    updates: {
      category?: string;
      metadata?: Record<string, any>;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    }
  ): Promise<FileInfo> {
    this.validateBusinessId(businessId);

    const media = await Media.findOneAndUpdate(
      { _id: fileId, uploadedBy: businessId, isActive: true },
      updates,
      { new: true }
    );

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    // Update S3 metadata if using S3
    if (getUseS3() && media.metadata?.s3Key && updates.metadata) {
      try {
        await S3Service.updateMetadata(media.metadata.s3Key, updates.metadata);
      } catch (error) {
        logger.warn('Failed to update S3 metadata:', error);
      }
    }

    return this.mapToFileInfo(media);
  }

  /**
   * Bulk delete files with S3/local support
   */
  async bulkDeleteFiles(
    fileIds: string[],
    businessId: string,
    options: { skipConfirmation?: boolean } = {}
  ): Promise<{ deleted: number; errors: string[]; totalSize: number }> {
    this.validateBusinessId(businessId);

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw { statusCode: 400, message: 'File IDs array is required' };
    }

    if (fileIds.length > 100) {
      throw { statusCode: 400, message: 'Maximum 100 files can be deleted at once' };
    }

    const errors: string[] = [];
    let deleted = 0;
    let totalSize = 0;
    const s3KeysToDelete: string[] = [];

    const files = await Media.find({
      _id: { $in: fileIds },
      uploadedBy: businessId,
      isActive: true
    });

    for (const media of files) {
      try {
        const s3Key = media.metadata?.s3Key;

        if (s3Key && getUseS3()) {
          s3KeysToDelete.push(s3Key);
        } else {
          // Delete from local filesystem
          try {
            const fullPath = path.resolve(UPLOAD_DIR, media.url.replace('/uploads/', ''));
            await fs.unlink(fullPath);
          } catch (error) {
            logger.warn('Could not delete file ${media.url}:', error);
          }
        }

        await media.updateOne({ isActive: false, deletedAt: new Date() });

        totalSize += media.size;
        deleted++;

        this.logStorageEvent('BULK_DELETE', businessId, media.filename, true, getUseS3() ? 's3' : 'local');

      } catch (error) {
        const errorMessage = `Failed to delete ${media._id}: ${error.message}`;
        errors.push(errorMessage);
        this.logStorageEvent('BULK_DELETE', businessId, media.filename, false, getUseS3() ? 's3' : 'local');
      }
    }

    // Bulk delete from S3 if using S3
    if (s3KeysToDelete.length > 0 && getUseS3()) {
      try {
        const s3DeleteResult = await S3Service.deleteFiles(s3KeysToDelete);
        if (s3DeleteResult.errors.length > 0) {
          errors.push(...s3DeleteResult.errors.map(e => e.error));
        }
      } catch (error) {
        errors.push(`S3 bulk delete failed: ${error.message}`);
      }
    }

    return { deleted, errors, totalSize };
  }

  /**
   * Validate storage configuration
   */
  async validateStorageConfiguration(): Promise<{
    configured: boolean;
    storageProvider: 'local' | 's3';
    canConnect: boolean;
    errors: string[];
  }> {
    const result = {
      configured: true,
      storageProvider: getUseS3() ? 's3' as const : 'local' as const,
      canConnect: false,
      errors: [] as string[]
    };

    if (getUseS3()) {
      try {
        const s3Validation = await S3Service.validateConfiguration();
        result.configured = s3Validation.configured;
        result.canConnect = s3Validation.canConnect && s3Validation.bucketExists && s3Validation.hasPermissions;
        result.errors = s3Validation.errors;
      } catch (error) {
        result.errors.push(`S3 validation failed: ${error.message}`);
      }
    } else {
      // Validate local storage
      try {
        const uploadDir = path.resolve(UPLOAD_DIR);
        await fs.access(uploadDir);
        result.canConnect = true;
      } catch {
        try {
          await fs.mkdir(path.resolve(UPLOAD_DIR), { recursive: true });
          result.canConnect = true;
        } catch (error) {
          result.errors.push(`Cannot create upload directory: ${error.message}`);
        }
      }
    }

    return result;
  }

  // Legacy methods preserved for backward compatibility...

  async addFileTags(fileId: string, businessId: string, tags: string[]): Promise<FileInfo> {
    this.validateBusinessId(businessId);

    const normalizedTags = tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
    
    const media = await Media.findOneAndUpdate(
      {
        _id: fileId,
        uploadedBy: businessId,
        isActive: true
      },
      {
        $addToSet: { tags: { $each: normalizedTags } }
      },
      { new: true }
    );

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    return this.mapToFileInfo(media);
  }

  async removeFileTags(fileId: string, businessId: string, tags: string[]): Promise<FileInfo> {
    this.validateBusinessId(businessId);

    const normalizedTags = tags.map(tag => tag.toLowerCase().trim());
    
    const media = await Media.findOneAndUpdate(
      {
        _id: fileId,
        uploadedBy: businessId,
        isActive: true
      },
      {
        $pullAll: { tags: normalizedTags }
      },
      { new: true }
    );

    if (!media) {
      throw { statusCode: 404, message: 'File not found' };
    }

    return this.mapToFileInfo(media);
  }

  async trackFileDownload(fileId: string, businessId: string): Promise<void> {
    this.validateBusinessId(businessId);

    await Media.findOneAndUpdate(
      {
        _id: fileId,
        uploadedBy: businessId,
        isActive: true
      },
      {
        $inc: { downloadCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );

    this.logStorageEvent('FILE_DOWNLOAD', businessId, fileId, true, getUseS3() ? 's3' : 'local');
  }

  async getFilesByCategory(
    businessId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document' | 'metadata'
  ): Promise<FileInfo[]> {
    this.validateBusinessId(businessId);

    const files = await Media.find({
      uploadedBy: businessId,
      category,
      isActive: true
    }).sort({ createdAt: -1 });

    return files.map(file => this.mapToFileInfo(file));
  }

  async getRecentFiles(businessId: string, limit: number = 10): Promise<FileInfo[]> {
    this.validateBusinessId(businessId);

    const files = await Media.find({
      uploadedBy: businessId,
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    return files.map(file => this.mapToFileInfo(file));
  }

  async getLargeFiles(businessId: string, sizeThresholdMB: number = 10): Promise<FileInfo[]> {
    this.validateBusinessId(businessId);

    const sizeThreshold = sizeThresholdMB * 1024 * 1024;
    
    const files = await Media.find({
      uploadedBy: businessId,
      size: { $gte: sizeThreshold },
      isActive: true
    }).sort({ size: -1 });

    return files.map(file => this.mapToFileInfo(file));
  }

  async cleanupOrphanedFiles(businessId: string): Promise<{ cleaned: number; errors: string[] }> {
    this.validateBusinessId(businessId);

    const errors: string[] = [];
    let cleaned = 0;

    if (getUseS3()) {
      // For S3, we rely on the database records as the source of truth
      logger.info('S3 orphan cleanup: Using database records as source of truth');
      return { cleaned: 0, errors: [] };
    }

    try {
      const businessDir = path.resolve(UPLOAD_DIR, businessId);
      const exists = await fs.access(businessDir).then(() => true).catch(() => false);
      
      if (!exists) {
        return { cleaned: 0, errors: [] };
      }

      const files = await this.getAllFilesRecursively(businessDir);
      
      for (const filePath of files) {
        const relativePath = path.relative(path.resolve(UPLOAD_DIR), filePath);
        const urlPath = `/${relativePath.replace(/\\/g, '/')}`;
        
        const mediaRecord = await Media.findOne({ 
          url: urlPath,
          uploadedBy: businessId,
          isActive: true 
        });
        
        if (!mediaRecord) {
          try {
            await fs.unlink(filePath);
            cleaned++;
          } catch (error) {
            errors.push(`Failed to delete orphaned file ${filePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to cleanup files: ${error.message}`);
    }

    return { cleaned, errors };
  }
}

// Legacy function for backward compatibility
export async function uploadJsonToStorage(
  businessId: string,
  resourceId: string,
  metadata: any
): Promise<string> {
  const storageService = new StorageService();
  return storageService.uploadJsonMetadata(businessId, resourceId, metadata);
}