// src/services/__tests__/storage.service.test.ts

import { StorageService, StorageUploadOptions, FileInfo, getUseS3 } from '../business/storage.service';
import { Media } from '../../models/media.model';
import { S3Service } from '../external/s3.service';
import { UtilsService } from '../utils/utils.service';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../../models/media.model');
jest.mock('../external/s3.service');
jest.mock('../utils/utils.service');
jest.mock('fs/promises');
jest.mock('path');
jest.mock('uuid');

const MockedMedia = Media as jest.Mocked<typeof Media>;
const MockedS3Service = S3Service as jest.Mocked<typeof S3Service>;
const MockedUtilsService = UtilsService as jest.Mocked<typeof UtilsService>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('StorageService', () => {
  let storageService: StorageService;
  let mockFile: Express.Multer.File;
  let mockMedia: any;
  let mockBusinessId: string;

  beforeEach(() => {
    storageService = new StorageService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock business ID (valid MongoDB ObjectId)
    mockBusinessId = '507f1f77bcf86cd799439011';
    
    // Mock file data
    mockFile = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000, // 1MB
      destination: '/tmp',
      filename: 'temp-file-123',
      path: '/tmp/temp-file-123',
      buffer: Buffer.from('fake-image-data')
    } as Express.Multer.File;

    // Mock media data
    mockMedia = {
      _id: 'media-id-123',
      url: '/uploads/business-id-123/test-image-abc123.jpg',
      type: 'image',
      uploadedBy: mockBusinessId,
      filename: 'test-image-abc123.jpg',
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      category: 'product',
      resourceId: 'resource-id-123',
      metadata: {
        checksum: 'abc123def456',
        uploadTimestamp: '2023-12-01T10:00:00.000Z',
        storageProvider: 'local'
      },
      isActive: true,
      isProcessed: true,
      isPublic: false,
      createdAt: new Date('2023-12-01T10:00:00.000Z'),
      updatedAt: new Date('2023-12-01T10:00:00.000Z'),
      tags: ['product', 'image'],
      description: 'Test product image',
      downloadCount: 0,
      save: jest.fn().mockResolvedValue(true),
      updateOne: jest.fn().mockResolvedValue(true)
    };

    // Mock environment variables
    process.env.STORAGE_PROVIDER = 'local';
    process.env.UPLOAD_DIR = 'uploads';
    process.env.AWS_S3_BUCKET = '';

    // Mock utility functions
    MockedUtilsService.generateSlug.mockReturnValue('test-image');
    MockedUtilsService.formatFileSize.mockReturnValue('1.0 MB');
    MockedUtilsService.cleanObject.mockImplementation((obj) => obj);
    MockedUtilsService.containsOnlyAllowedChars.mockReturnValue(true);

    // Mock UUID
    mockUuidv4.mockReturnValue('abc123-def456-ghi789');

    // Mock path functions
    mockPath.extname.mockReturnValue('.jpg');
    mockPath.basename.mockReturnValue('test-image');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));

    // Mock fs functions
    mockFs.readFile.mockResolvedValue(Buffer.from('fake-image-data'));
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);

    // Mock Media model constructor - removed to avoid conflicts with findOne mock
    
    // Mock Media constructor to return the actual data passed to it
    (MockedMedia as any).mockImplementation((data: any) => ({
      ...mockMedia,
      ...data,
      _id: mockMedia._id,
      save: jest.fn().mockResolvedValue({
        ...mockMedia,
        ...data,
        _id: mockMedia._id
      })
    }));
    
    // Mock findOne to return media with updateOne method directly
    MockedMedia.findOne.mockResolvedValue({
      ...mockMedia,
      updateOne: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(mockMedia)
    });
    
    MockedMedia.findOneAndUpdate.mockResolvedValue(mockMedia);
    
    // Mock find to return a chainable object for all cases
    MockedMedia.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockMedia])
    } as any);
    
    MockedMedia.countDocuments.mockResolvedValue(1);
    MockedMedia.aggregate
      .mockResolvedValueOnce([
        {
          _id: null,
          totalFiles: 1,
          totalSize: 1024000,
          avgSize: 1024000
        }
      ])
      .mockResolvedValueOnce([
        { _id: 'image', count: 1, size: 1024000 }
      ])
      .mockResolvedValueOnce([
        { _id: 'product', count: 1, size: 1024000 }
      ]);
    
    // Mock findOne with sort and select
    MockedMedia.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockMedia)
      })
    } as any);

    // Mock S3Service
    MockedS3Service.buildS3Key.mockReturnValue('business-id-123/resource-id-123/test-image-abc123.jpg');
    MockedS3Service.uploadFile.mockResolvedValue({
      url: 'https://s3.amazonaws.com/bucket/test-image-abc123.jpg',
      key: 'business-id-123/resource-id-123/test-image-abc123.jpg',
      etag: 'abc123etag',
      location: 'https://s3.amazonaws.com/bucket/test-image-abc123.jpg',
      bucket: 'test-bucket'
    });
    MockedS3Service.deleteFile.mockResolvedValue(undefined);
    MockedS3Service.deleteFiles.mockResolvedValue({
      deleted: ['file1.jpg'],
      errors: []
    });
    MockedS3Service.getSignedUrl.mockResolvedValue('https://s3.amazonaws.com/bucket/signed-url');
    MockedS3Service.updateMetadata.mockResolvedValue(undefined);
    MockedS3Service.getStorageStats.mockResolvedValue({
      totalFiles: 1,
      totalSize: 1024000,
      sizeFormatted: '1.0 MB'
    });
    MockedS3Service.validateConfiguration.mockResolvedValue({
      configured: true,
      canConnect: true,
      bucketExists: true,
      hasPermissions: true,
      errors: []
    });
  });

  describe('File Upload Methods', () => {
    describe('uploadFile', () => {
      it('should upload file to local storage successfully', async () => {
        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          resourceId: 'resource-id-123',
          category: 'product',
          metadata: { description: 'Test product image' },
          isPublic: false
        };

        const result = await storageService.uploadFile(mockFile, uploadOptions);

        expect(result).toMatchObject({
          id: 'media-id-123',
          url: '/uploads/507f1f77bcf86cd799439011/resource-id-123/test-image-abc123.jpg',
          filename: 'test-image-abc123.jpg',
          originalName: 'test-image.jpg',
          size: 1024000,
          mimeType: 'image/jpeg',
          businessId: mockBusinessId,
          resourceId: 'resource-id-123',
          category: 'product',
          type: 'image',
          isPublic: false
        });

        expect(MockedMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            url: expect.stringContaining('/uploads/'),
            type: 'image',
            uploadedBy: mockBusinessId,
            filename: 'test-image-abc123.jpg',
            originalName: 'test-image.jpg',
            mimeType: 'image/jpeg',
            size: 1024000,
            category: 'product',
            resourceId: 'resource-id-123',
            isActive: true,
            isProcessed: true,
            isPublic: false
          })
        );
      });

      it('should upload file to S3 when configured', async () => {
        // Create new service instance with S3 environment
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';
        
        // Verify the environment is set correctly
        expect(getUseS3()).toBe(true);
        
        // Create new service instance with S3 environment
        const s3StorageService = new StorageService();
        
        // Mock the S3Service.uploadFile to return the correct URL
        MockedS3Service.uploadFile.mockResolvedValueOnce({
          url: 'https://s3.amazonaws.com/bucket/test-image-abc123.jpg',
          key: 'business-id-123/resource-id-123/test-image-abc123.jpg',
          etag: 'abc123etag',
          location: 'https://s3.amazonaws.com/bucket/test-image-abc123.jpg',
          bucket: 'test-bucket'
        });
        
        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          resourceId: 'resource-id-123',
          category: 'product',
          isPublic: true
        };

        const result = await s3StorageService.uploadFile(mockFile, uploadOptions);

        expect(result.url).toBe('https://s3.amazonaws.com/bucket/test-image-abc123.jpg');
        expect(MockedS3Service.uploadFile).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({
            businessId: mockBusinessId,
            resourceId: 'resource-id-123',
            filename: 'test-image-abc123.jpg',
            mimeType: 'image/jpeg',
            isPublic: true
          })
        );
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });

      it('should validate file type restrictions', async () => {
        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          allowedTypes: ['image/png', 'image/gif'],
          category: 'product'
        };

        await expect(storageService.uploadFile(mockFile, uploadOptions))
          .rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining('File type image/jpeg not allowed')
          });
      });

      it('should validate file size restrictions', async () => {
        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          maxFileSize: 500000, // 500KB
          category: 'product'
        };

        await expect(storageService.uploadFile(mockFile, uploadOptions))
          .rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining('File size')
          });
      });

      it('should reject dangerous file extensions', async () => {
        const dangerousFile = {
          ...mockFile,
          originalname: 'malicious.exe',
          mimetype: 'application/x-executable'
        };

        // Mock path.extname to return .exe for this test
        mockPath.extname.mockReturnValueOnce('.exe');

        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          category: 'document'
        };

        // The service should reject this file type automatically
        await expect(storageService.uploadFile(dangerousFile, uploadOptions))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'File type .exe is not allowed for security reasons'
          });
      });

      it('should validate business ID', async () => {
        const uploadOptions: StorageUploadOptions = {
          businessId: '',
          category: 'product'
        };

        await expect(storageService.uploadFile(mockFile, uploadOptions))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Valid business ID is required'
          });
      });

      it('should handle upload errors gracefully', async () => {
        mockFs.readFile.mockRejectedValue(new Error('File read error'));

        const uploadOptions: StorageUploadOptions = {
          businessId: mockBusinessId,
          category: 'product'
        };

        await expect(storageService.uploadFile(mockFile, uploadOptions))
          .rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('File upload failed')
          });
      });
    });

    describe('uploadJsonMetadata', () => {
      it('should upload JSON metadata successfully', async () => {
        const metadata = {
          productId: 'product-123',
          version: '1.0',
          data: { color: 'red', size: 'large' }
        };

        const result = await storageService.uploadJsonMetadata(
          mockBusinessId,
          'resource-id-123',
          metadata,
          { category: 'metadata', filename: 'product-data' }
        );

        expect(result).toBe('/uploads/507f1f77bcf86cd799439011/resource-id-123/test-image-abc123.json');
        expect(MockedMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            url: expect.stringContaining('.json'),
            type: 'document',
            mimeType: 'application/json',
            category: 'metadata',
            metadata: expect.objectContaining({
              productId: 'product-123',
              version: '1.0',
              data: { color: 'red', size: 'large' }
            })
          })
        );
      });

      it('should validate resource ID', async () => {
        await expect(storageService.uploadJsonMetadata(
          mockBusinessId,
          '',
          { test: 'data' }
        )).rejects.toMatchObject({
          statusCode: 400,
          message: 'Valid resource ID is required'
        });
      });

      it('should validate metadata object', async () => {
        await expect(storageService.uploadJsonMetadata(
          mockBusinessId,
          'resource-id-123',
          null as any
        )).rejects.toMatchObject({
          statusCode: 400,
          message: 'Valid metadata object is required'
        });
      });
    });
  });

  describe('File Management Methods', () => {
    describe('deleteFile', () => {
      it('should delete file from local storage', async () => {
        const mockMediaWithUpdateOne = {
          ...mockMedia,
          updateOne: jest.fn().mockResolvedValue(true)
        };
        MockedMedia.findOne.mockResolvedValueOnce(mockMediaWithUpdateOne);

        await storageService.deleteFile('media-id-123', mockBusinessId);

        expect(MockedMedia.findOne).toHaveBeenCalledWith({
          _id: 'media-id-123',
          uploadedBy: mockBusinessId,
          isActive: true
        });
        expect(mockMediaWithUpdateOne.updateOne).toHaveBeenCalledWith({
          isActive: false,
          deletedAt: expect.any(Date)
        });
      });

      it('should delete file from S3 when using S3 storage', async () => {
        // Create new service instance with S3 environment
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';
        
        const s3StorageService = new StorageService();

        const s3Media = {
          ...mockMedia,
          metadata: {
            s3Key: 'business-id-123/test-image-abc123.jpg'
          },
          updateOne: jest.fn().mockResolvedValue(true)
        };
        MockedMedia.findOne.mockResolvedValue(s3Media);

        await s3StorageService.deleteFile('media-id-123', mockBusinessId);

        expect(MockedS3Service.deleteFile).toHaveBeenCalledWith('business-id-123/test-image-abc123.jpg');
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });

      it('should throw error when file not found', async () => {
        MockedMedia.findOne.mockResolvedValue(null);

        await expect(storageService.deleteFile('nonexistent-id', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'File not found'
          });
      });
    });

    describe('bulkDeleteFiles', () => {
      it('should bulk delete multiple files', async () => {
        const fileIds = ['media-id-1', 'media-id-2', 'media-id-3'];
        const mockFiles = [
          { ...mockMedia, _id: 'media-id-1', size: 1000000 },
          { ...mockMedia, _id: 'media-id-2', size: 2000000 },
          { ...mockMedia, _id: 'media-id-3', size: 1500000 }
        ];

        MockedMedia.find.mockResolvedValue(mockFiles);

        const result = await storageService.bulkDeleteFiles(fileIds, mockBusinessId);

        expect(result).toEqual({
          deleted: 3,
          errors: [],
          totalSize: 4500000
        });
        expect(MockedMedia.find).toHaveBeenCalledWith({
          _id: { $in: fileIds },
          uploadedBy: mockBusinessId,
          isActive: true
        });
      });

      it('should handle partial failures in bulk delete', async () => {
        const fileIds = ['media-id-1', 'media-id-2'];
        const mockFiles = [
          { ...mockMedia, _id: 'media-id-1', size: 1000000 },
          { ...mockMedia, _id: 'media-id-2', size: 2000000 }
        ];

        MockedMedia.find.mockResolvedValue(mockFiles);
        // Mock updateOne to fail for first file
        mockFiles[0].updateOne = jest.fn().mockRejectedValue(new Error('Delete failed'));
        mockFiles[1].updateOne = jest.fn().mockResolvedValue(true);

        const result = await storageService.bulkDeleteFiles(fileIds, mockBusinessId);

        expect(result.deleted).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to delete media-id-1');
      });

      it('should validate file IDs array', async () => {
        await expect(storageService.bulkDeleteFiles([], mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'File IDs array is required'
          });
      });

      it('should limit bulk delete to 100 files', async () => {
        const fileIds = Array.from({ length: 101 }, (_, i) => `media-id-${i}`);

        await expect(storageService.bulkDeleteFiles(fileIds, mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Maximum 100 files can be deleted at once'
          });
      });
    });
  });

  describe('File Retrieval Methods', () => {
    describe('getFiles', () => {
      it('should get files with default options', async () => {
        const result = await storageService.getFiles(mockBusinessId);

        expect(result).toEqual({
          files: [expect.objectContaining({
            id: 'media-id-123',
            businessId: mockBusinessId
          })],
          total: 1
        });
        expect(MockedMedia.find).toHaveBeenCalledWith(
          { uploadedBy: mockBusinessId, isActive: true }
        );
      });

      it('should get files with filters', async () => {
        const result = await storageService.getFiles(mockBusinessId, 'resource-id-123', {
          category: 'product',
          type: 'image',
          limit: 10,
          offset: 0
        });

        expect(result.files).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith(
          {
            uploadedBy: mockBusinessId,
            isActive: true,
            resourceId: 'resource-id-123',
            category: 'product',
            type: 'image'
          }
        );
      });
    });

    describe('getFileById', () => {
      it('should get file by ID', async () => {
        const mockMediaWithUpdateOne = {
          ...mockMedia,
          updateOne: jest.fn().mockResolvedValue(true)
        };
        MockedMedia.findOne.mockResolvedValueOnce(mockMediaWithUpdateOne);

        const result = await storageService.getFileById('media-id-123', mockBusinessId);

        expect(result).toMatchObject({
          id: 'media-id-123',
          businessId: mockBusinessId
        });
        expect(mockMediaWithUpdateOne.updateOne).toHaveBeenCalledWith({
          lastAccessedAt: expect.any(Date)
        });
      });

      it('should throw error when file not found', async () => {
        MockedMedia.findOne.mockResolvedValue(null);

        await expect(storageService.getFileById('nonexistent-id', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'File not found'
          });
      });
    });

    describe('searchFiles', () => {
      it('should search files by name', async () => {
        const result = await storageService.searchFiles(mockBusinessId, 'test-image');

        expect(result.files).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith(
          expect.objectContaining({
            uploadedBy: mockBusinessId,
            isActive: true,
            $or: expect.arrayContaining([
              { originalName: { $regex: 'test-image', $options: 'i' } },
              { filename: { $regex: 'test-image', $options: 'i' } },
              { description: { $regex: 'test-image', $options: 'i' } },
              { tags: { $in: [/test-image/i] } }
            ])
          })
        );
      });

      it('should search files with filters', async () => {
        const result = await storageService.searchFiles(mockBusinessId, 'test', {
          type: 'image',
          category: 'product',
          limit: 20
        });

        expect(result.files).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'image',
            category: 'product',
            uploadedBy: mockBusinessId,
            isActive: true,
            $or: expect.arrayContaining([
              { originalName: { $regex: 'test', $options: 'i' } },
              { filename: { $regex: 'test', $options: 'i' } },
              { description: { $regex: 'test', $options: 'i' } },
              { tags: { $in: [/test/i] } }
            ])
          })
        );
      });
    });
  });

  describe('Storage Statistics', () => {
    describe('getStorageStats', () => {
      it('should get storage statistics for local storage', async () => {
        const result = await storageService.getStorageStats(mockBusinessId);

        expect(result).toMatchObject({
          totalFiles: 1,
          totalSize: 1024000,
          storageUsed: '1.0 MB',
          storageProvider: 'local',
          byBusinessId: { [mockBusinessId]: 1 },
          byFileType: expect.any(Object),
          byCategory: expect.any(Object),
          averageFileSize: '1.0 MB'
        });
      });

      it('should get storage statistics for S3 storage', async () => {
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        const s3StorageService = new StorageService();

        const result = await s3StorageService.getStorageStats(mockBusinessId);

        expect(result.storageProvider).toBe('s3');
        expect(MockedS3Service.getStorageStats).toHaveBeenCalledWith(mockBusinessId);
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });
    });
  });

  describe('S3-Specific Methods', () => {
    describe('getSignedUrl', () => {
      it('should generate signed URL for S3 file', async () => {
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        const s3StorageService = new StorageService();

        const s3Media = {
          ...mockMedia,
          metadata: {
            s3Key: 'business-id-123/test-image-abc123.jpg'
          }
        };
        MockedMedia.findOne.mockResolvedValue(s3Media);

        const result = await s3StorageService.getSignedUrl('media-id-123', mockBusinessId, 7200);

        expect(result).toBe('https://s3.amazonaws.com/bucket/signed-url');
        expect(MockedS3Service.getSignedUrl).toHaveBeenCalledWith(
          'business-id-123/test-image-abc123.jpg',
          'getObject',
          7200
        );
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });

      it('should throw error when not using S3', async () => {
        await expect(storageService.getSignedUrl('media-id-123', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Signed URLs only available with S3 storage'
          });
      });

      it('should throw error when file not found', async () => {
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        const s3StorageService = new StorageService();

        MockedMedia.findOne.mockResolvedValue(null);

        await expect(s3StorageService.getSignedUrl('nonexistent-id', mockBusinessId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'File not found'
          });
          
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });
    });
  });

  describe('File Metadata Management', () => {
    describe('updateFileMetadata', () => {
      it('should update file metadata', async () => {
        const updates = {
          category: 'banner',
          description: 'Updated description',
          tags: ['banner', 'updated'],
          isPublic: true,
          metadata: { updated: true }
        };

        const result = await storageService.updateFileMetadata('media-id-123', mockBusinessId, updates);

        expect(result).toMatchObject({
          id: 'media-id-123',
          businessId: mockBusinessId
        });
        expect(MockedMedia.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'media-id-123', uploadedBy: mockBusinessId, isActive: true },
          updates,
          { new: true }
        );
      });

      it('should update S3 metadata when using S3', async () => {
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        const s3StorageService = new StorageService();

        const s3Media = {
          ...mockMedia,
          metadata: {
            s3Key: 'business-id-123/test-image-abc123.jpg'
          }
        };
        MockedMedia.findOneAndUpdate.mockResolvedValue(s3Media);

        const updates = {
          metadata: { updated: true }
        };

        await s3StorageService.updateFileMetadata('media-id-123', mockBusinessId, updates);

        expect(MockedS3Service.updateMetadata).toHaveBeenCalledWith(
          'business-id-123/test-image-abc123.jpg',
          { updated: true }
        );
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });

      it('should throw error when file not found', async () => {
        MockedMedia.findOneAndUpdate.mockResolvedValue(null);

        await expect(storageService.updateFileMetadata('nonexistent-id', mockBusinessId, {}))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'File not found'
          });
      });
    });

    describe('addFileTags', () => {
      it('should add tags to file', async () => {
        const result = await storageService.addFileTags('media-id-123', mockBusinessId, ['new-tag', 'another-tag']);

        expect(result).toMatchObject({
          id: 'media-id-123',
          businessId: mockBusinessId
        });
        expect(MockedMedia.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'media-id-123', uploadedBy: mockBusinessId, isActive: true },
          { $addToSet: { tags: { $each: ['new-tag', 'another-tag'] } } },
          { new: true }
        );
      });
    });

    describe('removeFileTags', () => {
      it('should remove tags from file', async () => {
        const result = await storageService.removeFileTags('media-id-123', mockBusinessId, ['old-tag']);

        expect(result).toMatchObject({
          id: 'media-id-123',
          businessId: mockBusinessId
        });
        expect(MockedMedia.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'media-id-123', uploadedBy: mockBusinessId, isActive: true },
          { $pullAll: { tags: ['old-tag'] } },
          { new: true }
        );
      });
    });
  });

  describe('File Analytics Methods', () => {
    describe('trackFileDownload', () => {
      it('should track file download', async () => {
        await storageService.trackFileDownload('media-id-123', mockBusinessId);

        expect(MockedMedia.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'media-id-123', uploadedBy: mockBusinessId, isActive: true },
          {
            $inc: { downloadCount: 1 },
            $set: { lastAccessedAt: expect.any(Date) }
          }
        );
      });
    });

    describe('getFilesByCategory', () => {
      it('should get files by category', async () => {
        // Mock find to return a chainable object that resolves to array
        MockedMedia.find.mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockMedia])
        } as any);

        const result = await storageService.getFilesByCategory(mockBusinessId, 'product');

        expect(result).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith({
          uploadedBy: mockBusinessId,
          category: 'product',
          isActive: true
        });
      });
    });

    describe('getRecentFiles', () => {
      it('should get recent files', async () => {
        // Mock find to return a chainable object that resolves to array
        MockedMedia.find.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMedia])
          })
        } as any);

        const result = await storageService.getRecentFiles(mockBusinessId, 5);

        expect(result).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith({
          uploadedBy: mockBusinessId,
          isActive: true
        });
      });
    });

    describe('getLargeFiles', () => {
      it('should get large files', async () => {
        // Mock find to return a chainable object that resolves to array
        MockedMedia.find.mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockMedia])
        } as any);

        const result = await storageService.getLargeFiles(mockBusinessId, 5);

        expect(result).toHaveLength(1);
        expect(MockedMedia.find).toHaveBeenCalledWith({
          uploadedBy: mockBusinessId,
          size: { $gte: 5 * 1024 * 1024 },
          isActive: true
        });
      });
    });
  });

  describe('Storage Configuration', () => {
    describe('validateStorageConfiguration', () => {
      it('should validate local storage configuration', async () => {
        const result = await storageService.validateStorageConfiguration();

        expect(result).toEqual({
          configured: true,
          storageProvider: 'local',
          canConnect: true,
          errors: []
        });
      });

      it('should validate S3 storage configuration', async () => {
        // Create a new instance with S3 environment
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';
        
        const s3StorageService = new StorageService();
        
        const result = await s3StorageService.validateStorageConfiguration();

        expect(result).toEqual({
          configured: true,
          storageProvider: 's3',
          canConnect: true,
          errors: []
        });
        expect(MockedS3Service.validateConfiguration).toHaveBeenCalled();
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });

      it('should handle S3 validation errors', async () => {
        // Create a new instance with S3 environment
        const originalProvider = process.env.STORAGE_PROVIDER;
        const originalBucket = process.env.AWS_S3_BUCKET;
        
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        MockedS3Service.validateConfiguration.mockResolvedValue({
          configured: false,
          canConnect: false,
          bucketExists: false,
          hasPermissions: false,
          errors: ['Bucket does not exist', 'Access denied']
        });

        const s3StorageService = new StorageService();
        
        const result = await s3StorageService.validateStorageConfiguration();

        expect(result).toEqual({
          configured: false,
          storageProvider: 's3',
          canConnect: false,
          errors: ['Bucket does not exist', 'Access denied']
        });
        
        // Restore original values
        process.env.STORAGE_PROVIDER = originalProvider;
        process.env.AWS_S3_BUCKET = originalBucket;
      });
    });
  });

  describe('File Cleanup Methods', () => {
    describe('cleanupOrphanedFiles', () => {
      it('should cleanup orphaned files in local storage', async () => {
        mockFs.readdir.mockResolvedValue([
          { name: 'file1.jpg', isDirectory: () => false },
          { name: 'file2.jpg', isDirectory: () => false }
        ] as any);

        // Mock the media with proper URL structure
        const mediaWithUrl = {
          ...mockMedia,
          url: '/uploads/507f1f77bcf86cd799439011/file1.jpg'
        };

        MockedMedia.findOne
          .mockResolvedValueOnce(mediaWithUrl) // file1.jpg exists in DB
          .mockResolvedValueOnce(null); // file2.jpg is orphaned

        // Mock path.relative to return the filename
        mockPath.relative.mockReturnValue('file2.jpg');

        const result = await storageService.cleanupOrphanedFiles(mockBusinessId);

        expect(result).toEqual({
          cleaned: 1,
          errors: []
        });
        expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      });

      it('should skip cleanup for S3 storage', async () => {
        process.env.STORAGE_PROVIDER = 's3';
        process.env.AWS_S3_BUCKET = 'test-bucket';

        const result = await storageService.cleanupOrphanedFiles(mockBusinessId);

        expect(result).toEqual({
          cleaned: 0,
          errors: []
        });
      });

      it('should handle cleanup errors gracefully', async () => {
        mockFs.readdir.mockResolvedValue([
          { name: 'file1.jpg', isDirectory: () => false }
        ] as any);

        MockedMedia.findOne.mockResolvedValue(null); // Orphaned file
        mockFs.unlink.mockRejectedValue(new Error('Permission denied'));
        
        // Mock path.relative to return the filename
        mockPath.relative.mockReturnValue('file1.jpg');

        const result = await storageService.cleanupOrphanedFiles(mockBusinessId);

        expect(result.cleaned).toBe(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to delete orphaned file');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      MockedMedia.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(storageService.getFileById('media-id-123', mockBusinessId))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File system error'));

      const uploadOptions: StorageUploadOptions = {
        businessId: mockBusinessId,
        category: 'product'
      };

      await expect(storageService.uploadFile(mockFile, uploadOptions))
        .rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('File upload failed')
        });
    });

    it('should handle S3 service errors gracefully', async () => {
      const originalProvider = process.env.STORAGE_PROVIDER;
      const originalBucket = process.env.AWS_S3_BUCKET;
      
      process.env.STORAGE_PROVIDER = 's3';
      process.env.AWS_S3_BUCKET = 'test-bucket';

      const s3StorageService = new StorageService();
      (s3StorageService as any).USE_S3 = true;

      MockedS3Service.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      const uploadOptions: StorageUploadOptions = {
        businessId: mockBusinessId,
        category: 'product'
      };

      await expect(s3StorageService.uploadFile(mockFile, uploadOptions))
        .rejects.toMatchObject({
          statusCode: 500,
          message: expect.stringContaining('File upload failed')
        });
        
      // Restore original values
      process.env.STORAGE_PROVIDER = originalProvider;
      process.env.AWS_S3_BUCKET = originalBucket;
    });
  });
});
