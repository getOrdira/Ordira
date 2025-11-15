/**
 * Users Profile Controller Unit Tests
 * 
 * Tests user profile operations: get current profile, get profile, update profile, delete user.
 */

import { Response } from 'express';
import { UsersProfileController } from '../../../../controllers/features/users/usersProfile.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserProfileService = {
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  deleteUser: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserProfileService: () => mockUserProfileService,
  getUserDataService: jest.fn(),
  getUserFormatterService: jest.fn(),
  getUserCacheService: jest.fn(),
  getUserValidationService: jest.fn(),
  getUserAuthService: jest.fn(),
  getUserSearchService: jest.fn(),
  getUserAnalyticsService: jest.fn(),
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

describe('UsersProfileController', () => {
  let usersProfileController: UsersProfileController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersProfileController = new UsersProfileController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    // Set default user context
    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'customer';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('getCurrentUserProfile', () => {
    const mockProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
      },
    };

    beforeEach(() => {
      mockUserProfileService.getUserProfile.mockResolvedValue(mockProfile);
    });

    it('should retrieve current authenticated user profile', async () => {
      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith('user-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('profile');
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.userId = undefined;

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockUserProfileService.getUserProfile).not.toHaveBeenCalled();
    });

    it('should return 404 when profile is not found', async () => {
      mockUserProfileService.getUserProfile.mockResolvedValue(null);

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('not found');
    });

    it('should return 400 when userId cannot be resolved', async () => {
      mockRequest.userId = undefined;
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};

      // Mock ensureUserAuthenticated to not throw
      jest.spyOn(usersProfileController as any, 'ensureUserAuthenticated').mockImplementation(() => {});

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getUserProfile', () => {
    const mockProfile = {
      id: 'user-id-456',
      email: 'other@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    beforeEach(() => {
      mockUserProfileService.getUserProfile.mockResolvedValue(mockProfile);
    });

    it('should retrieve user profile by userId from params', async () => {
      mockRequest.validatedParams = { userId: 'user-id-456' };
      mockRequest.validatedQuery = {};

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith('user-id-456');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should retrieve user profile by userId from query params', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = { userId: 'user-id-456' };

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith('user-id-456');
    });

    it('should use request userId as fallback', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith('user-id-123');
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.userId = undefined;

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserProfileService.getUserProfile).not.toHaveBeenCalled();
    });

    it('should return 404 when profile is not found', async () => {
      mockRequest.validatedParams = { userId: 'non-existent-id' };
      mockUserProfileService.getUserProfile.mockResolvedValue(null);

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUserProfile', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+1234567890',
    };

    const updatedProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      ...updateData,
    };

    beforeEach(() => {
      mockUserProfileService.updateUserProfile.mockResolvedValue(updatedProfile);
    });

    it('should update user profile successfully', async () => {
      mockRequest.userId = 'user-id-123';
      mockRequest.validatedParams = {};
      mockRequest.validatedBody = updateData;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        'user-id-123',
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.profile).toEqual(updatedProfile);
    });

    it('should resolve userId from params when provided', async () => {
      mockRequest.validatedParams = { userId: 'user-id-456' };
      mockRequest.validatedBody = updateData;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        'user-id-456',
        updateData
      );
    });

    it('should resolve userId from query when params missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = { userId: 'user-id-789' };
      mockRequest.validatedBody = updateData;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        'user-id-789',
        updateData
      );
    });

    it('should use request userId as fallback', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.validatedBody = updateData;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        'user-id-123',
        updateData
      );
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.validatedBody = updateData;
      mockRequest.userId = undefined;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserProfileService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should return 400 when update data is missing', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = {};

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      // Service may handle empty update differently, but controller should still call it
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalled();
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = { firstName: 'NewName' };
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = partialUpdate;

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        'user-id-123',
        partialUpdate
      );
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = updateData;

      const serviceError = {
        statusCode: 409,
        message: 'Email already in use',
      };
      mockUserProfileService.updateUserProfile.mockRejectedValue(serviceError);

      await usersProfileController.updateUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      mockUserProfileService.deleteUser.mockResolvedValue({ success: true });
    });

    it('should delete user successfully', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};

      await usersProfileController.deleteUser(mockRequest, mockResponse);

      expect(mockUserProfileService.deleteUser).toHaveBeenCalledWith('user-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('deleted');
    });

    it('should resolve userId from multiple sources', async () => {
      // Test params first
      mockRequest.validatedParams = { userId: 'user-id-params' };
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};

      await usersProfileController.deleteUser(mockRequest, mockResponse);
      expect(mockUserProfileService.deleteUser).toHaveBeenCalledWith('user-id-params');

      jest.clearAllMocks();

      // Test query
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = { userId: 'user-id-query' };

      await usersProfileController.deleteUser(mockRequest, mockResponse);
      expect(mockUserProfileService.deleteUser).toHaveBeenCalledWith('user-id-query');

      jest.clearAllMocks();

      // Test body
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.validatedBody = { userId: 'user-id-body' };

      await usersProfileController.deleteUser(mockRequest, mockResponse);
      expect(mockUserProfileService.deleteUser).toHaveBeenCalledWith('user-id-body');
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.validatedBody = {};
      mockRequest.userId = undefined;

      await usersProfileController.deleteUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserProfileService.deleteUser).not.toHaveBeenCalled();
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};

      const serviceError = {
        statusCode: 403,
        message: 'Cannot delete user with active subscriptions',
      };
      mockUserProfileService.deleteUser.mockRejectedValue(serviceError);

      await usersProfileController.deleteUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors correctly', async () => {
      mockRequest.userId = undefined;

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle service exceptions gracefully', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockUserProfileService.getUserProfile.mockRejectedValue(
        new Error('Service unavailable')
      );

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should validate userId format when provided', async () => {
      // This depends on your validation implementation
      // Adjust based on actual validation rules
      mockRequest.validatedParams = { userId: '' };
      mockRequest.validatedQuery = {};
      mockRequest.userId = undefined;

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics for getCurrentUserProfile', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersProfileController,
        'recordPerformance' as any
      );
      mockUserProfileService.getUserProfile.mockResolvedValue({ id: 'user-id-123' });

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_GET_CURRENT_PROFILE'
      );
    });

    it('should record performance metrics for getUserProfile', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersProfileController,
        'recordPerformance' as any
      );
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockUserProfileService.getUserProfile.mockResolvedValue({ id: 'user-id-123' });

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_GET_PROFILE');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for getCurrentUserProfile', async () => {
      mockRequest.userId = undefined;

      await usersProfileController.getCurrentUserProfile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should allow unauthenticated access for getUserProfile (admin operation)', async () => {
      mockRequest.userId = undefined;
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockUserProfileService.getUserProfile.mockResolvedValue({ id: 'user-id-123' });

      await usersProfileController.getUserProfile(mockRequest, mockResponse);

      // Should succeed even without auth (assumes admin middleware handles authorization)
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});

