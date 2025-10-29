// src/controllers/features/manufacturers/manufacturerMedia.controller.ts
// Manufacturer media controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerMediaService } from '../../../services/manufacturers/features/media.service';

/**
 * Manufacturer media request interfaces
 */
interface UploadFileRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  validatedBody?: {
    allowedTypes?: string[];
    maxSizeInMB?: number;
    destination?: string;
    generateThumbnail?: boolean;
    watermark?: boolean;
  };
}

interface ProcessImageRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
    fileId: string;
  };
  validatedBody: {
    resize?: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill';
    };
    quality?: number;
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
  };
}

interface GenerateQRCodeRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    data: string;
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
  };
}

interface CreateMediaGalleryRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    name: string;
    fileIds: string[];
    description?: string;
    isPublic?: boolean;
    tags?: string[];
    coverImageId?: string;
  };
}

interface GetBrandAssetsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetMediaAnalyticsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface DeleteFileRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
    fileId: string;
  };
}

/**
 * Manufacturer media controller
 */
export class ManufacturerMediaController extends BaseController {
  private mediaService = manufacturerMediaService;

  /**
   * POST /api/manufacturers/:manufacturerId/media/upload
   * Upload file
   */
  async uploadFile(req: UploadFileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPLOAD_MANUFACTURER_FILE');

        if (!req.file) {
          throw new Error('File is required');
        }

        const uploadOptions = {
          allowedTypes: req.validatedBody?.allowedTypes,
          maxSizeInMB: req.validatedBody?.maxSizeInMB,
          destination: req.validatedBody?.destination,
          generateThumbnail: req.validatedBody?.generateThumbnail,
          watermark: req.validatedBody?.watermark
        };

        const uploadedFile = await this.mediaService.uploadFile(
          req.validatedParams.manufacturerId,
          req.file as Express.Multer.File,
          uploadOptions
        );

        this.logAction(req, 'UPLOAD_MANUFACTURER_FILE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          filename: uploadedFile.filename,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType
        });

        return { uploadedFile };
      });
    }, res, 'File uploaded successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/media/:fileId/process
   * Process image
   */
  async processImage(req: ProcessImageRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'PROCESS_MANUFACTURER_IMAGE');

        const processingOptions = {
          resize: req.validatedBody.resize,
          quality: req.validatedBody.quality,
          format: req.validatedBody.format,
          watermark: req.validatedBody.watermark,
          filters: req.validatedBody.filters
        };

        const processedFile = await this.mediaService.processImage(
          req.validatedParams.fileId,
          processingOptions
        );

        this.logAction(req, 'PROCESS_MANUFACTURER_IMAGE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          fileId: req.validatedParams.fileId,
          processedFileId: processedFile.id
        });

        return { processedFile };
      });
    }, res, 'Image processed successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/media/qrcode/generate
   * Generate QR code
   */
  async generateQRCode(req: GenerateQRCodeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_MANUFACTURER_QRCODE');

        const qrOptions = {
          format: req.validatedBody.format,
          size: req.validatedBody.size,
          customSize: req.validatedBody.customSize,
          errorCorrectionLevel: req.validatedBody.errorCorrectionLevel,
          margin: req.validatedBody.margin,
          color: req.validatedBody.color,
          logo: req.validatedBody.logo
        };

        const qrResult = await this.mediaService.generateQRCode(
          req.validatedParams.manufacturerId,
          req.validatedBody.data,
          qrOptions
        );

        this.logAction(req, 'GENERATE_MANUFACTURER_QRCODE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          qrCodeId: qrResult.id,
          format: qrResult.format,
          size: qrResult.size
        });

        return { qrResult };
      });
    }, res, 'QR code generated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/media/gallery/create
   * Create media gallery
   */
  async createMediaGallery(req: CreateMediaGalleryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CREATE_MEDIA_GALLERY');

        const galleryOptions = {
          description: req.validatedBody.description,
          isPublic: req.validatedBody.isPublic,
          tags: req.validatedBody.tags,
          coverImageId: req.validatedBody.coverImageId
        };

        const gallery = await this.mediaService.createMediaGallery(
          req.validatedParams.manufacturerId,
          req.validatedBody.name,
          req.validatedBody.fileIds,
          galleryOptions
        );

        this.logAction(req, 'CREATE_MEDIA_GALLERY_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          galleryId: gallery.id,
          galleryName: gallery.name,
          filesCount: gallery.files.length
        });

        return { gallery };
      });
    }, res, 'Media gallery created successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/media/brand-assets
   * Get brand assets
   */
  async getBrandAssets(req: GetBrandAssetsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BRAND_ASSETS');

        const brandAssets = await this.mediaService.getBrandAssets(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_BRAND_ASSETS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          hasLogo: !!brandAssets.logo,
          brandColorsCount: brandAssets.brandColors.length,
          fontsCount: brandAssets.fonts.length,
          templatesCount: brandAssets.templates.length,
          productImagesCount: brandAssets.productImages.length,
          certificateImagesCount: brandAssets.certificateImages.length
        });

        return { brandAssets };
      });
    }, res, 'Brand assets retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/media/analytics
   * Get media analytics
   */
  async getMediaAnalytics(req: GetMediaAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_MEDIA_ANALYTICS');

        const analytics = await this.mediaService.getMediaAnalytics(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_MEDIA_ANALYTICS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          totalFiles: analytics.totalFiles,
          totalSize: analytics.totalSize,
          storageUsed: analytics.storageUsed,
          mostAccessedFilesCount: analytics.mostAccessedFiles.length,
          recentUploadsCount: analytics.recentUploads.length
        });

        return { analytics };
      });
    }, res, 'Media analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/manufacturers/:manufacturerId/media/:fileId
   * Delete file
   */
  async deleteFile(req: DeleteFileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DELETE_MANUFACTURER_FILE');

        await this.mediaService.deleteFile(
          req.validatedParams.fileId,
          req.validatedParams.manufacturerId
        );

        this.logAction(req, 'DELETE_MANUFACTURER_FILE_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          fileId: req.validatedParams.fileId
        });

        return { message: 'File deleted successfully' };
      });
    }, res, 'File deleted successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerMediaController = new ManufacturerMediaController();
