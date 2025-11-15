/**
 * Brand Account Service Unit Tests
 * 
 * Tests brand account management operations.
 */

import { BrandAccountService } from '../../../services/brands/core/brandAccount.service';
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { MediaDataService } from '../../../services/media/core/mediaData.service';
import { storageProviderService } from '../../../services/media/core/storageProvider.service';

// Mock dependencies
const mockMediaDataService = {
  // Add methods as needed
};

const mockStorageProviderService = {
  uploadFile: jest.fn(),
};

// Mock services
jest.mock('../../../services/media/core/mediaData.service', () => ({
  MediaDataService: jest.fn().mockImplementation(() => mockMediaDataService),
}));

jest.mock('../../../services/media/core/storageProvider.service', () => ({
  storageProviderService: mockStorageProviderService,
}));

// Mock models
jest.mock('../../../models/deprecated/business.model');
jest.mock('../../../models/brands/brandSettings.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
  logSafeInfo: jest.fn(),
  logSafeError: jest.fn(),
}));

describe('BrandAccountService', () => {
  let brandAccountService: BrandAccountService;
  let mockBusinessModel: jest.Mocked<typeof Business>;

  const mockBusiness = {
    _id: 'business-id-123',
    businessName: 'Test Brand',
    firstName: 'John',
    lastName: 'Doe',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    description: 'Test description',
    industry: 'Technology',
    contactEmail: 'contact@brand.com',
    socialUrls: ['https://twitter.com/testbrand'],
    isActive: true,
  };

  beforeEach(() => {
    brandAccountService = new BrandAccountService();
    jest.clearAllMocks();
    
    mockBusinessModel = Business as jest.Mocked<typeof Business>;
  });

  describe('getBrandAccount', () => {
    it('should return brand account by ID', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBusiness),
      });

      const result = await brandAccountService.getBrandAccount('business-id-123');

      expect(Business.findById).toHaveBeenCalledWith('business-id-123');
      expect(result).toEqual(mockBusiness);
    });

    it('should throw error when brand is not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        brandAccountService.getBrandAccount('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Brand not found.',
      });
    });

    it('should select only allowed fields', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBusiness),
      });

      await brandAccountService.getBrandAccount('business-id-123');

      const selectCall = (Business.findById as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith(
        'firstName lastName businessName profilePictureUrl description industry contactEmail socialUrls'
      );
    });
  });

  describe('getBrandBasicInfo', () => {
    it('should return basic brand info', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          businessName: 'Test Brand',
          profilePictureUrl: 'https://example.com/avatar.jpg',
        }),
      });

      const result = await brandAccountService.getBrandBasicInfo('business-id-123');

      expect(result.businessName).toBe('Test Brand');
      expect(result.profilePictureUrl).toBeDefined();
    });

    it('should throw error when brand is not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        brandAccountService.getBrandBasicInfo('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Brand not found.',
      });
    });
  });

  describe('updateBrandAccount', () => {
    const mockUpdates = {
      businessName: 'Updated Brand',
      description: 'Updated description',
    };

    beforeEach(() => {
      (Business.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        new: jest.fn().mockResolvedValue({
          ...mockBusiness,
          ...mockUpdates,
        }),
      });
    });

    it('should update brand account successfully', async () => {
      const result = await brandAccountService.updateBrandAccount(
        'business-id-123',
        mockUpdates
      );

      expect(Business.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.businessName).toBe('Updated Brand');
    });

    it('should throw error when brand is not found', async () => {
      (Business.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        new: jest.fn().mockResolvedValue(null),
      });

      await expect(
        brandAccountService.updateBrandAccount('non-existent-id', mockUpdates)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Brand not found.',
      });
    });

    it('should only update allowed fields', async () => {
      const updatesWithRestricted = {
        ...mockUpdates,
        password: 'should-not-be-updated',
        internalNotes: 'should-not-be-updated',
      };

      await brandAccountService.updateBrandAccount('business-id-123', updatesWithRestricted);

      expect(Business.findByIdAndUpdate).toHaveBeenCalledWith(
        'business-id-123',
        expect.not.objectContaining({
          password: expect.anything(),
          internalNotes: expect.anything(),
        }),
        { new: true }
      );
    });
  });

  describe('uploadProfilePicture', () => {
    const mockFile = {
      originalname: 'profile.jpg',
      mimetype: 'image/jpeg',
      size: 1024000, // 1MB
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    beforeEach(() => {
      mockStorageProviderService.uploadFile.mockResolvedValue({
        url: 'https://example.com/uploaded-profile.jpg',
        key: 'profile-key',
        bucket: 'test-bucket',
        region: 'us-east-1',
      });
      (Business.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBusiness,
        profilePictureUrl: 'https://example.com/uploaded-profile.jpg',
      });
    });

    it('should upload profile picture successfully', async () => {
      const result = await brandAccountService.uploadProfilePicture('business-id-123', mockFile);

      expect(mockStorageProviderService.uploadFile).toHaveBeenCalled();
      expect(result.profilePictureUrl).toBeDefined();
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it('should throw error when business ID is missing', async () => {
      await expect(
        brandAccountService.uploadProfilePicture('', mockFile)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Business ID is required',
      });
    });

    it('should throw error when file is missing', async () => {
      await expect(
        brandAccountService.uploadProfilePicture('business-id-123', null as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Profile picture file is required',
      });
    });

    it('should throw error when file type is invalid', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(
        brandAccountService.uploadProfilePicture('business-id-123', invalidFile)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      });
    });

    it('should throw error when file size exceeds limit', async () => {
      const largeFile = {
        ...mockFile,
        size: 6 * 1024 * 1024, // 6MB
      };

      await expect(
        brandAccountService.uploadProfilePicture('business-id-123', largeFile)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'File size exceeds 5MB limit',
      });
    });

    it('should update brand profile with new picture URL', async () => {
      await brandAccountService.uploadProfilePicture('business-id-123', mockFile);

      expect(Business.findByIdAndUpdate).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          profilePictureUrl: expect.any(String),
        }),
        expect.any(Object)
      );
    });
  });

  describe('getProfileMetadata', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBusiness),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        plan: 'pro',
        planFeatures: ['feature1', 'feature2'],
      });
    });

    it('should return profile metadata', async () => {
      const result = await brandAccountService.getProfileMetadata('business-id-123');

      expect(result.accountCreated).toBeDefined();
      expect(result.planInfo).toBeDefined();
      expect(result.planInfo.currentPlan).toBeDefined();
      expect(result.planInfo.planFeatures).toBeDefined();
    });

    it('should include last login information', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockBusiness,
          lastLoginAt: new Date(),
        }),
      });

      const result = await brandAccountService.getProfileMetadata('business-id-123');

      expect(result.lastLogin).toBeDefined();
    });
  });

  describe('deactivateAccount', () => {
    const mockDeactivationData = {
      reason: 'User requested',
      feedback: 'No longer needed',
      deleteData: false,
      deactivatedBy: 'user-id-123',
      deactivationSource: 'self-service',
    };

    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBusiness);
      (Business.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBusiness,
        isActive: false,
        deactivatedAt: new Date(),
      });
    });

    it('should deactivate brand account', async () => {
      const result = await brandAccountService.deactivateAccount(
        'business-id-123',
        mockDeactivationData
      );

      expect(result.id).toBe('business-id-123');
      expect(result.deactivatedAt).toBeInstanceOf(Date);
      expect(result.reactivationPossible).toBe(true);
    });

    it('should throw error when brand is not found', async () => {
      (Business.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        brandAccountService.deactivateAccount('non-existent-id', mockDeactivationData)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should set data retention period', async () => {
      const result = await brandAccountService.deactivateAccount(
        'business-id-123',
        mockDeactivationData
      );

      expect(result.dataRetentionPeriod).toBeDefined();
    });
  });
});

