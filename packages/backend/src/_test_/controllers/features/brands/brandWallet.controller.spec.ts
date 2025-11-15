/**
 * Brand Wallet Controller Unit Tests
 * 
 * Tests brand wallet operations: validate wallet, verify ownership, get verification status, update token discounts, update certificate wallet, batch updates, handle address change, generate verification message, get statistics.
 */

import { Response, NextFunction } from 'express';
import { BrandWalletController } from '../../../../controllers/features/brands/brandWallet.controller';
import { getBrandsServices } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
  getBrandsServices: jest.fn(() => ({
    wallet: {
      validateWalletAddress: jest.fn().mockResolvedValue({
        valid: true,
        verified: false,
      }),
      verifyWalletOwnership: jest.fn().mockResolvedValue({
        verified: true,
        verifiedAt: new Date(),
      }),
      getWalletVerificationStatus: jest.fn().mockResolvedValue({
        verified: false,
      }),
      updateTokenDiscounts: jest.fn().mockResolvedValue({}),
      updateCertificateWallet: jest.fn().mockResolvedValue({
        verifiedAt: new Date(),
      }),
      batchUpdateTokenDiscounts: jest.fn().mockResolvedValue([]),
      handleWalletAddressChange: jest.fn().mockResolvedValue({}),
      generateVerificationMessage: jest.fn().mockReturnValue(''),
      getWalletStatistics: jest.fn().mockResolvedValue({}),
    },
  })),
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

describe('BrandWalletController', () => {
  let brandWalletController: BrandWalletController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandWalletController = new BrandWalletController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockBrandServices = getBrandsServices();
    jest.clearAllMocks();

    // Set default return values for all mocks to prevent undefined errors
    (mockBrandServices.wallet.validateWalletAddress as jest.Mock).mockResolvedValue({
      valid: true,
      verified: false,
    });
    (mockBrandServices.wallet.verifyWalletOwnership as jest.Mock).mockResolvedValue({
      verified: true,
      verifiedAt: new Date(),
    });
    (mockBrandServices.wallet.getWalletVerificationStatus as jest.Mock).mockResolvedValue({
      verified: false,
    });
    (mockBrandServices.wallet.updateTokenDiscounts as jest.Mock).mockResolvedValue({});
    (mockBrandServices.wallet.updateCertificateWallet as jest.Mock).mockResolvedValue({
      verifiedAt: new Date(),
    });
    (mockBrandServices.wallet.batchUpdateTokenDiscounts as jest.Mock).mockResolvedValue([]);
    (mockBrandServices.wallet.handleWalletAddressChange as jest.Mock).mockResolvedValue({});
    (mockBrandServices.wallet.generateVerificationMessage as jest.Mock).mockReturnValue('');
    (mockBrandServices.wallet.getWalletStatistics as jest.Mock).mockResolvedValue({});

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandWalletController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandWalletController as any).recordPerformance = jest.fn();
    (brandWalletController as any).logAction = jest.fn();
    (brandWalletController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandWalletController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('validateWalletAddress', () => {
    const mockValidation = {
      valid: true,
      verified: false,
      address: '0x123...',
    };

    beforeEach(() => {
      (mockBrandServices.wallet.validateWalletAddress as jest.Mock).mockResolvedValue(
        mockValidation
      );
    });

    it('should validate wallet address successfully', async () => {
      mockRequest.validatedBody = {
        address: '0x123...',
        options: {
          checkBalance: true,
          validateFormat: true,
        },
      };

      await brandWalletController.validateWalletAddress(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.validateWalletAddress).toHaveBeenCalledWith(
        '0x123...',
        expect.objectContaining({
          businessId: 'business-id-123',
          checkOwnership: true,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockValidation);
    });
  });

  describe('verifyWalletOwnership', () => {
    const mockResult = {
      verified: true,
      verifiedAt: new Date(),
    };

    beforeEach(() => {
      (mockBrandServices.wallet.verifyWalletOwnership as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should verify wallet ownership successfully', async () => {
      mockRequest.validatedBody = {
        walletAddress: '0x123...',
        signature: 'signature-123',
        message: 'Verification message',
      };

      await brandWalletController.verifyWalletOwnership(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.verifyWalletOwnership).toHaveBeenCalledWith(
        'business-id-123',
        '0x123...',
        'signature-123',
        'Verification message'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
    });
  });

  describe('getWalletVerificationStatus', () => {
    const mockStatus = {
      verified: true,
      walletAddress: '0x123...',
      verifiedAt: new Date(),
    };

    beforeEach(() => {
      (mockBrandServices.wallet.getWalletVerificationStatus as jest.Mock).mockResolvedValue(
        mockStatus
      );
    });

    it('should retrieve wallet verification status', async () => {
      await brandWalletController.getWalletVerificationStatus(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.getWalletVerificationStatus).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.status).toEqual(mockStatus);
    });
  });

  describe('updateTokenDiscounts', () => {
    const mockResult = {
      updated: true,
      discounts: [],
    };

    beforeEach(() => {
      (mockBrandServices.wallet.updateTokenDiscounts as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should update token discounts successfully', async () => {
      mockRequest.validatedBody = {
        walletAddress: '0x123...',
        discounts: [
          { tokenAddress: 'token-1', discountPercentage: 10 },
        ],
      };

      await brandWalletController.updateTokenDiscounts(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.updateTokenDiscounts).toHaveBeenCalledWith(
        'business-id-123',
        '0x123...'
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateCertificateWallet', () => {
    const mockResult = {
      verifiedAt: new Date(),
    };

    beforeEach(() => {
      (mockBrandServices.wallet.updateCertificateWallet as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should update certificate wallet successfully', async () => {
      mockRequest.validatedBody = {
        walletAddress: '0x123...',
        isDefault: true,
        metadata: { chainId: 1 },
      };

      await brandWalletController.updateCertificateWallet(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.updateCertificateWallet).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          certificateWallet: '0x123...',
          verificationData: { chainId: 1 },
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
    });
  });

  describe('batchUpdateTokenDiscounts', () => {
    const mockResults = [
      { businessId: 'business-id-1', updated: true },
      { businessId: 'business-id-2', updated: true },
    ];

    beforeEach(() => {
      (mockBrandServices.wallet.batchUpdateTokenDiscounts as jest.Mock).mockResolvedValue(
        mockResults
      );
    });

    it('should batch update token discounts successfully', async () => {
      mockRequest.validatedBody = {
        businessIds: ['business-id-1', 'business-id-2'],
        discounts: [{ tokenAddress: 'token-1', discountPercentage: 10 }],
      };

      await brandWalletController.batchUpdateTokenDiscounts(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.wallet.batchUpdateTokenDiscounts).toHaveBeenCalledWith(
        ['business-id-1', 'business-id-2']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.results).toEqual(mockResults);
    });
  });

  describe('handleWalletAddressChange', () => {
    beforeEach(() => {
      (mockBrandServices.wallet.handleWalletAddressChange as jest.Mock).mockResolvedValue({});
    });

    it('should handle wallet address change successfully', async () => {
      mockRequest.validatedBody = {
        newWallet: '0x456...',
        oldWallet: '0x123...',
        signature: 'signature-123',
      };

      await brandWalletController.handleWalletAddressChange(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.handleWalletAddressChange).toHaveBeenCalledWith(
        'business-id-123',
        '0x456...',
        '0x123...'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.message).toBe('Wallet address change processed');
    });
  });

  describe('generateVerificationMessage', () => {
    beforeEach(() => {
      (mockBrandServices.wallet.generateVerificationMessage as jest.Mock).mockReturnValue(
        'Verification message'
      );
    });

    it('should generate verification message successfully', async () => {
      mockRequest.validatedBody = {
        timestamp: 1234567890,
      };

      await brandWalletController.generateVerificationMessage(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.wallet.generateVerificationMessage).toHaveBeenCalledWith(
        'business-id-123',
        1234567890
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use current timestamp when not provided', async () => {
      mockRequest.validatedBody = {};

      await brandWalletController.generateVerificationMessage(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.wallet.generateVerificationMessage).toHaveBeenCalledWith(
        'business-id-123',
        expect.any(Number)
      );
    });
  });

  describe('getWalletStatistics', () => {
    const mockStats = {
      totalConnectedWallets: 100,
      verifiedWallets: 80,
    };

    beforeEach(() => {
      (mockBrandServices.wallet.getWalletStatistics as jest.Mock).mockResolvedValue(mockStats);
    });

    it('should retrieve wallet statistics', async () => {
      await brandWalletController.getWalletStatistics(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.wallet.getWalletStatistics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.stats).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Wallet service unavailable',
      };
      (mockBrandServices.wallet.validateWalletAddress as jest.Mock).mockRejectedValue(
        serviceError
      );

      mockRequest.validatedBody = {
        address: '0x123...',
      };

      await brandWalletController.validateWalletAddress(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.wallet.validateWalletAddress as jest.Mock).mockResolvedValue({
        valid: true,
      });

      mockRequest.validatedBody = {
        address: '0x123...',
      };

      await brandWalletController.validateWalletAddress(mockRequest, mockResponse, mockNext);

      expect((brandWalletController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'VALIDATE_WALLET_ADDRESS'
      );
    });
  });
});
