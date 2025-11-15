/**
 * Users Data Controller Unit Tests
 * 
 * Tests user data retrieval operations: get document, get profile, get by email, batch operations.
 */

import { Response } from 'express';
import { UsersDataController } from '../../../../controllers/features/users/usersData.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserDataService = {
  getUserDocumentById: jest.fn(),
  getUserProfileById: jest.fn(),
  getUserByEmail: jest.fn(),
  batchGetUsers: jest.fn(),
};

const mockUserFormatterService = {
  format: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/users', () => ({
  userDataService: mockUserDataService,
  userFormatterService: mockUserFormatterService,
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

describe('UsersDataController', () => {
  let usersDataController: UsersDataController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersDataController = new UsersDataController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    // Set default user context
    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'customer';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('getUserDocument', () => {
    const mockUserDocument = {
      _id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashed-password', // Should be sanitized
    };

    const mockFormattedProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
    };

    beforeEach(() => {
      mockUserFormatterService.format.mockReturnValue(mockFormattedProfile);
    });

    it('should retrieve user document by userId from params', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = { useCache: true };
      
      mockUserDataService.getUserDocumentById.mockResolvedValue(mockUserDocument);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockUserDataService.getUserDocumentById).toHaveBeenCalledWith(
        'user-id-123',
        { useCache: true }
      );
      expect(mockUserFormatterService.format).toHaveBeenCalledWith(mockUserDocument);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('profile');
      expect(responseData.data.profile).toEqual(mockFormattedProfile);
    });

    it('should retrieve user document by userId from query params', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = { userId: 'user-id-456', useCache: false };
      
      mockUserDataService.getUserDocumentById.mockResolvedValue(mockUserDocument);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockUserDataService.getUserDocumentById).toHaveBeenCalledWith(
        'user-id-456',
        { useCache: false }
      );
    });

    it('should use request userId when params and query are missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.userId = 'user-id-789';
      
      mockUserDataService.getUserDocumentById.mockResolvedValue(mockUserDocument);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockUserDataService.getUserDocumentById).toHaveBeenCalledWith(
        'user-id-789',
        { useCache: true } // Default value
      );
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};
      mockRequest.userId = undefined;

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserDataService.getUserDocumentById).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      mockRequest.validatedParams = { userId: 'non-existent-id' };
      mockRequest.validatedQuery = {};
      
      mockUserDataService.getUserDocumentById.mockResolvedValue(null);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('not found');
    });

    it('should handle cache parameter correctly', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      
      // Test with useCache = true
      mockRequest.validatedQuery = { useCache: true };
      await usersDataController.getUserDocument(mockRequest, mockResponse);
      expect(mockUserDataService.getUserDocumentById).toHaveBeenCalledWith(
        'user-id-123',
        { useCache: true }
      );

      jest.clearAllMocks();

      // Test with useCache = false
      mockRequest.validatedQuery = { useCache: false };
      await usersDataController.getUserDocument(mockRequest, mockResponse);
      expect(mockUserDataService.getUserDocumentById).toHaveBeenCalledWith(
        'user-id-123',
        { useCache: false }
      );
    });

    it('should sanitize user document before returning', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = {};
      
      mockUserDataService.getUserDocumentById.mockResolvedValue(mockUserDocument);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      // Verify formatter was called (which should sanitize)
      expect(mockUserFormatterService.format).toHaveBeenCalled();
      
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      // Verify password is not in response
      expect(JSON.stringify(responseData)).not.toContain('hashed-password');
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = {};
      
      const serviceError = {
        statusCode: 500,
        message: 'Database connection failed',
      };
      mockUserDataService.getUserDocumentById.mockRejectedValue(serviceError);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserProfileById', () => {
    const mockProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserDataService.getUserProfileById.mockResolvedValue(mockProfile);
    });

    it('should retrieve user profile by userId', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = { useCache: true };

      await usersDataController.getUserProfileById(mockRequest, mockResponse);

      expect(mockUserDataService.getUserProfileById).toHaveBeenCalledWith(
        'user-id-123',
        { useCache: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should return 404 when profile is not found', async () => {
      mockRequest.validatedParams = { userId: 'non-existent-id' };
      mockRequest.validatedQuery = {};
      
      mockUserDataService.getUserProfileById.mockResolvedValue(null);

      await usersDataController.getUserProfileById(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should use default cache value when not specified', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = {};

      await usersDataController.getUserProfileById(mockRequest, mockResponse);

      expect(mockUserDataService.getUserProfileById).toHaveBeenCalledWith(
        'user-id-123',
        { useCache: true }
      );
    });
  });

  describe('getUserByEmail', () => {
    const mockUserDocument = {
      _id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockFormattedProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserFormatterService.format.mockReturnValue(mockFormattedProfile);
    });

    it('should retrieve user by email from query params', async () => {
      mockRequest.validatedQuery = {
        email: 'test@example.com',
        skipCache: false,
      };

      mockUserDataService.getUserByEmail.mockResolvedValue(mockUserDocument);

      await usersDataController.getUserByEmail(mockRequest, mockResponse);

      expect(mockUserDataService.getUserByEmail).toHaveBeenCalledWith(
        'test@example.com',
        { skipCache: false }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.profile).toEqual(mockFormattedProfile);
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.validatedQuery = {};

      await usersDataController.getUserByEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserDataService.getUserByEmail).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      mockRequest.validatedQuery = { email: 'nonexistent@example.com' };
      
      mockUserDataService.getUserByEmail.mockResolvedValue(null);

      await usersDataController.getUserByEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle skipCache parameter', async () => {
      mockRequest.validatedQuery = {
        email: 'test@example.com',
        skipCache: true,
      };

      await usersDataController.getUserByEmail(mockRequest, mockResponse);

      expect(mockUserDataService.getUserByEmail).toHaveBeenCalledWith(
        'test@example.com',
        { skipCache: true }
      );
    });
  });

  describe('batchGetUsers', () => {
    const mockUsers = [
      { id: 'user-id-1', email: 'user1@example.com' },
      { id: 'user-id-2', email: 'user2@example.com' },
    ];

    beforeEach(() => {
      mockUserDataService.batchGetUsers.mockResolvedValue(mockUsers);
    });

    it('should retrieve multiple users by userIds', async () => {
      mockRequest.validatedBody = {
        userIds: ['user-id-1', 'user-id-2'],
        useCache: true,
      };

      await usersDataController.batchGetUsers(mockRequest, mockResponse);

      expect(mockUserDataService.batchGetUsers).toHaveBeenCalledWith(
        ['user-id-1', 'user-id-2'],
        { useCache: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.users).toEqual(mockUsers);
    });

    it('should return 400 when userIds array is missing', async () => {
      mockRequest.validatedBody = {};

      await usersDataController.batchGetUsers(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserDataService.batchGetUsers).not.toHaveBeenCalled();
    });

    it('should return 400 when userIds array is empty', async () => {
      mockRequest.validatedBody = { userIds: [] };

      await usersDataController.batchGetUsers(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty result set', async () => {
      mockRequest.validatedBody = {
        userIds: ['non-existent-1', 'non-existent-2'],
      };

      mockUserDataService.batchGetUsers.mockResolvedValue([]);

      await usersDataController.batchGetUsers(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.users).toEqual([]);
    });

    it('should use default cache value when not specified', async () => {
      mockRequest.validatedBody = {
        userIds: ['user-id-1'],
      };

      await usersDataController.batchGetUsers(mockRequest, mockResponse);

      expect(mockUserDataService.batchGetUsers).toHaveBeenCalledWith(
        ['user-id-1'],
        { useCache: true }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = {};

      const serviceError = new Error('Service unavailable');
      mockUserDataService.getUserDocumentById.mockRejectedValue(serviceError);

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle validation errors with appropriate status codes', async () => {
      const testCases = [
        { method: 'getUserDocument', missingField: 'userId' },
        { method: 'getUserByEmail', missingField: 'email' },
        { method: 'batchGetUsers', missingField: 'userIds' },
      ];

      for (const testCase of testCases) {
        mockRequest.validatedParams = {};
        mockRequest.validatedQuery = {};
        mockRequest.validatedBody = {};

        await (usersDataController as any)[testCase.method](mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
      }
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(usersDataController, 'recordPerformance' as any);

      mockRequest.validatedParams = { userId: 'user-id-123' };
      mockRequest.validatedQuery = {};
      mockUserDataService.getUserDocumentById.mockResolvedValue({ _id: 'user-id-123' });

      await usersDataController.getUserDocument(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_GET_DOCUMENT');
    });
  });
});

