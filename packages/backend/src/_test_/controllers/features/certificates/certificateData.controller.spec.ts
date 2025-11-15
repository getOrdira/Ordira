/**
 * Certificate Data Controller Unit Tests
 * 
 * Tests certificate data operations: get certificate, list certificates, update, delete, search, bulk operations.
 */

import { Response, NextFunction } from 'express';
import { CertificateDataController } from '../../../../controllers/features/certificates/certificateData.controller';
import { certificateDataService } from '../../../../services/certificates/core/certificateData.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock certificate services
jest.mock('../../../../services/certificates/core/certificateData.service', () => ({
  certificateDataService: {
    getCertificate: jest.fn(),
    listCertificates: jest.fn(),
    updateCertificate: jest.fn(),
    deleteCertificate: jest.fn(),
    getCertificatesByProduct: jest.fn(),
    getCertificatesByRecipient: jest.fn(),
    getCertificatesByBatch: jest.fn(),
    searchCertificates: jest.fn(),
    bulkUpdateCertificates: jest.fn(),
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

describe('CertificateDataController', () => {
  let certificateDataController: CertificateDataController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    certificateDataController = new CertificateDataController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (certificateDataController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (certificateDataController as any).recordPerformance = jest.fn();
    (certificateDataController as any).logAction = jest.fn();
    (certificateDataController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (certificateDataController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getCertificate', () => {
    const mockCertificate = {
      id: 'certificate-id-123',
      recipient: 'test@example.com',
      status: 'minted',
    };

    beforeEach(() => {
      (certificateDataService.getCertificate as jest.Mock).mockResolvedValue(mockCertificate);
    });

    it('should retrieve certificate successfully', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };

      await certificateDataController.getCertificate(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.getCertificate).toHaveBeenCalledWith(
        'certificate-id-123',
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.certificate).toEqual(mockCertificate);
    });
  });

  describe('listCertificates', () => {
    const mockCertificates = {
      certificates: [
        { id: 'certificate-id-1', status: 'minted' },
        { id: 'certificate-id-2', status: 'pending' },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      (certificateDataService.listCertificates as jest.Mock).mockResolvedValue(mockCertificates);
    });

    it('should list certificates with default pagination', async () => {
      mockRequest.validatedQuery = {};

      await certificateDataController.listCertificates(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.listCertificates).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply filters and pagination', async () => {
      mockRequest.validatedQuery = {
        status: 'minted',
        transferStatus: 'brand',
        page: 2,
        limit: 10,
        productId: 'product-id-123',
        search: 'test',
      };

      await certificateDataController.listCertificates(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.listCertificates).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          status: 'minted',
          transferStatus: 'brand',
          page: 2,
          limit: 10,
          productId: 'product-id-123',
          search: 'test',
        })
      );
    });
  });

  describe('updateCertificate', () => {
    const mockUpdated = {
      id: 'certificate-id-123',
      status: 'revoked',
      revoked: true,
    };

    beforeEach(() => {
      (certificateDataService.updateCertificate as jest.Mock).mockResolvedValue(mockUpdated);
    });

    it('should update certificate successfully', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };
      mockRequest.validatedBody = {
        status: 'revoked',
        revoked: true,
        revokedReason: 'Fraud detected',
      };

      await certificateDataController.updateCertificate(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.updateCertificate).toHaveBeenCalledWith(
        'certificate-id-123',
        'business-id-123',
        expect.objectContaining({
          status: 'revoked',
          revoked: true,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteCertificate', () => {
    beforeEach(() => {
      (certificateDataService.deleteCertificate as jest.Mock).mockResolvedValue({
        deleted: true,
      });
    });

    it('should delete certificate successfully', async () => {
      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };

      await certificateDataController.deleteCertificate(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.deleteCertificate).toHaveBeenCalledWith(
        'certificate-id-123',
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCertificatesByProduct', () => {
    const mockCertificates = [
      { id: 'certificate-id-1', product: 'product-id-123' },
      { id: 'certificate-id-2', product: 'product-id-123' },
    ];

    beforeEach(() => {
      (certificateDataService.getCertificatesByProduct as jest.Mock).mockResolvedValue(mockCertificates);
    });

    it('should retrieve certificates by product', async () => {
      mockRequest.validatedParams = {
        productId: 'product-id-123',
      };
      mockRequest.validatedQuery = {
        limit: 20,
        offset: 0,
      };

      await certificateDataController.getCertificatesByProduct(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.getCertificatesByProduct).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('searchCertificates', () => {
    const mockResults = [
      { id: 'certificate-id-1', recipient: 'test@example.com' },
    ];

    beforeEach(() => {
      (certificateDataService.searchCertificates as jest.Mock).mockResolvedValue(mockResults);
    });

    it('should search certificates successfully', async () => {
      mockRequest.validatedQuery = {
        searchTerm: 'test@example.com',
        limit: 10,
      };

      await certificateDataController.searchCertificates(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.searchCertificates).toHaveBeenCalledWith(
        'test@example.com',
        'business-id-123',
        expect.objectContaining({
          limit: 10,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('bulkUpdateCertificates', () => {
    const mockResult = {
      updated: 5,
      failed: 0,
    };

    beforeEach(() => {
      (certificateDataService.bulkUpdateCertificates as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should bulk update certificates successfully', async () => {
      mockRequest.validatedBody = {
        certificateIds: ['certificate-id-1', 'certificate-id-2'],
        updates: {
          status: 'revoked',
        },
      };

      await certificateDataController.bulkUpdateCertificates(mockRequest, mockResponse, mockNext);

      expect(certificateDataService.bulkUpdateCertificates).toHaveBeenCalledWith(
        'business-id-123',
        ['certificate-id-1', 'certificate-id-2'],
        { status: 'revoked' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 404,
        message: 'Certificate not found',
      };
      (certificateDataService.getCertificate as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedParams = {
        certificateId: 'non-existent-id',
      };

      await certificateDataController.getCertificate(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (certificateDataService.getCertificate as jest.Mock).mockResolvedValue({});

      mockRequest.validatedParams = {
        certificateId: 'certificate-id-123',
      };

      await certificateDataController.getCertificate(mockRequest, mockResponse, mockNext);

      expect((certificateDataController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_CERTIFICATE'
      );
    });
  });
});

