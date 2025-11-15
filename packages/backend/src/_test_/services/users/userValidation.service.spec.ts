/**
 * User Validation Service Unit Tests
 * 
 * Tests user validation utilities for registration data.
 */

import { UserValidationService } from '../../../services/users/validation/userValidation.service';
import { UtilsService } from '../../../services/infrastructure/shared';

// Mock infrastructure services
const mockUtilsService = {
  isValidEmail: jest.fn(),
};

// Mock the infrastructure shared services
jest.mock('../../../services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('UserValidationService', () => {
  let userValidationService: UserValidationService;

  beforeEach(() => {
    userValidationService = new UserValidationService();
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUtilsService.isValidEmail.mockReturnValue(true);
  });

  describe('validateRegistrationData', () => {
    it('should validate registration data successfully with all valid fields', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockUtilsService.isValidEmail).toHaveBeenCalledWith('valid@example.com');
    });

    it('should return validation errors when email is invalid', () => {
      mockUtilsService.isValidEmail.mockReturnValue(false);

      const result = userValidationService.validateRegistrationData({
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Invalid email format');
    });

    it('should return validation error when firstName is too short', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'J',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('First name must be at least 2 characters long');
    });

    it('should return validation error when firstName is missing', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('First name must be at least 2 characters long');
    });

    it('should return validation error when firstName is empty string', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: '',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('First name must be at least 2 characters long');
    });

    it('should return validation error when lastName is too short', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'D',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Last name must be at least 2 characters long');
    });

    it('should return validation error when lastName is missing', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Last name must be at least 2 characters long');
    });

    it('should return validation error when password is too short', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '1234567',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return validation error when password is missing', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return multiple validation errors when multiple fields are invalid', () => {
      mockUtilsService.isValidEmail.mockReturnValue(false);

      const result = userValidationService.validateRegistrationData({
        email: 'invalid-email',
        firstName: 'J',
        lastName: 'D',
        password: '123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('First name must be at least 2 characters long');
      expect(result.errors).toContain('Last name must be at least 2 characters long');
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should trim whitespace when validating firstName', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: '  J  ', // Will be trimmed to 'J'
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('First name must be at least 2 characters long');
    });

    it('should trim whitespace when validating lastName', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: '  D  ', // Will be trimmed to 'D'
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Last name must be at least 2 characters long');
    });

    it('should accept minimum valid password length', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '12345678', // Exactly 8 characters
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle special characters in email', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'user+tag@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(true);
      expect(mockUtilsService.isValidEmail).toHaveBeenCalledWith('user+tag@example.com');
    });

    it('should handle international characters in names', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'José',
        lastName: 'García',
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle long valid names', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);
      const longName = 'A'.repeat(100);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: longName,
        lastName: longName,
        password: 'SecurePass123!',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should handle long valid password', () => {
      mockUtilsService.isValidEmail.mockReturnValue(true);
      const longPassword = 'A'.repeat(256);

      const result = userValidationService.validateRegistrationData({
        email: 'valid@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: longPassword,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });
});

