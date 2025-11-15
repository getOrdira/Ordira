/**
 * Brand Account Controller Unit Tests
 * 
 * Tests brand account operations: get profile, update profile, upload picture, verification.
 */

import { Response, NextFunction } from 'express';
import { BrandAccountController } from '../../../../controllers/features/brands/brandAccount.controller';
import { BrandServices } from '../../../../services/brands';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
}));

// Mock brand services
jest.mock('../../../../services/brands', () => ({
  BrandServices: {
    account: {
      getComprehensiveBrandAccount: jest.fn(),
      updateBrandAccount: jest.fn(),
      uploadProfilePicture: jest.fn(),
      submitVerification: jest.fn(),
      getVerificationStatus: jest.fn(),
      generateProfileRecommendations: jest.fn(),
      generateImprovementRecommendations: jest.fn(),
      deactivateAccount: jest.fn(),
    },
  },
}));

// Mock notification services
jest.mock('../../../../services/notifications', () => ({
  getNotificationsServices: jest.fn(() => ({
    workflows: {
      eventHandlerService: {
        handle: jest.fn(),
      },
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

describe('BrandAccountController', () => {
  let brandAccountController: BrandAccountController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    brandAccountController = new BrandAccountController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
    mockRequest.file = undefined; // Initialize file property

    (brandAccountController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandAccountController as any).recordPerformance = jest.fn();
    (brandAccountController as any).logAction = jest.fn();
    (brandAccountController as any).sanitizeInput = jest.fn((data: any) => data);
    (brandAccountController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
          return result;
        } catch (error: any) {
          const statusCode = error.statusCode || 500;
          res.status(statusCode).json({ success: false, message: error.message });
          // Don't re-throw to prevent Jest worker crashes
        }
      }
    );
    (brandAccountController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 'brand-id-123',
      name: 'Test Brand',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (BrandServices.account.getComprehensiveBrandAccount as jest.Mock).mockResolvedValue(
        mockProfile
      );
    });

    it('should retrieve brand profile', async () => {
      mockRequest.validatedQuery = {};

      await brandAccountController.getProfile(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.getComprehensiveBrandAccount).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should require business user authentication', async () => {
      (brandAccountController as any).validateBusinessUser.mockImplementation(
        (req: any, res: any, callback: any) => {
          res.status(403).json({ success: false, message: 'Forbidden' });
        }
      );
      mockRequest.userType = 'customer';

      await brandAccountController.getProfile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      description: 'Updated description',
      industry: 'Updated Industry',
      contactEmail: 'updated@example.com',
    };

    const updatedProfile = {
      ...updateData,
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (BrandServices.account.updateBrandAccount as jest.Mock).mockResolvedValue(
        updatedProfile
      );
    });

    it('should update brand profile successfully', async () => {
      mockRequest.validatedBody = updateData;

      await brandAccountController.updateProfile(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.updateBrandAccount).toHaveBeenCalledWith(
        'business-id-123',
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle complex nested updates', async () => {
      mockRequest.validatedBody = {
        headquarters: {
          country: 'United States',
          city: 'New York',
        },
        businessInformation: {
          establishedYear: 2020,
          employeeCount: '50-100',
        },
        communicationPreferences: {
          preferredMethod: 'email',
          languages: ['en', 'es'],
        },
      };

      await brandAccountController.updateProfile(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.updateBrandAccount).toHaveBeenCalled();
    });
  });

  describe('uploadProfilePicture', () => {
    const mockUploadResult = {
      filename: 'profile.jpg',
      fileSize: 1024,
      url: 'https://example.com/profile.jpg',
    };

    beforeEach(() => {
      (BrandServices.account.uploadProfilePicture as jest.Mock).mockResolvedValue(
        mockUploadResult
      );
    });

    it('should upload profile picture successfully', async () => {
      mockRequest.file = {
        buffer: Buffer.from('test'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };

      await brandAccountController.uploadProfilePicture(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.uploadProfilePicture).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.file
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return error when file is missing', async () => {
      mockRequest.file = undefined;

      await brandAccountController.uploadProfilePicture(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('removeProfilePicture', () => {
    beforeEach(() => {
      (BrandServices.account.updateBrandAccount as jest.Mock).mockResolvedValue({});
    });

    it('should remove profile picture successfully', async () => {
      await brandAccountController.removeProfilePicture(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.updateBrandAccount).toHaveBeenCalledWith(
        'business-id-123',
        { profilePictureUrl: null }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('submitVerification', () => {
    const mockVerification = {
      id: 'verification-id-123',
      submittedAt: new Date(),
      status: 'pending',
    };

    beforeEach(() => {
      (BrandServices.account.submitVerification as jest.Mock).mockResolvedValue(
        mockVerification
      );
    });

    it('should submit verification documents successfully', async () => {
      mockRequest.validatedBody = {
        businessLicense: 'license-url',
        taxId: 'tax-id-123',
        businessRegistration: 'registration-url',
      };

      await brandAccountController.submitVerification(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.submitVerification).toHaveBeenCalledWith(
        'business-id-123',
        mockRequest.validatedBody
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.verificationResult).toEqual(mockVerification);
    });
  });

  describe('getVerificationStatus', () => {
    const mockStatus = {
      status: 'pending',
      verified: false,
      submittedAt: new Date(),
    };

    beforeEach(() => {
      (BrandServices.account.getVerificationStatus as jest.Mock).mockResolvedValue(mockStatus);
    });

    it('should retrieve verification status', async () => {
      await brandAccountController.getVerificationStatus(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.getVerificationStatus).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.status).toEqual(mockStatus);
    });
  });

  describe('getProfileCompleteness', () => {
    const mockProfile = {
      business: { name: 'Test Brand', id: 'business-id-123' },
      profileCompleteness: 75,
    };

    const mockRecommendations = [
      { type: 'profile', message: 'Add logo', priority: 'high' },
    ];

    beforeEach(() => {
      (BrandServices.account.getComprehensiveBrandAccount as jest.Mock).mockResolvedValue(
        mockProfile
      );
      (BrandServices.account.generateProfileRecommendations as jest.Mock).mockReturnValue(
        mockRecommendations
      );
    });

    it('should retrieve profile completeness', async () => {
      await brandAccountController.getProfileCompleteness(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.getComprehensiveBrandAccount).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(BrandServices.account.generateProfileRecommendations).toHaveBeenCalledWith(
        mockProfile.business,
        'foundation'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.completeness.score).toBe(75);
      expect(responseData.data.completeness.recommendations).toEqual(mockRecommendations);
    });
  });

  describe('getProfileRecommendations', () => {
    const mockProfile = {
      business: { name: 'Test Brand', id: 'business-id-123' },
      profileCompleteness: 75,
    };
    const mockRecommendations = [
      { type: 'profile', message: 'Add logo', priority: 'high' },
      { type: 'settings', message: 'Configure domain', priority: 'medium' },
    ];

    beforeEach(() => {
      (BrandServices.account.getComprehensiveBrandAccount as jest.Mock).mockResolvedValue(
        mockProfile
      );
      (BrandServices.account.generateImprovementRecommendations as jest.Mock).mockReturnValue(
        mockRecommendations
      );
    });

    it('should retrieve profile recommendations', async () => {
      await brandAccountController.getProfileRecommendations(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.getComprehensiveBrandAccount).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(BrandServices.account.generateImprovementRecommendations).toHaveBeenCalledWith(
        mockProfile.business
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.recommendations).toEqual(mockRecommendations);
    });
  });

  describe('deactivateAccount', () => {
    const mockDeactivation = {
      deactivatedAt: new Date(),
      reason: 'User requested',
      dataRetentionPeriod: 90,
    };

    beforeEach(() => {
      (BrandServices.account.deactivateAccount as jest.Mock).mockResolvedValue(
        mockDeactivation
      );
      mockRequest.body = {
        reason: 'User requested',
        feedback: 'Test feedback',
        deleteData: false,
      };
    });

    it('should deactivate account successfully', async () => {
      await brandAccountController.deactivateAccount(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.deactivateAccount).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          reason: 'User requested',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('reactivateAccount', () => {
    beforeEach(() => {
      (BrandServices.account.updateBrandAccount as jest.Mock).mockResolvedValue({
        isActive: true,
      });
    });

    it('should reactivate account successfully', async () => {
      await brandAccountController.reactivateAccount(mockRequest, mockResponse, mockNext);

      expect(BrandServices.account.updateBrandAccount).toHaveBeenCalledWith(
        'business-id-123',
        { isActive: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Account service unavailable',
      };
      (BrandServices.account.getComprehensiveBrandAccount as jest.Mock).mockRejectedValue(
        serviceError
      );

      await brandAccountController.getProfile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (BrandServices.account.getComprehensiveBrandAccount as jest.Mock).mockResolvedValue({});

      await brandAccountController.getProfile(mockRequest, mockResponse, mockNext);

      expect((brandAccountController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_BRAND_PROFILE'
      );
    });
  });
});
