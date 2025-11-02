// src/services/manufacturers/features/media.service.ts

import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { cacheService } from '../../external/cache.service';
import mongoose from 'mongoose';
import * as QRCode from 'qrcode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Manufacturer Files model - extends Media for manufacturer-specific features
const getManufacturerFilesModel = () => {
  if (mongoose.models.ManufacturerFile) {
    return mongoose.models.ManufacturerFile;
  }

  const fileSchema = new mongoose.Schema({
    id: String,
    manufacturerId: mongoose.Schema.Types.ObjectId,
    originalName: String,
    filename: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: Date,
    thumbnailPath: String,
    category: String,
    metadata: mongoose.Schema.Types.Mixed
  }, { timestamps: true });

  return mongoose.model('ManufacturerFile', fileSchema);
};

// QR Code model
const getManufacturerQRCodesModel = () => {
  if (mongoose.models.ManufacturerQRCode) {
    return mongoose.models.ManufacturerQRCode;
  }

  const qrCodeSchema = new mongoose.Schema({
    id: String,
    manufacturerId: mongoose.Schema.Types.ObjectId,
    qrCodePath: String,
    dataUrl: String,
    format: String,
    size: Number,
    data: String,
    createdAt: Date,
    expiresAt: Date
  }, { timestamps: true });

  return mongoose.model('ManufacturerQRCode', qrCodeSchema);
};

// Gallery model (collection of media files)
const getManufacturerGalleriesModel = () => {
  if (mongoose.models.ManufacturerGallery) {
    return mongoose.models.ManufacturerGallery;
  }

  const gallerySchema = new mongoose.Schema({
    id: String,
    manufacturerId: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    files: [mongoose.Schema.Types.Mixed],
    coverImage: String,
    isPublic: Boolean,
    tags: [String],
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: true });

  return mongoose.model('ManufacturerGallery', gallerySchema);
};

// File Access Log model
const getFileAccessLogsModel = () => {
  if (mongoose.models.FileAccessLog) {
    return mongoose.models.FileAccessLog;
  }

  const accessLogSchema = new mongoose.Schema({
    manufacturerId: mongoose.Schema.Types.ObjectId,
    fileId: String,
    accessCount: { type: Number, default: 0 },
    lastAccessed: Date
  }, { timestamps: true });

  return mongoose.model('FileAccessLog', accessLogSchema);
};

export interface FileUploadOptions {
  allowedTypes?: string[];
  maxSizeInMB?: number;
  destination?: string;
  generateThumbnail?: boolean;
  watermark?: boolean;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  thumbnailPath?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // for videos
    format?: string;
  };
}

export interface QRCodeOptions {
  format?: 'png' | 'svg' | 'pdf';
  size?: 'small' | 'medium' | 'large' | 'custom';
  customSize?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  logo?: {
    path: string;
    size?: number;
  };
}

export interface QRCodeResult {
  id: string;
  qrCodePath: string;
  dataUrl?: string;
  format: string;
  size: number;
  data: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MediaGallery {
  id: string;
  manufacturerId: string;
  name: string;
  description?: string;
  files: UploadedFile[];
  coverImage?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandAssets {
  logo?: UploadedFile;
  brandColors: string[];
  fonts: string[];
  brandGuidelines?: UploadedFile;
  templates: UploadedFile[];
  productImages: UploadedFile[];
  certificateImages: UploadedFile[];
}

export interface MediaAnalytics {
  totalFiles: number;
  totalSize: number;
  storageUsed: string;
  mostAccessedFiles: Array<{
    file: UploadedFile;
    accessCount: number;
    lastAccessed: Date;
  }>;
  recentUploads: UploadedFile[];
  fileTypeDistribution: {
    [mimeType: string]: {
      count: number;
      totalSize: number;
      percentage: number;
    };
  };
  monthlyUsage: Array<{
    month: string;
    uploads: number;
    totalSize: number;
  }>;
}

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill';
  };
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  filters?: {
    blur?: number;
    sharpen?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
}

class MediaServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MediaServiceError';
  }
}

export class ManufacturerMediaService {
  private uploadPath = process.env.UPLOAD_PATH || './uploads/manufacturers';
  private maxFileSize = 50 * 1024 * 1024; // 50MB default
  private allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  private allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  async uploadFile(
    manufacturerId: string,
    file: Express.Multer.File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    try {
      const {
        allowedTypes = [...this.allowedImageTypes, ...this.allowedVideoTypes, ...this.allowedDocumentTypes],
        maxSizeInMB = 50,
        destination = 'general',
        generateThumbnail = true,
        watermark = false
      } = options;

      // Validate file type
      if (!allowedTypes.includes(file.mimetype)) {
        throw new MediaServiceError(`File type ${file.mimetype} not allowed`);
      }

      // Validate file size
      const maxSize = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSize) {
        throw new MediaServiceError(`File size exceeds limit of ${maxSizeInMB}MB`);
      }

      // Generate unique filename
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const filename = `${fileId}${fileExtension}`;
      const filePath = path.join(this.uploadPath, manufacturerId, destination, filename);

      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(filePath));

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Create uploaded file record
      const uploadedFile: UploadedFile = {
        id: fileId,
        originalName: file.originalname,
        filename,
        path: filePath,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        metadata: await this.extractFileMetadata(filePath, file.mimetype)
      };

      // Generate thumbnail for images
      if (generateThumbnail && this.allowedImageTypes.includes(file.mimetype)) {
        uploadedFile.thumbnailPath = await this.generateThumbnail(filePath, filename);
      }

      // Apply watermark if requested
      if (watermark && this.allowedImageTypes.includes(file.mimetype)) {
        await this.applyWatermark(filePath, manufacturerId);
      }

      // Save file record to database
      const ManufacturerFile = getManufacturerFilesModel();
      await ManufacturerFile.create({
        ...uploadedFile,
        manufacturerId
      });

      // Update manufacturer's file count
      await Manufacturer.updateOne(
        { _id: manufacturerId },
        { $inc: { fileCount: 1, totalFileSize: file.size } }
      );

      return uploadedFile;

    } catch (error) {
      throw new MediaServiceError(`File upload failed: ${error.message}`);
    }
  }

  async processImage(
    fileId: string,
    options: ImageProcessingOptions
  ): Promise<UploadedFile> {
    try {
      const ManufacturerFile = getManufacturerFilesModel();
      const fileRecord = await ManufacturerFile.findOne({ id: fileId }).lean();
      if (!fileRecord) {
        throw new MediaServiceError('File not found');
      }

      if (!this.allowedImageTypes.includes(fileRecord.mimeType)) {
        throw new MediaServiceError('File is not an image');
      }

      // This would typically use a library like Sharp for image processing
      // For now, we'll create a placeholder implementation
      const processedFilename = `${fileRecord.id}_processed${path.extname(fileRecord.filename)}`;
      const processedPath = path.join(path.dirname(fileRecord.path), processedFilename);

      // Simulate image processing
      await fs.copyFile(fileRecord.path, processedPath);

      const processedFile: UploadedFile = {
        ...fileRecord,
        id: uuidv4(),
        filename: processedFilename,
        path: processedPath,
        uploadedAt: new Date(),
        metadata: {
          ...fileRecord.metadata,
          processed: true,
          originalFileId: fileId
        } as any
      };

      await ManufacturerFile.create(processedFile);

      return processedFile;

    } catch (error) {
      throw new MediaServiceError(`Image processing failed: ${error.message}`);
    }
  }

  async generateQRCode(
    manufacturerId: string,
    data: string,
    options: QRCodeOptions = {}
  ): Promise<QRCodeResult> {
    try {
      const {
        format = 'png',
        size = 'medium',
        customSize,
        errorCorrectionLevel = 'M',
        margin = 1,
        color = { dark: '#000000', light: '#FFFFFF' }
      } = options;

      // Determine QR code size
      let qrSize: number;
      switch (size) {
        case 'small': qrSize = 200; break;
        case 'medium': qrSize = 400; break;
        case 'large': qrSize = 800; break;
        case 'custom': qrSize = customSize || 400; break;
        default: qrSize = 400;
      }

      const qrCodeId = uuidv4();
      const filename = `qr_${qrCodeId}.${format}`;
      const qrCodePath = path.join(this.uploadPath, manufacturerId, 'qrcodes', filename);

      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(qrCodePath));

      // Generate QR code options
      const qrOptions = {
        errorCorrectionLevel,
        margin,
        color,
        width: qrSize
      };

      let qrCodeBuffer: Buffer;
      let dataUrl: string | undefined;

      if (format === 'svg') {
        const svgString = await QRCode.toString(data, { ...qrOptions, type: 'svg' });
        qrCodeBuffer = Buffer.from(svgString);
      } else {
        qrCodeBuffer = await QRCode.toBuffer(data, { ...qrOptions, type: 'png' });
        dataUrl = await QRCode.toDataURL(data, qrOptions);
      }

      // Save QR code file
      await fs.writeFile(qrCodePath, qrCodeBuffer);

      // Add logo if specified
      if (options.logo) {
        await this.addLogoToQRCode(qrCodePath, options.logo);
      }

      const qrResult: QRCodeResult = {
        id: qrCodeId,
        qrCodePath,
        dataUrl,
        format,
        size: qrSize,
        data,
        createdAt: new Date()
      };

      // Save QR code record
      const ManufacturerQRCode = getManufacturerQRCodesModel();
      await ManufacturerQRCode.create({
        ...qrResult,
        manufacturerId
      });

      return qrResult;

    } catch (error) {
      throw new MediaServiceError(`QR code generation failed: ${error.message}`);
    }
  }

  async createMediaGallery(
    manufacturerId: string,
    name: string,
    fileIds: string[],
    options: {
      description?: string;
      isPublic?: boolean;
      tags?: string[];
      coverImageId?: string;
    } = {}
  ): Promise<MediaGallery> {
    try {
      const {
        description,
        isPublic = false,
        tags = [],
        coverImageId
      } = options;

      // Get files
      const ManufacturerFile = getManufacturerFilesModel();
      const files = await ManufacturerFile.find({
        id: { $in: fileIds },
        manufacturerId
      }).lean();

      if (files.length !== fileIds.length) {
        throw new MediaServiceError('One or more files not found');
      }

      const galleryId = uuidv4();
      const gallery: MediaGallery = {
        id: galleryId,
        manufacturerId,
        name,
        description,
        files: files as any,
        coverImage: coverImageId,
        isPublic,
        tags,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ManufacturerGallery = getManufacturerGalleriesModel();
      await ManufacturerGallery.create(gallery);

      return gallery;

    } catch (error) {
      throw new MediaServiceError(`Gallery creation failed: ${error.message}`);
    }
  }

  async getBrandAssets(manufacturerId: string): Promise<BrandAssets> {
    try {
      const cacheKey = `brand_assets:${manufacturerId}`;
      const cached = await cacheService.get<BrandAssets>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get manufacturer brand information
      const manufacturer = await Manufacturer.findById(manufacturerId).lean();

      if (!manufacturer) {
        throw new MediaServiceError('Manufacturer not found');
      }

      // Get categorized files
      const ManufacturerFile = getManufacturerFilesModel();
      const logoFiles = await ManufacturerFile.find({
        manufacturerId,
        category: 'logo'
      }).lean();

      const templateFiles = await ManufacturerFile.find({
        manufacturerId,
        category: 'templates'
      }).lean();

      const productImages = await ManufacturerFile.find({
        manufacturerId,
        category: 'products'
      }).lean();

      const certificateImages = await ManufacturerFile.find({
        manufacturerId,
        category: 'certificates'
      }).lean();

      const brandGuidelinesFiles = await ManufacturerFile.find({
        manufacturerId,
        category: 'brand-guidelines'
      }).lean();

      const brandAssets: BrandAssets = {
        logo: logoFiles[0] as any,
        brandColors: (manufacturer as any).brandColors || [],
        fonts: (manufacturer as any).brandFonts || [],
        brandGuidelines: brandGuidelinesFiles[0] as any,
        templates: templateFiles as any,
        productImages: productImages as any,
        certificateImages: certificateImages as any
      };

      await cacheService.set(cacheKey, brandAssets, { ttl: 1800 }); // 30 minutes
      return brandAssets;

    } catch (error) {
      throw new MediaServiceError(`Brand assets retrieval failed: ${error.message}`);
    }
  }

  async getMediaAnalytics(manufacturerId: string): Promise<MediaAnalytics> {
    try {
      const cacheKey = `media_analytics:${manufacturerId}`;
      const cached = await cacheService.get<MediaAnalytics>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get all files for manufacturer
      const ManufacturerFile = getManufacturerFilesModel();
      const files = await ManufacturerFile.find({
        manufacturerId
      }).lean();

      const totalFiles = files.length;
      const totalSize = files.reduce((sum: number, file: any) => sum + file.size, 0);

      // Get file access data
      const FileAccessLog = getFileAccessLogsModel();
      const fileAccess = await FileAccessLog.find({
        manufacturerId
      }).sort({ accessCount: -1 }).limit(10).lean();

      const mostAccessedFiles = await Promise.all(
        fileAccess.map(async (access: any) => ({
          file: await ManufacturerFile.findOne({ id: access.fileId }).lean(),
          accessCount: access.accessCount,
          lastAccessed: access.lastAccessed
        }))
      );

      // Recent uploads (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUploads = files.filter((file: any) =>
        file.uploadedAt >= thirtyDaysAgo
      ).sort((a: any, b: any) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      // File type distribution
      const fileTypeDistribution: any = {};
      files.forEach((file: any) => {
        if (!fileTypeDistribution[file.mimeType]) {
          fileTypeDistribution[file.mimeType] = {
            count: 0,
            totalSize: 0,
            percentage: 0
          };
        }
        fileTypeDistribution[file.mimeType].count++;
        fileTypeDistribution[file.mimeType].totalSize += file.size;
      });

      // Calculate percentages
      Object.keys(fileTypeDistribution).forEach(mimeType => {
        fileTypeDistribution[mimeType].percentage =
          (fileTypeDistribution[mimeType].count / totalFiles) * 100;
      });

      // Monthly usage (last 12 months)
      const monthlyUsage = await this.getMonthlyUsageStats(manufacturerId);

      const analytics: MediaAnalytics = {
        totalFiles,
        totalSize,
        storageUsed: this.formatFileSize(totalSize),
        mostAccessedFiles: mostAccessedFiles.filter(item => item.file) as any,
        recentUploads: recentUploads.slice(0, 10) as any,
        fileTypeDistribution,
        monthlyUsage
      };

      await cacheService.set(cacheKey, analytics, { ttl: 3600 }); // 1 hour
      return analytics;

    } catch (error) {
      throw new MediaServiceError(`Media analytics failed: ${error.message}`);
    }
  }

  async deleteFile(fileId: string, manufacturerId: string): Promise<void> {
    try {
      const ManufacturerFile = getManufacturerFilesModel();
      const file = await ManufacturerFile.findOne({
        id: fileId,
        manufacturerId
      }).lean();

      if (!file) {
        throw new MediaServiceError('File not found');
      }

      // Delete physical file
      try {
        await fs.unlink(file.path);
        if (file.thumbnailPath) {
          await fs.unlink(file.thumbnailPath);
        }
      } catch (error) {
        // File might already be deleted, continue with database cleanup
      }

      // Remove from database
      await ManufacturerFile.deleteOne({ id: fileId });

      // Update manufacturer file stats
      await Manufacturer.updateOne(
        { _id: manufacturerId },
        {
          $inc: {
            fileCount: -1,
            totalFileSize: -file.size
          }
        }
      );

    } catch (error) {
      throw new MediaServiceError(`File deletion failed: ${error.message}`);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async extractFileMetadata(filePath: string, mimeType: string): Promise<any> {
    const metadata: any = {};

    try {
      if (this.allowedImageTypes.includes(mimeType)) {
        // For images, you would typically use a library like Sharp or ExifReader
        // This is a placeholder implementation
        metadata.format = mimeType.split('/')[1];
      } else if (this.allowedVideoTypes.includes(mimeType)) {
        // For videos, you would use a library like ffprobe
        metadata.format = mimeType.split('/')[1];
      }
    } catch (error) {
      // Metadata extraction failed, continue without it
    }

    return metadata;
  }

  private async generateThumbnail(filePath: string, filename: string): Promise<string> {
    try {
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(path.dirname(filePath), 'thumbnails', thumbnailFilename);

      await this.ensureDirectoryExists(path.dirname(thumbnailPath));

      // This would typically use Sharp or similar library for actual thumbnail generation
      // For now, just copy the original file as a placeholder
      await fs.copyFile(filePath, thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      throw new MediaServiceError(`Thumbnail generation failed: ${error.message}`);
    }
  }

  private async applyWatermark(filePath: string, manufacturerId: string): Promise<void> {
    try {
      // Get manufacturer's watermark settings
      const manufacturer = await Manufacturer.findById(manufacturerId).lean();

      if ((manufacturer as any)?.watermarkSettings?.enabled) {
        // This would typically use Sharp or similar library for watermarking
        // Placeholder implementation
      }
    } catch (error) {
      // Watermark application failed, continue without it
    }
  }

  private async addLogoToQRCode(qrCodePath: string, logo: { path: string; size?: number }): Promise<void> {
    try {
      // This would typically use Sharp or Canvas to overlay logo on QR code
      // Placeholder implementation
    } catch (error) {
      // Logo addition failed, continue without it
    }
  }

  private async getMonthlyUsageStats(manufacturerId: string): Promise<Array<{
    month: string;
    uploads: number;
    totalSize: number;
  }>> {
    try {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const pipeline = [
        {
          $match: {
            manufacturerId,
            uploadedAt: { $gte: twelveMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$uploadedAt' },
              month: { $month: '$uploadedAt' }
            },
            uploads: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ];

      const ManufacturerFile = getManufacturerFilesModel();
      const results = await ManufacturerFile.aggregate(pipeline as any);

      return results.map((result: any) => ({
        month: `${result._id.year}-${result._id.month.toString().padStart(2, '0')}`,
        uploads: result.uploads,
        totalSize: result.totalSize
      }));

    } catch (error) {
      return [];
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}

export const manufacturerMediaService = new ManufacturerMediaService();
