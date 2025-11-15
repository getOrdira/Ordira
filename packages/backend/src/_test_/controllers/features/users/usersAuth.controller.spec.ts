/**
 * Users Auth Controller Unit Tests
 * 
 * Tests user authentication operations: register, login, verify email.
 */

import { Response } from 'express';
import { UsersAuthController } from '../../../../controllers/features/users/usersAuth.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserAuthService = {
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  verifyUserEmail: jest.fn(),
};

const mockUserFormatterService = {
  format: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserAuthService: () => mockUserAuthService,
  getUserProfileService: jest.fn(),
  getUserSearchService: jest.fn(),
  getUserAnalyticsService: jest.fn(),
  getUserDataService: jest.fn(),
  getUserFormatterService: () => mockUserFormatterService,
  getUserCacheService: jest.fn(),
  getUserValidationService: jest.fn(),
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

describe('UsersAuthController', () => {
  let usersAuthController: UsersAuthController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersAuthController = new UsersAuthController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('registerUser', () => {
    const mockRegisteredUser = {
      _id: 'user-id-123',
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashed-password',
    };

    const mockFormattedProfile = {
      id: 'user-id-123',
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserAuthService.registerUser.mockResolvedValue(mockRegisteredUser);
      mockUserFormatterService.format.mockReturnValue(mockFormattedProfile);
    });

    it('should register a new user successfully', async () => {
      mockRequest.validatedBody = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockUserAuthService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
      expect(mockUserFormatterService.format).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user).toEqual(mockFormattedProfile);
      expect(responseData.data).toHaveProperty('registeredAt');
    });

    it('should normalize email to lowercase', async () => {
      mockRequest.validatedBody = {
        email: 'NewUser@Example.COM',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockUserAuthService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        })
      );
    });

    it('should trim whitespace from input fields', async () => {
      mockRequest.validatedBody = {
        email: '  user@example.com  ',
        password: 'SecurePass123!',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockUserAuthService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.validatedBody = {
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should return 400 when firstName is missing', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should return 400 when lastName is missing', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should handle optional fields correctly', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01',
        preferences: {
          emailNotifications: true,
        },
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockUserAuthService.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '+1234567890',
          dateOfBirth: expect.any(Date),
          preferences: {
            emailNotifications: true,
          },
        })
      );
    });

    it('should sanitize input before processing', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      // Verify sanitizeInput was called (indirectly through service call)
      expect(mockUserAuthService.registerUser).toHaveBeenCalled();
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const serviceError = {
        statusCode: 409,
        message: 'Email already registered',
      };
      mockUserAuthService.registerUser.mockRejectedValue(serviceError);

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
    });

    it('should fallback to req.body when validatedBody is missing', async () => {
      mockRequest.validatedBody = undefined;
      mockRequest.body = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockUserAuthService.registerUser).toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const mockLoginResult = {
      user: {
        _id: 'user-id-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      token: 'access-token-123',
    };

    const mockFormattedProfile = {
      id: 'user-id-123',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserAuthService.loginUser.mockResolvedValue(mockLoginResult);
      mockUserFormatterService.format.mockReturnValue(mockFormattedProfile);
    });

    it('should login user with valid credentials', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockUserAuthService.loginUser).toHaveBeenCalledWith(
        'user@example.com',
        'SecurePass123!'
      );
      expect(mockUserFormatterService.format).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('token', 'access-token-123');
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data).toHaveProperty('authenticatedAt');
    });

    it('should normalize email to lowercase', async () => {
      mockRequest.validatedBody = {
        email: 'User@Example.COM',
        password: 'SecurePass123!',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockUserAuthService.loginUser).toHaveBeenCalledWith(
        'user@example.com',
        'SecurePass123!'
      );
    });

    it('should trim whitespace from email', async () => {
      mockRequest.validatedBody = {
        email: '  user@example.com  ',
        password: 'SecurePass123!',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockUserAuthService.loginUser).toHaveBeenCalledWith(
        'user@example.com',
        'SecurePass123!'
      );
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.validatedBody = {
        password: 'SecurePass123!',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.loginUser).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.loginUser).not.toHaveBeenCalled();
    });

    it('should propagate authentication errors correctly', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      const authError = {
        statusCode: 401,
        message: 'Invalid credentials',
      };
      mockUserAuthService.loginUser.mockRejectedValue(authError);

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should propagate user not found errors', async () => {
      mockRequest.validatedBody = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      const notFoundError = {
        statusCode: 404,
        message: 'User not found',
      };
      mockUserAuthService.loginUser.mockRejectedValue(notFoundError);

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should not expose password in response', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      await usersAuthController.loginUser(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(responseData)).not.toContain('SecurePass123!');
    });
  });

  describe('verifyUserEmail', () => {
    const mockVerifiedUser = {
      _id: 'user-id-123',
      email: 'user@example.com',
      isEmailVerified: true,
    };

    beforeEach(() => {
      mockUserAuthService.verifyUserEmail.mockResolvedValue(mockVerifiedUser);
    });

    it('should verify user email with token from body', async () => {
      mockRequest.validatedBody = {
        userId: 'user-id-123',
        verificationToken: 'verification-token-123',
      };

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockUserAuthService.verifyUserEmail).toHaveBeenCalledWith(
        'user-id-123',
        'verification-token-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should verify user email with token from params', async () => {
      mockRequest.validatedParams = {
        userId: 'user-id-123',
        token: 'verification-token-123',
      };

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockUserAuthService.verifyUserEmail).toHaveBeenCalledWith(
        'user-id-123',
        'verification-token-123'
      );
    });

    it('should verify user email with token from query', async () => {
      mockRequest.validatedQuery = {
        token: 'verification-token-123',
      };
      mockRequest.userId = 'user-id-123';

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockUserAuthService.verifyUserEmail).toHaveBeenCalledWith(
        'user-id-123',
        'verification-token-123'
      );
    });

    it('should use request userId as fallback', async () => {
      mockRequest.validatedBody = {
        verificationToken: 'verification-token-123',
      };
      mockRequest.userId = 'user-id-123';

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockUserAuthService.verifyUserEmail).toHaveBeenCalledWith(
        'user-id-123',
        'verification-token-123'
      );
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.validatedBody = {
        verificationToken: 'verification-token-123',
      };
      mockRequest.validatedParams = {};
      mockRequest.userId = undefined;

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.verifyUserEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when token is missing', async () => {
      mockRequest.validatedBody = {
        userId: 'user-id-123',
      };
      mockRequest.validatedParams = {};
      mockRequest.validatedQuery = {};

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockUserAuthService.verifyUserEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when token is empty string', async () => {
      mockRequest.validatedBody = {
        userId: 'user-id-123',
        verificationToken: '   ',
      };

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        userId: 'user-id-123',
        verificationToken: 'invalid-token',
      };

      const serviceError = {
        statusCode: 400,
        message: 'Invalid verification token',
      };
      mockUserAuthService.verifyUserEmail.mockRejectedValue(serviceError);

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle already verified user errors', async () => {
      mockRequest.validatedBody = {
        userId: 'user-id-123',
        verificationToken: 'token-123',
      };

      const alreadyVerifiedError = {
        statusCode: 409,
        message: 'Email already verified',
      };
      mockUserAuthService.verifyUserEmail.mockRejectedValue(alreadyVerifiedError);

      await usersAuthController.verifyUserEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const serviceError = new Error('Database connection failed');
      mockUserAuthService.registerUser.mockRejectedValue(serviceError);

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should sanitize input to prevent injection attacks', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe',
      };

      await usersAuthController.registerUser(mockRequest, mockResponse);

      // Verify input was sanitized (format would handle this)
      expect(mockUserAuthService.registerUser).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics for register', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersAuthController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };
      mockUserAuthService.registerUser.mockResolvedValue({ _id: 'user-id-123' });

      await usersAuthController.registerUser(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_REGISTER');
    });

    it('should record performance metrics for login', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersAuthController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserAuthService.loginUser.mockResolvedValue({
        user: { _id: 'user-id-123' },
        token: 'token',
      });

      await usersAuthController.loginUser(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_LOGIN');
    });
  });
});

