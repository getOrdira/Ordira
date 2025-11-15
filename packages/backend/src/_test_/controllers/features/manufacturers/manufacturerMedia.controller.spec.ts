/**
 * Manufacturer Media Controller Unit Tests
 * 
 * Tests manufacturer media operations: upload, process images, generate QR codes, galleries.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerMediaController } from '../../../../controllers/features/manufacturers/manufacturerMedia.controller';
import { manufacturerMediaService } from '../../../../services/manufacturers/features/media.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer media service
jest.mock('../../../../services/manufacturers/features/media.service', () => ({
  manufacturerMediaService: {
    uploadFile: jest.fn(),
    processImage: jest.fn(),
    generateQRCode: jest.fn(),
    createMediaGallery: jest.fn(),
    getBrandAssets: jest.fn(),
    deleteFile: jest.fn(),
    getFileById: jest.fn(),
    listFiles: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerMediaController', () => {
  let manufacturerMediaController: ManufacturerMediaController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerMediaController = new ManufacturerMediaController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('uploadFile', () => {
    const mockUploadedFile = {
      id: 'file-id-123',
      url: 'https://example.com/file.jpg',
      filename: 'test.jpg',
      size: 1024,
    };

    beforeEach(() => {
      (manufacturerMediaService.uploadFile as jest.Mock).mockResolvedValue(mockUploadedFile);
    });

    it('should upload file successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      mockRequest.validatedBody = {};

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.uploadFile).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('file');
    });

    it('should apply upload options', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      mockRequest.validatedBody = {
        generateThumbnail: true,
        watermark: true,
        maxSizeInMB: 5,
      };

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.uploadFile).toHaveBeenCalled();
    });

    it('should return 400 when file is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = undefined;
      mockRequest.validatedBody = {};

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(manufacturerMediaService.uploadFile).not.toHaveBeenCalled();
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('processImage', () => {
    const mockProcessedImage = {
      id: 'processed-file-id-123',
      url: 'https://example.com/processed.jpg',
    };

    beforeEach(() => {
      (manufacturerMediaService.processImage as jest.Mock).mockResolvedValue(mockProcessedImage);
    });

    it('should process image with resize options', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
        fileId: 'file-id-123',
      };
      mockRequest.validatedBody = {
        resize: {
          width: 800,
          height: 600,
          fit: 'cover',
        },
        quality: 90,
        format: 'webp',
      };

      await manufacturerMediaController.processImage(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.processImage).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply watermark options', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
        fileId: 'file-id-123',
      };
      mockRequest.validatedBody = {
        watermark: {
          text: 'Brand Name',
          position: 'bottom-right',
          opacity: 0.5,
        },
      };

      await manufacturerMediaController.processImage(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.processImage).toHaveBeenCalled();
    });

    it('should apply image filters', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
        fileId: 'file-id-123',
      };
      mockRequest.validatedBody = {
        filters: {
          brightness: 10,
          contrast: 5,
          saturation: 15,
        },
      };

      await manufacturerMediaController.processImage(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.processImage).toHaveBeenCalled();
    });
  });

  describe('generateQRCode', () => {
    const mockQRCode = {
      id: 'qrcode-id-123',
      url: 'https://example.com/qrcode.png',
    };

    beforeEach(() => {
      (manufacturerMediaService.generateQRCode as jest.Mock).mockResolvedValue(mockQRCode);
    });

    it('should generate QR code successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        data: 'https://example.com/product/123',
        format: 'png',
        size: 'medium',
      };

      await manufacturerMediaController.generateQRCode(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.generateQRCode).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply custom QR code options', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        data: 'https://example.com',
        format: 'svg',
        size: 'custom',
        customSize: 300,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      };

      await manufacturerMediaController.generateQRCode(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.generateQRCode).toHaveBeenCalled();
    });

    it('should return 400 when data is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {};

      await manufacturerMediaController.generateQRCode(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createMediaGallery', () => {
    const mockGallery = {
      id: 'gallery-id-123',
      name: 'Product Gallery',
      fileIds: ['file-1', 'file-2'],
    };

    beforeEach(() => {
      (manufacturerMediaService.createMediaGallery as jest.Mock).mockResolvedValue(mockGallery);
    });

    it('should create media gallery successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        name: 'Product Gallery',
        fileIds: ['file-1', 'file-2'],
        description: 'Gallery description',
        isPublic: true,
      };

      await manufacturerMediaController.createMediaGallery(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.createMediaGallery).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when name is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        fileIds: ['file-1'],
      };

      await manufacturerMediaController.createMediaGallery(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getBrandAssets', () => {
    const mockAssets = {
      logos: [],
      banners: [],
      certificates: [],
    };

    beforeEach(() => {
      (manufacturerMediaService.getBrandAssets as jest.Mock).mockResolvedValue(mockAssets);
    });

    it('should retrieve brand assets', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerMediaController.getBrandAssets(mockRequest, mockResponse, mockNext);

      expect(manufacturerMediaService.getBrandAssets).toHaveBeenCalledWith('manufacturer-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      const serviceError = {
        statusCode: 500,
        message: 'Upload service unavailable',
      };
      (manufacturerMediaService.uploadFile as jest.Mock).mockRejectedValue(serviceError);

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerMediaController,
        'recordPerformance' as any
      );
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      (manufacturerMediaService.uploadFile as jest.Mock).mockResolvedValue({ id: 'file-123' });

      await manufacturerMediaController.uploadFile(mockRequest, mockResponse, mockNext);

      expect(recordPerformanceSpy).toHaveBeenCalled();
    });
  });
});

