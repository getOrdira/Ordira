/**
 * Auth Controller Unit Tests
 * 
 * Tests request->service wiring, error propagation, and HTTP status codes.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../../controllers/core/auth.controller';
import { authService } from '../../../services/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../utils/__tests__/testHelpers';

// Mock the auth service
jest.mock('../../../services/auth', () => ({
  authService: {
    loginUser: jest.fn(),
    registerUser: jest.fn(),
    verifyUser: jest.fn(),
    resendUserVerification: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login user and return 200', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        rememberMe: false,
      };

      (authService.loginUser as jest.Mock).mockResolvedValue({
        userId: 'user-id-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
        token: 'access-token',
        rememberToken: 'remember-token',
      });

      mockRequest.validatedBody = loginData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.login(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(authService.loginUser).toHaveBeenCalledWith({
        email: loginData.email,
        password: loginData.password,
        rememberMe: false,
        securityContext: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      
      // Verify actual response structure matches controller implementation
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user).toHaveProperty('id', 'user-id-123');
      expect(responseData.data.user).toHaveProperty('email', 'test@example.com');
      expect(responseData.data.user).toHaveProperty('firstName', 'Test');
      expect(responseData.data.user).toHaveProperty('lastName', 'User');
      expect(responseData.data.user).toHaveProperty('isEmailVerified', true);
      expect(responseData.data.user).toHaveProperty('preferences');
      expect(responseData.data).toHaveProperty('token', 'access-token');
      expect(responseData.data).toHaveProperty('rememberToken', 'remember-token');
      expect(responseData.message).toBe('Login successful');
    });

    it('should propagate authentication errors with 401 status', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
        rememberMe: false,
      };

      const authError = { statusCode: 401, message: 'Invalid credentials', isOperational: true };
      (authService.loginUser as jest.Mock).mockRejectedValue(authError);

      mockRequest.validatedBody = loginData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.login(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle service exceptions and propagate errors', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        rememberMe: false,
      };

      const serviceError = new Error('Database connection failed');
      (authService.loginUser as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedBody = loginData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.login(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      // Controller sends error response via sendError, not next()
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should successfully register user and return 200', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      (authService.registerUser as jest.Mock).mockResolvedValue({
        userId: 'user-id-123',
        email: 'newuser@example.com',
        verificationRequired: true,
      });

      mockRequest.validatedBody = registerData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.register(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      // Verify service was called with correct parameters including securityContext
      expect(authService.registerUser).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        securityContext: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
      
      // handleAsync defaults to 200 status code
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      
      // Verify actual response structure matches controller implementation
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user).toHaveProperty('id', 'user-id-123');
      expect(responseData.data.user).toHaveProperty('email', 'newuser@example.com');
      expect(responseData.data).toHaveProperty('message', 'Registration successful. Please check your email for verification.');
      expect(responseData.data).toHaveProperty('verificationRequired', true);
      expect(responseData.message).toBe('Registration successful');
    });

    it('should propagate validation errors with 400 status', async () => {
      const registerData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: 'John',
        lastName: 'Doe',
      };

      const validationError = {
        statusCode: 400,
        message: 'Validation failed',
        details: { email: 'Invalid email format' },
        isOperational: true,
      };
      (authService.registerUser as jest.Mock).mockRejectedValue(
        validationError
      );

      mockRequest.validatedBody = registerData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.register(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should propagate duplicate email errors with 409 status', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const duplicateError = {
        statusCode: 409,
        message: 'Email is already registered',
        isOperational: true,
      };
      (authService.registerUser as jest.Mock).mockRejectedValue(duplicateError);

      mockRequest.validatedBody = registerData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.register(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('should successfully verify user email and return 200', async () => {
      const verifyData = {
        email: 'test@example.com',
        code: '123456',
      };

      (authService.verifyUser as jest.Mock).mockResolvedValue({
        userId: 'user-id-123',
        email: 'test@example.com',
        token: 'access-token',
      });

      mockRequest.validatedBody = verifyData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.verify(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(authService.verifyUser).toHaveBeenCalledWith({
        email: verifyData.email,
        code: verifyData.code,
        securityContext: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      
      // Verify actual response structure matches controller implementation
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user).toHaveProperty('id', 'user-id-123');
      expect(responseData.data.user).toHaveProperty('email', 'test@example.com');
      expect(responseData.data).toHaveProperty('token', 'access-token');
      expect(responseData.message).toBe('Email verification successful');
    });

    it('should propagate invalid code errors with 400 status', async () => {
      const verifyData = {
        email: 'test@example.com',
        code: '000000',
      };

      const invalidCodeError = {
        statusCode: 400,
        message: 'Invalid verification code',
        isOperational: true,
      };
      (authService.verifyUser as jest.Mock).mockRejectedValue(
        invalidCodeError
      );

      mockRequest.validatedBody = verifyData;
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.verify(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should map domain errors to HTTP status codes', async () => {
      const errors = [
        { statusCode: 400, expectedStatus: 400 }, // Validation error
        { statusCode: 401, expectedStatus: 401 }, // Authentication error
        { statusCode: 404, expectedStatus: 404 }, // Not found
        { statusCode: 409, expectedStatus: 409 }, // Conflict
        { statusCode: 500, expectedStatus: 500 }, // Server error
      ];

      for (const errorCase of errors) {
        (authService.loginUser as jest.Mock).mockRejectedValue({
          statusCode: errorCase.statusCode,
          message: 'Test error',
          isOperational: true,
        });

        mockRequest.validatedBody = {
          email: 'test@example.com',
          password: 'TestPassword123!',
        };
        mockRequest.ip = '127.0.0.1';
        mockRequest.headers = { 'user-agent': 'test-agent' };

        await authController.login(
          mockRequest as any,
          mockResponse,
          mockNext
        );

        // Controller sends error response with status code, not via next()
        expect(mockResponse.status).toHaveBeenCalledWith(errorCase.expectedStatus);
        expect(mockResponse.json).toHaveBeenCalled();

        jest.clearAllMocks();
      }
    });

    it('should never expose sensitive information in responses', async () => {
      (authService.loginUser as jest.Mock).mockResolvedValue({
        userId: 'user-id-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        preferences: {},
        token: 'secret-token',
        rememberToken: 'secret-remember-token',
      });

      mockRequest.validatedBody = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };
      mockRequest.ip = '127.0.0.1';
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await authController.login(
        mockRequest as any,
        mockResponse,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      // Verify password is not in response
      expect(responseData).not.toHaveProperty('password');
      expect(responseData.data).not.toHaveProperty('password');
      expect(responseData.data.user).not.toHaveProperty('password');
      // Verify response structure is correct - tokens are in data but password is never included
      expect(responseData.data).toHaveProperty('token');
      expect(responseData.data).toHaveProperty('rememberToken');
      expect(responseData.data.user).not.toHaveProperty('password');
    });
  });
});

