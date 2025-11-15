/**
 * Brand Verification Service Unit Tests
 * 
 * Tests brand verification operations.
 */

import { VerificationService } from '../../../services/brands/features/verification.service';
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';

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
}));

describe('VerificationService', () => {
  let verificationService: VerificationService;

  const mockBusiness = {
    _id: 'business-id-123',
    isEmailVerified: true,
    isPhoneVerified: false,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
  };

  const mockBrandSettings = {
    _id: 'settings-id-123',
    business: 'business-id-123',
    businessVerified: false,
    businessVerifiedAt: null,
    verificationDocuments: [],
    web3Settings: {
      walletVerified: false,
      walletVerifiedAt: null,
      certificateWallet: null,
    },
  };

  beforeEach(() => {
    verificationService = new VerificationService();
    jest.clearAllMocks();
  });

  describe('getVerificationStatus', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBusiness),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);
    });

    it('should return verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(result.email).toBeDefined();
      expect(result.phone).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.wallet).toBeDefined();
      expect(result.overallStatus).toBeDefined();
    });

    it('should return email verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(result.email.verified).toBe(true);
      expect(result.email.verifiedAt).toBeDefined();
    });

    it('should return phone verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(result.phone.verified).toBe(false);
    });

    it('should return business verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(result.business.verified).toBe(false);
      expect(result.business.documents).toBeDefined();
    });

    it('should return wallet verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(result.wallet.verified).toBe(false);
      expect(result.wallet.address).toBeNull();
    });

    it('should calculate overall verification status', async () => {
      const result = await verificationService.getVerificationStatus('business-id-123');

      expect(['verified', 'partial', 'unverified']).toContain(result.overallStatus);
    });

    it('should throw error when business is not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        verificationService.getVerificationStatus('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Business not found',
      });
    });
  });

  describe('submitVerification', () => {
    const mockVerificationData = {
      type: 'business' as const,
      documents: [
        {
          filename: 'license.pdf',
          url: 'https://example.com/license.pdf',
        },
      ],
      additionalInfo: {},
    };

    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBusiness);
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        verificationStatus: 'pending',
      });
    });

    it('should submit verification request successfully', async () => {
      const result = await verificationService.submitVerification(
        'business-id-123',
        mockVerificationData
      );

      expect(result.verificationId).toBeDefined();
      expect(result.status).toBe('submitted');
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.nextSteps).toBeDefined();
    });

    it('should throw error when business is not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(
        verificationService.submitVerification('non-existent-id', mockVerificationData)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Business not found',
      });
    });

    it('should handle wallet verification type', async () => {
      const walletData = {
        type: 'wallet' as const,
        additionalInfo: {
          walletAddress: '0x1234567890abcdef',
        },
      };

      const result = await verificationService.submitVerification(
        'business-id-123',
        walletData
      );

      expect(result.status).toBe('submitted');
    });
  });

  describe('getDetailedVerificationStatus', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBusiness),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);
    });

    it('should return detailed verification status', async () => {
      const result = await verificationService.getDetailedVerificationStatus('business-id-123');

      expect(result.history).toBeDefined();
      expect(result.pending).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.tips).toBeDefined();
    });

    it('should include verification history', async () => {
      const result = await verificationService.getDetailedVerificationStatus('business-id-123');

      expect(Array.isArray(result.history)).toBe(true);
    });

    it('should include pending verifications', async () => {
      const result = await verificationService.getDetailedVerificationStatus('business-id-123');

      expect(Array.isArray(result.pending)).toBe(true);
    });

    it('should include verification requirements', async () => {
      const result = await verificationService.getDetailedVerificationStatus('business-id-123');

      expect(result.requirements).toBeDefined();
    });

    it('should include tips for improving verification', async () => {
      const result = await verificationService.getDetailedVerificationStatus('business-id-123');

      expect(Array.isArray(result.tips)).toBe(true);
    });
  });
});

