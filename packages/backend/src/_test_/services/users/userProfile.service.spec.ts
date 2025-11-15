/**
 * User Profile Service Unit Tests
 * 
 * Tests user profile management operations: get, update, delete.
 */

import { UserProfileService } from '../../../services/users/features/profile.service';
import { User } from '../../../models/user';
import { userDataService } from '../../../services/users/core/userData.service';
import { userCacheService } from '../../../services/users/utils/cache.service';
import { userProfileFormatterService } from '../../../services/users/utils/profileFormatter.service';

// Mock dependencies
const mockUserDataService = {
  getUserProfileById: jest.fn(),
};

const mockUserCacheService = {
  invalidateUserCaches: jest.fn(),
};

const mockUserProfileFormatterService = {
  format: jest.fn(),
};

// Mock services
jest.mock('../../../services/users/core/userData.service', () => ({
  userDataService: mockUserDataService,
}));

jest.mock('../../../services/users/utils/cache.service', () => ({
  userCacheService: mockUserCacheService,
}));

jest.mock('../../../services/users/utils/profileFormatter.service', () => ({
  userProfileFormatterService: mockUserProfileFormatterService,
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

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;
  let mockUserModel: jest.Mocked<typeof User>;

  const mockUserProfile = {
    id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    isActive: true,
    isEmailVerified: true,
  };

  beforeEach(() => {
    userProfileService = new UserProfileService();
    jest.clearAllMocks();
    
    mockUserModel = User as jest.Mocked<typeof User>;
    mockUserProfileFormatterService.format.mockReturnValue(mockUserProfile);
  });

  describe('getUserProfile', () => {
    it('should return user profile by id', async () => {
      mockUserDataService.getUserProfileById.mockResolvedValue(mockUserProfile);

      const result = await userProfileService.getUserProfile('user-id-123');

      expect(mockUserDataService.getUserProfileById).toHaveBeenCalledWith('user-id-123', {
        useCache: true,
      });
      expect(result).toEqual(mockUserProfile);
    });

    it('should return null when user is not found', async () => {
      mockUserDataService.getUserProfileById.mockResolvedValue(null);

      const result = await userProfileService.getUserProfile('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    const mockUpdates = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    const mockUpdatedUser = {
      _id: 'user-id-123',
      email: 'test@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      isActive: true,
      isEmailVerified: true,
    };

    beforeEach(() => {
      (User.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      });

      (User.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUpdatedUser),
        }),
      });
    });

    it('should update user profile successfully', async () => {
      mockUserProfileFormatterService.format.mockReturnValue({
        ...mockUserProfile,
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
      });

      const result = await userProfileService.updateUserProfile('user-id-123', mockUpdates);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          ...mockUpdates,
          fullName: 'Jane Smith',
          updatedAt: expect.any(Date),
        }),
        { new: true, runValidators: true }
      );
      
      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-123');
      expect(result).toBeDefined();
    });

    it('should update fullName when firstName changes', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      });

      await userProfileService.updateUserProfile('user-id-123', { firstName: 'Jane' });

      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          firstName: 'Jane',
          fullName: 'Jane Doe',
        }),
        expect.any(Object)
      );
    });

    it('should update fullName when lastName changes', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      });

      await userProfileService.updateUserProfile('user-id-123', { lastName: 'Smith' });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          lastName: 'Smith',
          fullName: 'John Smith',
        }),
        expect.any(Object)
      );
    });

    it('should update fullName when both firstName and lastName change', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      });

      await userProfileService.updateUserProfile('user-id-123', {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          fullName: 'Jane Smith',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when user is not found', async () => {
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        userProfileService.updateUserProfile('non-existent-id', mockUpdates)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should exclude password and emailVerificationToken from update', async () => {
      await userProfileService.updateUserProfile('user-id-123', mockUpdates);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        expect.any(Object),
        expect.objectContaining({
          new: true,
          runValidators: true,
        })
      );
      
      const selectCall = (User.findByIdAndUpdate as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith('-password -emailVerificationToken');
    });

    it('should invalidate cache after update', async () => {
      await userProfileService.updateUserProfile('user-id-123', mockUpdates);

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-123');
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      (User.deleteOne as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 1,
      });
    });

    it('should delete user successfully', async () => {
      await userProfileService.deleteUser('user-id-123');

      expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'user-id-123' });
      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-123');
    });

    it('should throw error when user is not found', async () => {
      (User.deleteOne as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });

      await expect(userProfileService.deleteUser('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should invalidate cache after deletion', async () => {
      await userProfileService.deleteUser('user-id-123');

      expect(mockUserCacheService.invalidateUserCaches).toHaveBeenCalledWith('user-id-123');
    });
  });
});

