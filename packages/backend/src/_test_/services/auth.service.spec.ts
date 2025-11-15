/**
 * Auth Service Unit Tests
 * 
 * Tests pure business logic, happy paths, edge cases, and failure scenarios.
 */

import { AuthService } from '../../../services/auth/index';
import { User } from '../../../models/deprecated/user.model';
import { Business } from '../../../models/deprecated/business.model';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
  clearDatabase,
} from '../utils/mongo';
import { createRedisMock, clearRedis } from '../utils/redis';
import {
  createTestUser,
  createTestBusiness,
  createTestManufacturer,
} from '../factories';

// Mock external services
jest.mock('../../../services/external/s3.service');
jest.mock('../../../services/external/monitoring.service');
jest.mock('@sentry/node');

describe('AuthService', () => {
  let authService: AuthService;
  let redisMock: any;

  beforeAll(async () => {
    await startMongoMemoryServer();
    redisMock = createRedisMock();
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
    await clearRedis(redisMock);
  });

  beforeEach(async () => {
    await clearDatabase();
    await clearRedis(redisMock);
    authService = new AuthService();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const userData = createTestUser({
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      const result = await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();

      // Verify user was created in database
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(userData.email);
    });

    it('should reject duplicate email registration', async () => {
      const userData = createTestUser({
        email: 'duplicate@example.com',
      });

      // First registration
      await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      // Attempt duplicate registration
      await expect(
        authService.registerUser({
          ...userData,
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('should hash password before saving', async () => {
      const userData = createTestUser({
        email: 'password-test@example.com',
        password: 'PlainTextPassword123!',
      });

      await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser?.password).toBeDefined();
      expect(createdUser?.password).not.toBe(userData.password);
    });

    it('should generate email verification code', async () => {
      const userData = createTestUser({
        email: 'verification-test@example.com',
      });

      await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser?.emailCode).toBeDefined();
      expect(createdUser?.emailCode?.length).toBeGreaterThan(0);
      expect(createdUser?.isEmailVerified).toBe(false);
    });
  });

  describe('loginUser', () => {
    let testUser: any;

    beforeEach(async () => {
      const userData = createTestUser({
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      });

      await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      testUser = await User.findOne({ email: userData.email });
    });

    it('should successfully login with valid credentials', async () => {
      const result = await authService.loginUser({
        email: 'login-test@example.com',
        password: 'TestPassword123!',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      await expect(
        authService.loginUser({
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should reject login with non-existent email', async () => {
      await expect(
        authService.loginUser({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should increment login attempts on failed login', async () => {
      const initialAttempts = testUser.loginAttempts || 0;

      try {
        await authService.loginUser({
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        });
      } catch (error) {
        // Expected to fail
      }

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.loginAttempts).toBeGreaterThan(initialAttempts);
    });
  });

  describe('verifyUser', () => {
    let testUser: any;
    let verificationCode: string;

    beforeEach(async () => {
      const userData = createTestUser({
        email: 'verify-test@example.com',
      });

      await authService.registerUser({
        ...userData,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      testUser = await User.findOne({ email: userData.email });
      verificationCode = testUser?.emailCode || '';
    });

    it('should successfully verify user email with correct code', async () => {
      const result = await authService.verifyUser({
        email: 'verify-test@example.com',
        code: verificationCode,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user?.isEmailVerified).toBe(true);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.isEmailVerified).toBe(true);
      expect(updatedUser?.emailVerifiedAt).toBeDefined();
    });

    it('should reject verification with incorrect code', async () => {
      await expect(
        authService.verifyUser({
          email: 'verify-test@example.com',
          code: '000000', // Wrong code
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject verification for already verified user', async () => {
      // First verification
      await authService.verifyUser({
        email: 'verify-test@example.com',
        code: verificationCode,
      });

      // Attempt second verification
      await expect(
        authService.verifyUser({
          email: 'verify-test@example.com',
          code: verificationCode,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email', async () => {
      await expect(
        authService.registerUser({
          email: '',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(200) + '@example.com';
      
      await expect(
        authService.registerUser({
          email: longEmail,
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            language: 'en',
            timezone: 'UTC',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'test+special.chars@example.com';
      
      const result = await authService.registerUser({
        email: specialEmail,
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          language: 'en',
          timezone: 'UTC',
        },
      });

      expect(result.success).toBe(true);
    });
  });
});

