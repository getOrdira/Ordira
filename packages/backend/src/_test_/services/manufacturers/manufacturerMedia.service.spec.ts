/**
 * Manufacturer Media Service Unit Tests
 * 
 * Tests manufacturer media operations: upload, delete, galleries, QR codes.
 */

import { ManufacturerMediaService } from '../../../services/manufacturers/features/media.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { cacheService } from '../../../services/external/cache.service';
import * as QRCode from 'qrcode';

// Mock dependencies
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

// Mock services
jest.mock('../../../services/external/cache.service', () => ({
  cacheService: mockCacheService,
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toString: jest.fn(),
  toBuffer: jest.fn(),
  toDataURL: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(),
}));

// Mock Manufacturer model
jest.mock('../../../models/manufacturer/manufacturer.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerMediaService', () => {
  let manufacturerMediaService: ManufacturerMediaService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockFile = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockUploadedFile = {
    id: 'file-id-123',
    originalName: 'test.jpg',
    filename: 'file-id-123.jpg',
    path: '/uploads/manufacturer-id/file-id-123.jpg',
    size: 1024000,
    mimeType: 'image/jpeg',
    uploadedAt: new Date(),
  };

  beforeEach(() => {
    manufacturerMediaService = new ManufacturerMediaService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
    
    const fs = require('fs/promises');
    fs.access.mockRejectedValue(new Error('Directory does not exist'));
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
    fs.copyFile.mockResolvedValue(undefined);
    
    (QRCode.toBuffer as jest.Mock) = jest.fn().mockResolvedValue(Buffer.from('qr-code'));
    (QRCode.toDataURL as jest.Mock) = jest.fn().mockResolvedValue('data:image/png;base64,qr-code');
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      (Manufacturer.updateOne as jest.Mock) = jest.fn().mockResolvedValue({});
    });

    it('should upload file successfully', async () => {
      // Mock getManufacturerFilesModel
      const mockFileModel = {
        create: jest.fn().mockResolvedValue(mockUploadedFile),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.uploadFile(
        'manufacturer-id-123',
        mockFile
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.originalName).toBe('test.jpg');
    });

    it('should throw error when file type is not allowed', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/executable',
      };

      await expect(
        manufacturerMediaService.uploadFile('manufacturer-id-123', invalidFile)
      ).rejects.toThrow('File type');
    });

    it('should throw error when file size exceeds limit', async () => {
      const largeFile = {
        ...mockFile,
        size: 100 * 1024 * 1024, // 100MB
      };

      await expect(
        manufacturerMediaService.uploadFile('manufacturer-id-123', largeFile, {
          maxSizeInMB: 50,
        })
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should generate thumbnail for images', async () => {
      const result = await manufacturerMediaService.uploadFile(
        'manufacturer-id-123',
        mockFile,
        {
          generateThumbnail: true,
        }
      );

      expect(result.thumbnailPath).toBeDefined();
    });

    it('should apply watermark when requested', async () => {
      await manufacturerMediaService.uploadFile(
        'manufacturer-id-123',
        mockFile,
        {
          watermark: true,
        }
      );

      // Watermark is applied internally
      expect(require('fs/promises').writeFile).toHaveBeenCalled();
    });

    it('should update manufacturer file count', async () => {
      await manufacturerMediaService.uploadFile('manufacturer-id-123', mockFile);

      expect(Manufacturer.updateOne).toHaveBeenCalledWith(
        { _id: 'manufacturer-id-123' },
        expect.objectContaining({
          $inc: {
            fileCount: 1,
            totalFileSize: mockFile.size,
          },
        })
      );
    });
  });

  describe('processImage', () => {
    it('should process image with resize options', async () => {
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUploadedFile),
        }),
        create: jest.fn().mockResolvedValue(mockUploadedFile),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.processImage('file-id-123', {
        resize: {
          width: 800,
          height: 600,
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should throw error when file is not found', async () => {
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await expect(
        manufacturerMediaService.processImage('non-existent-id', {})
      ).rejects.toThrow('File not found');
    });

    it('should throw error when file is not an image', async () => {
      const nonImageFile = {
        ...mockUploadedFile,
        mimeType: 'application/pdf',
      };
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(nonImageFile),
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await expect(
        manufacturerMediaService.processImage('file-id-123', {})
      ).rejects.toThrow('File is not an image');
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const mockQRCodeModel = {
        create: jest.fn().mockResolvedValue({
          id: 'qr-id-123',
          qrCodePath: '/path/to/qr.png',
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockQRCodeModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.generateQRCode(
        'manufacturer-id-123',
        'https://example.com/product/123'
      );

      expect(result.id).toBeDefined();
      expect(result.qrCodePath).toBeDefined();
      expect(result.data).toBe('https://example.com/product/123');
      expect(QRCode.toBuffer).toHaveBeenCalled();
    });

    it('should generate QR code in SVG format', async () => {
      const mockQRCodeModel = {
        create: jest.fn().mockResolvedValue({}),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockQRCodeModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      (QRCode.toString as jest.Mock) = jest.fn().mockResolvedValue('<svg>...</svg>');

      const result = await manufacturerMediaService.generateQRCode(
        'manufacturer-id-123',
        'test-data',
        {
          format: 'svg',
        }
      );

      expect(QRCode.toString).toHaveBeenCalled();
      expect(result.format).toBe('svg');
    });

    it('should apply custom size when specified', async () => {
      const mockQRCodeModel = {
        create: jest.fn().mockResolvedValue({}),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockQRCodeModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await manufacturerMediaService.generateQRCode(
        'manufacturer-id-123',
        'test-data',
        {
          size: 'large',
        }
      );

      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        'test-data',
        expect.objectContaining({
          width: 800,
        })
      );
    });

    it('should apply custom size when customSize is provided', async () => {
      const mockQRCodeModel = {
        create: jest.fn().mockResolvedValue({}),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockQRCodeModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await manufacturerMediaService.generateQRCode(
        'manufacturer-id-123',
        'test-data',
        {
          size: 'custom',
          customSize: 500,
        }
      );

      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        'test-data',
        expect.objectContaining({
          width: 500,
        })
      );
    });
  });

  describe('createMediaGallery', () => {
    it('should create media gallery successfully', async () => {
      const mockFileModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockUploadedFile]),
        }),
      };
      const mockGalleryModel = {
        create: jest.fn().mockResolvedValue({
          id: 'gallery-id-123',
          name: 'Test Gallery',
          files: [mockUploadedFile],
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn()
          .mockReturnValueOnce(mockFileModel)
          .mockReturnValueOnce(mockGalleryModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.createMediaGallery(
        'manufacturer-id-123',
        'Test Gallery',
        ['file-id-123']
      );

      expect(result.name).toBe('Test Gallery');
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('should throw error when files are not found', async () => {
      const mockFileModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await expect(
        manufacturerMediaService.createMediaGallery(
          'manufacturer-id-123',
          'Test Gallery',
          ['non-existent-file']
        )
      ).rejects.toThrow('One or more files not found');
    });
  });

  describe('getBrandAssets', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          brandColors: ['#FF0000', '#00FF00'],
          brandFonts: ['Arial', 'Helvetica'],
        }),
      });
    });

    it('should return cached brand assets when available', async () => {
      const cachedAssets = {
        logo: mockUploadedFile,
        brandColors: ['#FF0000'],
        fonts: ['Arial'],
      };
      mockCacheService.get.mockResolvedValue(cachedAssets);

      const result = await manufacturerMediaService.getBrandAssets('manufacturer-id-123');

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedAssets);
    });

    it('should fetch brand assets when cache is not available', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const mockFileModel = {
        find: jest.fn()
          .mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([mockUploadedFile]),
          })
          .mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([]),
          })
          .mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([]),
          })
          .mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([]),
          })
          .mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([]),
          }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.getBrandAssets('manufacturer-id-123');

      expect(result.brandColors).toBeDefined();
      expect(result.fonts).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should throw error when manufacturer is not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        manufacturerMediaService.getBrandAssets('non-existent-id')
      ).rejects.toThrow('Manufacturer not found');
    });
  });

  describe('getMediaAnalytics', () => {
    it('should return cached media analytics when available', async () => {
      const cachedAnalytics = {
        totalFiles: 10,
        totalSize: 1024000,
        storageUsed: '1 MB',
        mostAccessedFiles: [],
        recentUploads: [],
        fileTypeDistribution: {},
        monthlyUsage: [],
      };
      mockCacheService.get.mockResolvedValue(cachedAnalytics);

      const result = await manufacturerMediaService.getMediaAnalytics('manufacturer-id-123');

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedAnalytics);
    });

    it('should calculate media analytics when cache is not available', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const mockFileModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockUploadedFile]),
        }),
        aggregate: jest.fn().mockResolvedValue([]),
      };
      const mockAccessLogModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn()
          .mockReturnValueOnce(mockFileModel)
          .mockReturnValueOnce(mockAccessLogModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      const result = await manufacturerMediaService.getMediaAnalytics('manufacturer-id-123');

      expect(result.totalFiles).toBeDefined();
      expect(result.totalSize).toBeDefined();
      expect(result.storageUsed).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      const fs = require('fs/promises');
      fs.unlink.mockResolvedValue(undefined);
      (Manufacturer.updateOne as jest.Mock) = jest.fn().mockResolvedValue({});
    });

    it('should delete file successfully', async () => {
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUploadedFile),
        }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await manufacturerMediaService.deleteFile('file-id-123', 'manufacturer-id-123');

      expect(require('fs/promises').unlink).toHaveBeenCalled();
      expect(Manufacturer.updateOne).toHaveBeenCalledWith(
        { _id: 'manufacturer-id-123' },
        expect.objectContaining({
          $inc: {
            fileCount: -1,
            totalFileSize: -mockUploadedFile.size,
          },
        })
      );
    });

    it('should throw error when file is not found', async () => {
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await expect(
        manufacturerMediaService.deleteFile('non-existent-id', 'manufacturer-id-123')
      ).rejects.toThrow('File not found');
    });

    it('should delete thumbnail when it exists', async () => {
      const fileWithThumbnail = {
        ...mockUploadedFile,
        thumbnailPath: '/path/to/thumbnail.jpg',
      };
      const mockFileModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(fileWithThumbnail),
        }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      };
      jest.doMock('mongoose', () => ({
        models: {},
        model: jest.fn().mockReturnValue(mockFileModel),
        Schema: jest.fn(),
        SchemaTypes: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
      }));

      await manufacturerMediaService.deleteFile('file-id-123', 'manufacturer-id-123');

      expect(require('fs/promises').unlink).toHaveBeenCalledTimes(2);
    });
  });
});

