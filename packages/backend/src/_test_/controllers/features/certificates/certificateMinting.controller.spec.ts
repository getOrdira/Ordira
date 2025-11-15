/**
 * Certificate Minting Controller Unit Tests
 * 
 * Tests certificate minting operations: create certificate, batch create, update image, delete assets.
 */

import { Response, NextFunction } from 'express';
import { CertificateMintingController } from '../../../../controllers/features/certificates/certificateMinting.controller';
import { mintingService } from '../../../../services/certificates/features/minting.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock minting service
jest.mock('../../../../services/certificates/features/minting.service', () => ({
  mintingService: {
    createCertificate: jest.fn(),
    createBatchCertificates: jest.fn(),
    updateCertificateImage: jest.fn(),
    deleteCertificateAssets: jest.fn(),
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

describe('CertificateMintingController', () => {
  let certificateMintingController: CertificateMintingController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    certificateMintingController = new CertificateMintingController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (certificateMintingController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (certificateMintingController as any).recordPerformance = jest.fn();
    (certificateMintingController as any).logAction = jest.fn();
    (certificateMintingController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (certificateMintingController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('createCertificate', () => {
    const mockCertificate = {
      _id: 'certificate-id-123',
      recipient: 'test@example.com',
      product: 'product-id-123',
      tokenId: 'token-id-123',
      status: 'minted',
    };

    beforeEach(() => {
      (mintingService.createCertificate as jest.Mock).mockResolvedValue(mockCertificate);
    });

    it('should create certificate successfully', async () => {
      mockRequest.validatedBody = {
        productId: 'product-id-123',
        recipient: 'test@example.com',
        contactMethod: 'email',
        metadata: {
          customMessage: 'Congratulations!',
          certificateLevel: 'gold',
        },
        deliveryOptions: {
          priority: 'standard',
          notifyRecipient: true,
        },
        web3Options: {
          autoTransfer: true,
          brandWallet: '0x123...',
        },
      };

      await certificateMintingController.createCertificate(mockRequest, mockResponse, mockNext);

      expect(mintingService.createCertificate).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.certificate).toEqual(mockCertificate);
    });
  });

  describe('createBatchCertificates', () => {
    const mockResult = {
      successful: [
        { id: 'certificate-id-1' },
        { id: 'certificate-id-2' },
      ],
      failed: [],
    };

    beforeEach(() => {
      (mintingService.createBatchCertificates as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should create batch certificates successfully', async () => {
      mockRequest.validatedBody = {
        certificates: [
          {
            productId: 'product-id-1',
            recipient: 'recipient1@example.com',
            contactMethod: 'email',
          },
          {
            productId: 'product-id-2',
            recipient: 'recipient2@example.com',
            contactMethod: 'email',
          },
        ],
      };

      await certificateMintingController.createBatchCertificates(mockRequest, mockResponse, mockNext);

      expect(mintingService.createBatchCertificates).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.validatedBody.certificates
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockResult);
    });
  });

  describe('updateCertificateImage', () => {
    const mockResult = {
      success: true,
      imageUrl: 'https://example.com/image.jpg',
    };

    beforeEach(() => {
      (mintingService.updateCertificateImage as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should update certificate image successfully', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'certificate.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      await certificateMintingController.updateCertificateImage(mockRequest, mockResponse, mockNext);

      expect(mintingService.updateCertificateImage).toHaveBeenCalledWith(
        'certificate-id-123',
        'business-id-123',
        mockRequest.file
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return error when file is missing', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };
      mockRequest.file = undefined;

      await certificateMintingController.updateCertificateImage(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteCertificateAssets', () => {
    beforeEach(() => {
      (mintingService.deleteCertificateAssets as jest.Mock).mockResolvedValue({});
    });

    it('should delete certificate assets successfully', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };

      await certificateMintingController.deleteCertificateAssets(mockRequest, mockResponse, mockNext);

      expect(mintingService.deleteCertificateAssets).toHaveBeenCalledWith(
        'certificate-id-123',
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Minting service unavailable',
      };
      (mintingService.createCertificate as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedBody = {
        productId: 'product-id-123',
        recipient: 'test@example.com',
        contactMethod: 'email',
      };

      await certificateMintingController.createCertificate(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mintingService.createCertificate as jest.Mock).mockResolvedValue({
        _id: 'certificate-id-123',
      });

      mockRequest.validatedBody = {
        productId: 'product-id-123',
        recipient: 'test@example.com',
        contactMethod: 'email',
      };

      await certificateMintingController.createCertificate(mockRequest, mockResponse, mockNext);

      expect((certificateMintingController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'CREATE_CERTIFICATE'
      );
    });
  });
});

