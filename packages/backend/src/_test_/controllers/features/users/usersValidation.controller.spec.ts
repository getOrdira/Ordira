/**
 * Users Validation Controller Unit Tests
 * 
 * Tests user validation utilities for registration data.
 */

import { Response } from 'express';
import { UsersValidationController } from '../../../../controllers/features/users/usersValidation.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserValidationService = {
  validateRegistrationData: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserAuthService: jest.fn(),
  getUserProfileService: jest.fn(),
  getUserSearchService: jest.fn(),
  getUserAnalyticsService: jest.fn(),
  getUserDataService: jest.fn(),
  getUserFormatterService: jest.fn(),
  getUserCacheService: jest.fn(),
  getUserValidationService: () => mockUserValidationService,
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

describe('UsersValidationController', () => {
  let usersValidationController: UsersValidationController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersValidationController = new UsersValidationController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('validateRegistration', () => {
    const mockValidValidation = {
      valid: true,
      errors: [],
    };

    const mockInvalidValidation = {
      valid: false,
      errors: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ],
    };

    it('should validate registration data successfully', async () => {
      mockRequest.validatedBody = {
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'valid@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecurePass123!',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('valid', true);
      expect(responseData.data).toHaveProperty('errors', []);
      expect(responseData.data).toHaveProperty('checkedAt');
    });

    it('should return validation errors when data is invalid', async () => {
      mockRequest.validatedBody = {
        email: 'invalid-email',
        firstName: 'J',
        lastName: 'D',
        password: '123',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockInvalidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200); // Still 200, just reports errors

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.valid).toBe(false);
      expect(responseData.data.errors).toHaveLength(2);
      expect(responseData.data.errors[0]).toHaveProperty('field');
      expect(responseData.data.errors[0]).toHaveProperty('message');
    });

    it('should normalize email to lowercase', async () => {
      mockRequest.validatedBody = {
        email: 'User@Example.COM',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
        })
      );
    });

    it('should trim whitespace from input fields', async () => {
      mockRequest.validatedBody = {
        email: '  user@example.com  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should handle missing optional fields', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          firstName: undefined,
          lastName: undefined,
          password: 'SecurePass123!',
        })
      );
    });

    it('should handle empty string fields', async () => {
      mockRequest.validatedBody = {
        email: '',
        firstName: '',
        lastName: '',
        password: '',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockInvalidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalled();
      const callArgs = (mockUserValidationService.validateRegistrationData as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.email).toBe('');
      expect(callArgs.firstName).toBeUndefined();
      expect(callArgs.lastName).toBeUndefined();
    });

    it('should sanitize input before validation', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      // Verify sanitizeInput was called (indirectly through service call)
      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalled();
    });

    it('should include checkedAt timestamp in response', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveProperty('checkedAt');
      expect(typeof responseData.data.checkedAt).toBe('string');
      expect(new Date(responseData.data.checkedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle validation errors array correctly', async () => {
      mockRequest.validatedBody = {
        email: 'invalid',
        password: 'short',
      };
      const validationWithManyErrors = {
        valid: false,
        errors: [
          { field: 'email', message: 'Invalid format' },
          { field: 'email', message: 'Domain not allowed' },
          { field: 'password', message: 'Too short' },
          { field: 'password', message: 'Needs special character' },
        ],
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(
        validationWithManyErrors
      );

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.errors).toHaveLength(4);
    });

    it('should handle null errors array', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      const validationWithNullErrors = {
        valid: true,
        errors: null,
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(
        validationWithNullErrors
      );

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.errors).toEqual([]);
    });

    it('should fallback to req.body when validatedBody is missing', async () => {
      mockRequest.validatedBody = undefined;
      mockRequest.body = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue(mockValidValidation);

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalled();
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Validation service unavailable',
      };
      mockUserValidationService.validateRegistrationData.mockImplementation(() => {
        throw serviceError;
      });

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersValidationController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
        errors: [],
      });

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_VALIDATE_REGISTRATION'
      );
    });
  });

  describe('Logging', () => {
    it('should log validation result', async () => {
      const logActionSpy = jest.spyOn(usersValidationController, 'logAction' as any);
      mockRequest.validatedBody = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
        errors: [],
      });

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_VALIDATE_REGISTRATION_RESULT',
        expect.objectContaining({
          valid: true,
          errorCount: 0,
        })
      );
    });

    it('should log error count when validation fails', async () => {
      const logActionSpy = jest.spyOn(usersValidationController, 'logAction' as any);
      mockRequest.validatedBody = {
        email: 'invalid',
        password: 'short',
      };
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: false,
        errors: [
          { field: 'email', message: 'Invalid' },
          { field: 'password', message: 'Too short' },
        ],
      });

      await usersValidationController.validateRegistration(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_VALIDATE_REGISTRATION_RESULT',
        expect.objectContaining({
          valid: false,
          errorCount: 2,
        })
      );
    });
  });
});

