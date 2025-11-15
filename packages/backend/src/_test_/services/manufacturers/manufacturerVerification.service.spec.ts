/**
 * Manufacturer Verification Service Unit Tests
 * 
 * Tests manufacturer verification operations.
 */

import { VerificationService } from '../../../services/manufacturers/features/verification.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { Media } from '../../../models/media/media.model';
import { MediaService } from '../../../services/media';

// Mock dependencies
const mockMediaService = {
  saveMultipleMedia: jest.fn(),
};

// Mock services
jest.mock('../../../services/media', () => ({
  MediaService: jest.fn().mockImplementation(() => mockMediaService),
}));

// Mock models
jest.mock('../../../models/manufacturer/manufacturer.model');
jest.mock('../../../models/media/media.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('VerificationService', () => {
  let verificationService: VerificationService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockManufacturer = {
    _id: 'manufacturer-id-123',
    isVerified: false,
    verifiedAt: null,
    businessLicense: 'license-123',
    certifications: ['ISO 9001'],
    verificationSubmittedAt: null,
    verificationStatus: 'unverified',
  };

  beforeEach(() => {
    verificationService = new VerificationService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
  });

  describe('getVerificationStatus', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockManufacturer),
      });
      (Media.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
    });

    it('should return verification status for manufacturer', async () => {
      const result = await verificationService.getVerificationStatus('manufacturer-id-123');

      expect(Manufacturer.findById).toHaveBeenCalledWith('manufacturer-id-123');
      expect(result.isVerified).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should throw error when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        verificationService.getVerificationStatus('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'MANUFACTURER_NOT_FOUND',
      });
    });

    it('should mark requirements as completed based on manufacturer data', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockManufacturer,
          businessLicense: 'license-123',
        }),
      });

      const result = await verificationService.getVerificationStatus('manufacturer-id-123');

      const businessLicenseReq = result.requirements.find(r => r.type === 'business_license');
      expect(businessLicenseReq?.completed).toBe(true);
    });

    it('should include verification documents from media', async () => {
      const mockDocuments = [
        {
          _id: 'doc-id-1',
          filename: 'license.pdf',
          url: 'https://example.com/license.pdf',
          createdAt: new Date(),
        },
      ];
      (Media.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockDocuments),
      });

      const result = await verificationService.getVerificationStatus('manufacturer-id-123');

      expect(result.documents).toBeDefined();
      expect(result.documents.length).toBeGreaterThan(0);
    });

    it('should generate next steps based on verification status', async () => {
      const result = await verificationService.getVerificationStatus('manufacturer-id-123');

      expect(result.nextSteps).toBeDefined();
      expect(Array.isArray(result.nextSteps)).toBe(true);
    });
  });

  describe('getDetailedVerificationStatus', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockManufacturer),
      });
      (Media.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
    });

    it('should return detailed verification status with progress', async () => {
      const result = await verificationService.getDetailedVerificationStatus('manufacturer-id-123');

      expect(result.verification).toBeDefined();
      expect(result.progress).toBeDefined();
      expect(result.progress.completedRequirements).toBeDefined();
      expect(result.progress.totalRequirements).toBeDefined();
      expect(result.progress.completionPercentage).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should calculate completion percentage correctly', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockManufacturer,
          businessLicense: 'license-123',
        }),
      });

      const result = await verificationService.getDetailedVerificationStatus('manufacturer-id-123');

      expect(result.progress.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.progress.completionPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('submitVerificationDocuments', () => {
    const mockFiles = [
      {
        originalname: 'license.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        buffer: Buffer.from('test'),
      },
    ] as Express.Multer.File[];

    beforeEach(() => {
      mockMediaService.saveMultipleMedia.mockResolvedValue({
        successful: [
          {
            id: 'doc-id-1',
            filename: 'license.pdf',
            url: 'https://example.com/license.pdf',
          },
        ],
        failed: [],
      });
      (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockManufacturer);
    });

    it('should submit verification documents successfully', async () => {
      const result = await verificationService.submitVerificationDocuments(
        'manufacturer-id-123',
        mockFiles
      );

      expect(result.submissionId).toBeDefined();
      expect(result.status).toBe('submitted');
      expect(result.documentCount).toBe(mockFiles.length);
      expect(result.nextSteps).toBeDefined();
      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when no files provided', async () => {
      await expect(
        verificationService.submitVerificationDocuments('manufacturer-id-123', [])
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'MISSING_DOCUMENTS',
      });
    });

    it('should update manufacturer verification status to pending', async () => {
      await verificationService.submitVerificationDocuments('manufacturer-id-123', mockFiles);

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          verificationStatus: 'pending',
          verificationSubmittedAt: expect.any(Date),
        }),
        expect.any(Object)
      );
    });

    it('should throw error when file upload fails', async () => {
      mockMediaService.saveMultipleMedia.mockResolvedValue({
        successful: [],
        failed: [
          {
            filename: 'invalid.pdf',
            error: 'Upload failed',
          },
        ],
      });

      await expect(
        verificationService.submitVerificationDocuments('manufacturer-id-123', mockFiles)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'UPLOAD_FAILED',
      });
    });

    it('should validate file types and sizes', async () => {
      const invalidFile = {
        ...mockFiles[0],
        mimetype: 'application/executable',
      };

      await expect(
        verificationService.submitVerificationDocuments('manufacturer-id-123', [invalidFile])
      ).rejects.toThrow();
    });
  });
});

