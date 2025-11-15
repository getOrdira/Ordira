/**
 * Brand Wallet Service Unit Tests
 * 
 * Tests wallet management and Web3 operations.
 */

import { WalletService } from '../../../services/brands/features/wallet.service';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { ethers } from 'ethers';

// Mock models
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

describe('WalletService', () => {
  let walletService: WalletService;

  const mockBrandSettings = {
    _id: 'settings-id-123',
    business: 'business-id-123',
    web3Settings: {
      certificateWallet: '0x1234567890abcdef1234567890abcdef12345678',
      walletVerified: true,
      walletVerifiedAt: new Date(),
    },
  };

  beforeEach(() => {
    walletService = new WalletService();
    jest.clearAllMocks();
  });

  describe('validateWalletAddress', () => {
    const validAddress = '0x1234567890abcdef1234567890abcdef12345678';

    it('should validate valid Ethereum address', async () => {
      const result = await walletService.validateWalletAddress(validAddress);

      expect(result.valid).toBe(true);
      expect(result.address).toBeDefined();
    });

    it('should reject invalid address format', async () => {
      const invalidAddress = 'invalid-address';

      const result = await walletService.validateWalletAddress(invalidAddress);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid wallet address format');
    });

    it('should check if wallet is already in use', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        business: 'other-business-id',
      });

      const result = await walletService.validateWalletAddress(validAddress, {
        businessId: 'business-id-123',
        checkOwnership: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wallet address is already in use');
    });

    it('should verify wallet signature when provided', async () => {
      const result = await walletService.validateWalletAddress(validAddress, {
        requireSignature: true,
        signature: 'signature-123',
        message: 'Verify wallet ownership',
      });

      expect(result).toBeDefined();
      expect(result.verified).toBeDefined();
    });

    it('should return error when signature is required but missing', async () => {
      const result = await walletService.validateWalletAddress(validAddress, {
        requireSignature: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Signature and message are required');
    });
  });

  describe('getWalletVerificationStatus', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);
    });

    it('should return wallet verification status', async () => {
      const result = await walletService.getWalletVerificationStatus('business-id-123');

      expect(result.hasWallet).toBe(true);
      expect(result.walletAddress).toBe(mockBrandSettings.web3Settings.certificateWallet);
      expect(result.verified).toBe(true);
    });

    it('should return unverified status when wallet is not set', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        web3Settings: {},
      });

      const result = await walletService.getWalletVerificationStatus('business-id-123');

      expect(result.hasWallet).toBe(false);
      expect(result.verified).toBe(false);
    });

    it('should include discount information', async () => {
      const result = await walletService.getWalletVerificationStatus('business-id-123');

      expect(result.discountCount).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('getTokenDiscountInfo', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);
    });

    it('should return token discount information', async () => {
      const result = await walletService.getTokenDiscountInfo('business-id-123');

      expect(result.hasDiscounts).toBeDefined();
      expect(result.walletAddress).toBe(mockBrandSettings.web3Settings.certificateWallet);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should return empty discounts when none available', async () => {
      const result = await walletService.getTokenDiscountInfo('business-id-123');

      expect(result.discounts).toBeDefined();
      expect(Array.isArray(result.discounts)).toBe(true);
    });
  });

  describe('verifyWalletOwnership', () => {
    const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const mockSignature = '0xsignature123';
    const mockMessage = 'Verify wallet ownership';

    it('should verify wallet ownership with signature', async () => {
      const result = await walletService.verifyWalletOwnership(
        'business-id-123',
        validAddress,
        mockMessage,
        mockSignature
      );

      expect(result.verified).toBeDefined();
    });

    it('should return false when signature is invalid', async () => {
      const result = await walletService.verifyWalletOwnership(
        'business-id-123',
        validAddress,
        mockMessage,
        'invalid-signature'
      );

      expect(result.verified).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should save verification status when successful', async () => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        web3Settings: {
          ...mockBrandSettings.web3Settings,
          walletVerified: true,
          walletVerifiedAt: new Date(),
        },
      });

      const result = await walletService.verifyWalletOwnership(
        'business-id-123',
        validAddress,
        mockMessage,
        mockSignature
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('updateWalletAddress', () => {
    const newAddress = '0x9876543210fedcba9876543210fedcba98765432';

    beforeEach(() => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        web3Settings: {
          certificateWallet: newAddress,
        },
      });
    });

    it('should update wallet address', async () => {
      const result = await walletService.updateWalletAddress('business-id-123', newAddress);

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(result.walletAddress).toBe(newAddress);
    });

    it('should validate address before updating', async () => {
      const invalidAddress = 'invalid-address';

      await expect(
        walletService.updateWalletAddress('business-id-123', invalidAddress)
      ).rejects.toThrow();
    });

    it('should reset verification when address changes', async () => {
      await walletService.updateWalletAddress('business-id-123', newAddress);

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            'web3Settings.walletVerified': false,
          }),
        }),
        expect.any(Object)
      );
    });
  });
});

