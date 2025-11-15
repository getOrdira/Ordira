/**
 * Brand Verification Controller Unit Tests
 * 
 * Tests brand verification operations: status, submit, detailed status, history, email verification, update status, statistics.
 */

import { Response, NextFunction } from 'express';
import { BrandVerificationController } from '../../../../controllers/features/brands/brandVerification.controller';
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
    verification: {
      getVerificationStatus: jest.fn().mockResolvedValue({
        overallStatus: 'pending',
        business: { verified: false },
      }),
      submitVerification: jest.fn().mockResolvedValue({}),
      getDetailedVerificationStatus: jest.fn().mockResolvedValue({
        overallStatus: 'pending',
        business: { verified: false },
      }),
      getVerificationHistory: jest.fn().mockResolvedValue([]),
      verifyEmail: jest.fn().mockResolvedValue({}),
      sendEmailVerification: jest.fn().mockResolvedValue({}),
      updateBusinessVerificationStatus: jest.fn().mockResolvedValue({}),
      getVerificationStatistics: jest.fn().mockResolvedValue({}),
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

describe('BrandVerificationController', () => {
  let brandVerificationController: BrandVerificationController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandVerificationController = new BrandVerificationController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockBrandServices = getBrandsServices();
    jest.clearAllMocks();

    // Set default return values for all mocks to prevent undefined errors
    (mockBrandServices.verification.getVerificationStatus as jest.Mock).mockResolvedValue({
      overallStatus: 'pending',
      business: { verified: false },
    });
    (mockBrandServices.verification.submitVerification as jest.Mock).mockResolvedValue({});
    (mockBrandServices.verification.getDetailedVerificationStatus as jest.Mock).mockResolvedValue({
      overallStatus: 'pending',
      business: { verified: false },
    });
    (mockBrandServices.verification.getVerificationHistory as jest.Mock).mockResolvedValue([]);
    (mockBrandServices.verification.verifyEmail as jest.Mock).mockResolvedValue({});
    (mockBrandServices.verification.sendEmailVerification as jest.Mock).mockResolvedValue({});
    (mockBrandServices.verification.updateBusinessVerificationStatus as jest.Mock).mockResolvedValue({});
    (mockBrandServices.verification.getVerificationStatistics as jest.Mock).mockResolvedValue({});

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandVerificationController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandVerificationController as any).recordPerformance = jest.fn();
    (brandVerificationController as any).logAction = jest.fn();
    (brandVerificationController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandVerificationController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getVerificationStatus', () => {
    const mockStatus = {
      overallStatus: 'pending',
      business: { verified: false },
    };

    beforeEach(() => {
      (mockBrandServices.verification.getVerificationStatus as jest.Mock).mockResolvedValue(
        mockStatus
      );
    });

    it('should retrieve verification status', async () => {
      await brandVerificationController.getVerificationStatus(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.verification.getVerificationStatus).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.status).toEqual(mockStatus);
    });
  });

  describe('submitVerification', () => {
    const mockResult = {
      verificationId: 'verification-id-123',
      submitted: true,
    };

    beforeEach(() => {
      (mockBrandServices.verification.submitVerification as jest.Mock).mockResolvedValue(
        mockResult
      );
    });

    it('should submit verification documents successfully', async () => {
      mockRequest.validatedBody = {
        businessLicense: 'license-url',
        taxId: 'tax-id-123',
        businessRegistration: 'registration-url',
      };

      await brandVerificationController.submitVerification(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.verification.submitVerification).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          type: 'business',
          documents: expect.any(Array),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getDetailedVerificationStatus', () => {
    const mockDetailedStatus = {
      overallStatus: 'pending',
      business: { verified: false },
      pending: [{ type: 'businessLicense', status: 'pending' }],
    };

    beforeEach(() => {
      (mockBrandServices.verification.getDetailedVerificationStatus as jest.Mock).mockResolvedValue(
        mockDetailedStatus
      );
    });

    it('should retrieve detailed verification status', async () => {
      await brandVerificationController.getDetailedVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.verification.getDetailedVerificationStatus).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getVerificationHistory', () => {
    const mockHistory = [
      { id: 'history-1', status: 'pending', submittedAt: new Date() },
      { id: 'history-2', status: 'approved', submittedAt: new Date() },
    ];

    beforeEach(() => {
      (mockBrandServices.verification.getVerificationHistory as jest.Mock).mockResolvedValue(
        mockHistory
      );
    });

    it('should retrieve verification history', async () => {
      await brandVerificationController.getVerificationHistory(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.verification.getVerificationHistory).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.history).toEqual(mockHistory);
    });
  });

  describe('verifyEmail', () => {
    const mockResult = {
      verified: true,
      message: 'Email verified successfully',
    };

    beforeEach(() => {
      (mockBrandServices.verification.verifyEmail as jest.Mock).mockResolvedValue(mockResult);
    });

    it('should verify email successfully', async () => {
      mockRequest.validatedBody = {
        verificationCode: 'code-123',
      };

      await brandVerificationController.verifyEmail(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.verification.verifyEmail).toHaveBeenCalledWith(
        'business-id-123',
        'code-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('sendEmailVerification', () => {
    const mockResult = {
      sent: true,
      message: 'Verification email sent',
    };

    beforeEach(() => {
      (mockBrandServices.verification.sendEmailVerification as jest.Mock).mockResolvedValue(
        mockResult
      );
    });

    it('should send email verification', async () => {
      await brandVerificationController.sendEmailVerification(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.verification.sendEmailVerification).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateBusinessVerificationStatus', () => {
    beforeEach(() => {
      (mockBrandServices.verification.updateBusinessVerificationStatus as jest.Mock).mockResolvedValue(
        {}
      );
    });

    it('should update business verification status to approved', async () => {
      mockRequest.validatedBody = {
        status: 'approved',
        notes: 'All documents verified',
        reviewerId: 'reviewer-id-123',
      };

      await brandVerificationController.updateBusinessVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.verification.updateBusinessVerificationStatus).toHaveBeenCalledWith(
        'business-id-123',
        'verified',
        'reviewer-id-123',
        'All documents verified'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update business verification status to rejected', async () => {
      mockRequest.validatedBody = {
        status: 'rejected',
        notes: 'Documents incomplete',
      };

      await brandVerificationController.updateBusinessVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.verification.updateBusinessVerificationStatus).toHaveBeenCalledWith(
        'business-id-123',
        'rejected',
        'user-id-123',
        'Documents incomplete'
      );
    });
  });

  describe('getVerificationStatistics', () => {
    const mockStats = {
      totalVerifications: 100,
      pendingVerifications: 10,
      approvedVerifications: 80,
    };

    beforeEach(() => {
      (mockBrandServices.verification.getVerificationStatistics as jest.Mock).mockResolvedValue(
        mockStats
      );
    });

    it('should retrieve verification statistics', async () => {
      mockRequest.validatedQuery = {
        timeframe: '30d',
        status: 'pending',
      };

      await brandVerificationController.getVerificationStatistics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.verification.getVerificationStatistics).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.stats).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Verification service unavailable',
      };
      (mockBrandServices.verification.getVerificationStatus as jest.Mock).mockRejectedValue(
        serviceError
      );

      await brandVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.verification.getVerificationStatus as jest.Mock).mockResolvedValue({
        overallStatus: 'pending',
      });

      await brandVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((brandVerificationController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_VERIFICATION_STATUS'
      );
    });
  });
});
