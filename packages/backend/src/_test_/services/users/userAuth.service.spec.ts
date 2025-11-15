/**
 * User Auth Service Unit Tests
 * 
 * Tests user authentication operations: register, login, verify email.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserAuthService } from '../../../services/users/features/auth.service';
import { User } from '../../../models/user';
import { userDataService } from '../../../services/users/core/userData.service';
import { userCacheService } from '../../../services/users/utils/cache.service';
import { userValidationService } from '../../../services/users/validation/userValidation.service';
import { UtilsService } from '../../../services/infrastructure/shared';

// Mock dependencies
const mockUserDataService = {
  getUserByEmail: jest.fn(),
};

const mockUserCacheService = {
  invalidateUserCaches: jest.fn(),
  cacheUser: jest.fn(),
};

const mockUserValidationService = {
  validateRegistrationData: jest.fn(),
};

const mockUtilsService = {
  generateSecureToken: jest.fn(),
};

// Mock services
jest.mock('../../../services/users/core/userData.service', () => ({
  userDataService: mockUserDataService,
}));

jest.mock('../../../services/users/utils/cache.service', () => ({
  userCacheService: mockUserCacheService,
}));

jest.mock('../../../services/users/validation/userValidation.service', () => ({
  userValidationService: mockUserValidationService,
}));

jest.mock('../../../services/infrastructure/shared', () => ({
  UtilsService: mockUtilsService,
}));

// Mock User model
jest.mock('../../../models/user');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

describe('UserAuthService', () => {
  let userAuthService: UserAuthService;
  let mockUserModel: jest.Mocked<typeof User>;

  beforeEach(() => {
    userAuthService = new UserAuthService();
    jest.clearAllMocks();
    
    // Set up default mocks
    process.env.JWT_SECRET = 'test-secret-key-for-jwt';
    
    mockUserValidationService.validateRegistrationData.mockReturnValue({
      valid: true,
      errors: undefined,
    });
    
    mockUtilsService.generateSecureToken.mockReturnValue('secure-token-123');
    
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    
    // Setup User model mock
    mockUserModel = User as jest.Mocked<typeof User>;
    const mockUserInstance = {
      save: jest.fn().mockResolvedValue({
        _id: 'user-id-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashed-password',
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      }),
    };
    (mockUserModel as any) = jest.fn().mockImplementation(() => mockUserInstance);
  });

  describe('registerUser', () => {
    const mockUserData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(null);
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
      });

      const result = await userAuthService.registerUser(mockUserData);

      expect(mockUserValidationService.validateRegistrationData).toHaveBeenCalledWith({
        email: mockUserData.email,
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName,
        password: mockUserData.password,
      });
      
      expect(mockUserDataService.getUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        { skipCache: true }
      );
      
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 12);
      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalled();
      
      expect(result).toBeDefined();
      expect(result.email).toBe(mockUserData.email);
    });

    it('should throw error when validation fails', async () => {
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: false,
        errors: ['Invalid email format'],
      });

      await expect(userAuthService.registerUser(mockUserData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid email format',
      });
    });

    it('should throw error when email already exists', async () => {
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
      });
      mockUserDataService.getUserByEmail.mockResolvedValue({
        _id: 'existing-user-id',
        email: mockUserData.email,
      });

      await expect(userAuthService.registerUser(mockUserData)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already exists',
      });
    });

    it('should generate email verification token', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(null);
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
      });

      await userAuthService.registerUser(mockUserData);

      expect(mockUtilsService.generateSecureToken).toHaveBeenCalled();
    });

    it('should set fullName from firstName and lastName', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(null);
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
      });

      await userAuthService.registerUser(mockUserData);

      expect(mockUserModel).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'John Doe',
        })
      );
    });

    it('should set initial user status fields correctly', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(null);
      mockUserValidationService.validateRegistrationData.mockReturnValue({
        valid: true,
      });

      await userAuthService.registerUser(mockUserData);

      expect(mockUserModel).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          isEmailVerified: false,
        })
      );
    });
  });

  describe('loginUser', () => {
    const mockEmail = 'user@example.com';
    const mockPassword = 'SecurePass123!';
    const mockUser = {
      _id: 'user-id-123',
      email: mockEmail,
      password: 'hashed-password',
      isActive: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      mockUserDataService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Mock User.findByIdAndUpdate
      (User.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'user-id-123',
      });
    });

    it('should login user successfully with valid credentials', async () => {
      const result = await userAuthService.loginUser(mockEmail, mockPassword);

      expect(mockUserDataService.getUserByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockUser.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser._id,
          email: mockUser.email,
          type: 'user',
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      expect(mockUserCacheService.cacheUser).toHaveBeenCalledTimes(2);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
    });

    it('should throw error when user does not exist', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(null);

      await expect(userAuthService.loginUser(mockEmail, mockPassword)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should throw error when user is inactive', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(userAuthService.loginUser(mockEmail, mockPassword)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Account is deactivated',
      });
    });

    it('should throw error when password is incorrect', async () => {
      mockUserDataService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userAuthService.loginUser(mockEmail, mockPassword)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should update lastLoginAt and increment loginCount', async () => {
      await userAuthService.loginUser(mockEmail, mockPassword);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
          $inc: { loginCount: 1 },
        }),
        expect.any(Object)
      );
    });

    it('should exclude password from returned user object', async () => {
      const result = await userAuthService.loginUser(mockEmail, mockPassword);

      expect(result.user.password).toBeUndefined();
    });
  });

  describe('verifyUserEmail', () => {
    const mockUserId = 'user-id-123';
    const mockVerificationToken = 'secure-token-123';
    const mockVerifiedUser = {
      _id: mockUserId,
      email: 'user@example.com',
      isEmailVerified: true,
    };

    beforeEach(() => {
      (User.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockVerifiedUser);
    });

    it('should verify user email successfully', async () => {
      await userAuthService.verifyUserEmail(mockUserId, mockVerificationToken);

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: mockUserId,
          emailVerificationToken: mockVerificationToken,
          isEmailVerified: false,
        },
        {
          isEmailVerified: true,
          emailVerifiedAt: expect.any(Date),
          $unset: { emailVerificationToken: 1 },
        },
        { new: true }
      );
      
      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error when verification token is invalid', async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        userAuthService.verifyUserEmail(mockUserId, 'invalid-token')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid verification token',
      });
    });

    it('should throw error when user is already verified', async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        userAuthService.verifyUserEmail(mockUserId, mockVerificationToken)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid verification token',
      });
    });
  });
});

