/**
 * Manufacturer Verification Controller Unit Tests
 * 
 * Tests verification operations: get status, submit documents, review submissions.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerVerificationController } from '../../../../controllers/features/manufacturers/manufacturerVerification.controller';
import { verificationService } from '../../../../services/manufacturers/features/verification.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock verification service
jest.mock('../../../../services/manufacturers/features/verification.service', () => ({
  verificationService: {
    getVerificationStatus: jest.fn(),
    getDetailedVerificationStatus: jest.fn(),
    submitVerificationDocuments: jest.fn(),
    reviewVerificationSubmission: jest.fn(),
    getVerificationRequirements: jest.fn(),
    checkVerificationEligibility: jest.fn(),
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

describe('ManufacturerVerificationController', () => {
  let manufacturerVerificationController: ManufacturerVerificationController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerVerificationController = new ManufacturerVerificationController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('getVerificationStatus', () => {
    const mockStatus = {
      isVerified: false,
      status: 'pending',
      requirements: [],
      documents: [],
    };

    beforeEach(() => {
      (verificationService.getVerificationStatus as jest.Mock).mockResolvedValue(mockStatus);
    });

    it('should retrieve verification status', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.getVerificationStatus).toHaveBeenCalledWith('manufacturer-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.verificationStatus).toEqual(mockStatus);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('getDetailedVerificationStatus', () => {
    const mockDetailedStatus = {
      isVerified: false,
      status: 'pending',
      requirements: [],
      documents: [],
      reviewHistory: [],
      nextSteps: [],
    };

    beforeEach(() => {
      (verificationService.getDetailedVerificationStatus as jest.Mock).mockResolvedValue(
        mockDetailedStatus
      );
    });

    it('should retrieve detailed verification status', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerVerificationController.getDetailedVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.getDetailedVerificationStatus).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('submitVerificationDocuments', () => {
    const mockSubmission = {
      submissionId: 'submission-id-123',
      status: 'submitted',
    };

    beforeEach(() => {
      (verificationService.submitVerificationDocuments as jest.Mock).mockResolvedValue(
        mockSubmission
      );
    });

    it('should submit verification documents successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.files = [
        {
          buffer: Buffer.from('test'),
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      ];
      mockRequest.validatedBody = {
        metadata: {
          documentType: 'businessLicense',
        },
      };

      await manufacturerVerificationController.submitVerificationDocuments(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.submitVerificationDocuments).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when no files are provided', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.files = [];
      mockRequest.validatedBody = {};

      await manufacturerVerificationController.submitVerificationDocuments(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('reviewVerificationSubmission', () => {
    const mockReview = {
      submissionId: 'submission-id-123',
      decision: 'approve',
      reviewedAt: new Date(),
    };

    beforeEach(() => {
      (verificationService.reviewVerificationSubmission as jest.Mock).mockResolvedValue(mockReview);
    });

    it('should review submission with approve decision', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        submissionId: 'submission-id-123',
        decision: 'approve',
        reviewNotes: 'All documents verified',
        reviewerId: 'reviewer-id-123',
      };

      await manufacturerVerificationController.reviewVerificationSubmission(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.reviewVerificationSubmission).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'submission-id-123',
        'approve',
        expect.objectContaining({
          reviewNotes: 'All documents verified',
          reviewerId: 'reviewer-id-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should review submission with reject decision', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        submissionId: 'submission-id-123',
        decision: 'reject',
        reviewNotes: 'Documents incomplete',
      };

      await manufacturerVerificationController.reviewVerificationSubmission(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.reviewVerificationSubmission).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'submission-id-123',
        'reject',
        expect.any(Object)
      );
    });

    it('should return 400 when decision is invalid', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        submissionId: 'submission-id-123',
        decision: 'invalid-decision',
      };

      await manufacturerVerificationController.reviewVerificationSubmission(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getVerificationRequirements', () => {
    const mockRequirements = {
      requirements: [],
      plan: 'premium',
    };

    beforeEach(() => {
      (verificationService.getVerificationRequirements as jest.Mock).mockResolvedValue(
        mockRequirements
      );
    });

    it('should retrieve verification requirements', async () => {
      mockRequest.validatedQuery = {
        plan: 'premium',
      };

      await manufacturerVerificationController.getVerificationRequirements(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.getVerificationRequirements).toHaveBeenCalledWith('premium');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should retrieve default requirements when plan is not specified', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerVerificationController.getVerificationRequirements(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.getVerificationRequirements).toHaveBeenCalledWith(undefined);
    });
  });

  describe('checkVerificationEligibility', () => {
    const mockEligibility = {
      eligible: true,
      requirements: [],
      missingRequirements: [],
    };

    beforeEach(() => {
      (verificationService.checkVerificationEligibility as jest.Mock).mockResolvedValue(
        mockEligibility
      );
    });

    it('should check verification eligibility', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerVerificationController.checkVerificationEligibility(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(verificationService.checkVerificationEligibility).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Verification service unavailable',
      };
      (verificationService.getVerificationStatus as jest.Mock).mockRejectedValue(serviceError);

      await manufacturerVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerVerificationController,
        'recordPerformance' as any
      );
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      (verificationService.getVerificationStatus as jest.Mock).mockResolvedValue({
        isVerified: false,
        status: 'pending',
      });

      await manufacturerVerificationController.getVerificationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'GET_VERIFICATION_STATUS'
      );
    });
  });
});

