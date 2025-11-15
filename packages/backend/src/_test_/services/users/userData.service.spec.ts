/**
 * User Data Service Unit Tests
 * 
 * Tests user data retrieval operations with caching support.
 */

import { UserDataService } from '../../../services/users/core/userData.service';
import { User } from '../../../models/user';
import { userCacheService } from '../../../services/users/utils/cache.service';
import { userProfileFormatterService } from '../../../services/users/utils/profileFormatter.service';
import { queryOptimizationService } from '../../../services/external/query-optimization.service';

// Mock dependencies
const mockUserCacheService = {
  getCachedUser: jest.fn(),
  cacheUser: jest.fn(),
  ttlConfig: {
    default: 300,
    short: 60,
    long: 3600,
  },
};

const mockUserProfileFormatterService = {
  format: jest.fn(),
};

const mockQueryOptimizationService = {
  optimizedUserLookup: jest.fn(),
  batchUserLookup: jest.fn(),
};

// Mock services
jest.mock('../../../services/users/utils/cache.service', () => ({
  userCacheService: mockUserCacheService,
}));

jest.mock('../../../services/users/utils/profileFormatter.service', () => ({
  userProfileFormatterService: mockUserProfileFormatterService,
}));

jest.mock('../../../services/external/query-optimization.service', () => ({
  queryOptimizationService: mockQueryOptimizationService,
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

describe('UserDataService', () => {
  let userDataService: UserDataService;
  let mockUserModel: jest.Mocked<typeof User>;

  const mockUserDocument = {
    _id: 'user-id-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    isEmailVerified: true,
  };

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
    userDataService = new UserDataService();
    jest.clearAllMocks();
    
    mockUserModel = User as jest.Mocked<typeof User>;
    mockUserProfileFormatterService.format.mockReturnValue(mockUserProfile);
  });

  describe('getUserDocumentById', () => {
    it('should return cached user when cache is available', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserDocumentById('user-id-123');

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
      expect(mockQueryOptimizationService.optimizedUserLookup).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserDocument);
    });

    it('should fetch from database when cache is not available', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserDocumentById('user-id-123');

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith('user-id-123');
      expect(mockQueryOptimizationService.optimizedUserLookup).toHaveBeenCalledWith(
        'user-id-123',
        User
      );
      expect(mockUserCacheService.cacheUser).toHaveBeenCalledWith(
        'user-id-123',
        mockUserDocument,
        mockUserCacheService.ttlConfig.default
      );
      expect(result).toEqual(mockUserDocument);
    });

    it('should return null when user is not found', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(null);

      const result = await userDataService.getUserDocumentById('non-existent-id');

      expect(result).toBeNull();
      expect(mockUserCacheService.cacheUser).not.toHaveBeenCalled();
    });

    it('should skip cache when useCache is false', async () => {
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserDocumentById('user-id-123', {
        useCache: false,
      });

      expect(mockUserCacheService.getCachedUser).not.toHaveBeenCalled();
      expect(mockQueryOptimizationService.optimizedUserLookup).toHaveBeenCalled();
      expect(mockUserCacheService.cacheUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserDocument);
    });

    it('should cache result after fetching from database', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(mockUserDocument);

      await userDataService.getUserDocumentById('user-id-123');

      expect(mockUserCacheService.cacheUser).toHaveBeenCalledWith(
        'user-id-123',
        mockUserDocument,
        mockUserCacheService.ttlConfig.default
      );
    });
  });

  describe('getUserProfileById', () => {
    it('should return formatted user profile', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserProfileById('user-id-123');

      expect(mockUserProfileFormatterService.format).toHaveBeenCalledWith(mockUserDocument);
      expect(result).toEqual(mockUserProfile);
    });

    it('should return null when user is not found', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedUserLookup.mockResolvedValue(null);

      const result = await userDataService.getUserProfileById('non-existent-id');

      expect(result).toBeNull();
      expect(mockUserProfileFormatterService.format).not.toHaveBeenCalled();
    });

    it('should use cached data when available', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserProfileById('user-id-123');

      expect(mockQueryOptimizationService.optimizedUserLookup).not.toHaveBeenCalled();
      expect(mockUserProfileFormatterService.format).toHaveBeenCalledWith(mockUserDocument);
      expect(result).toEqual(mockUserProfile);
    });
  });

  describe('getUserByEmail', () => {
    const mockEmail = 'test@example.com';

    beforeEach(() => {
      (User.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDocument),
      });
    });

    it('should return cached user when cache is available', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(mockUserDocument);

      const result = await userDataService.getUserByEmail(mockEmail);

      expect(mockUserCacheService.getCachedUser).toHaveBeenCalledWith(`email:${mockEmail}`);
      expect(User.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserDocument);
    });

    it('should fetch from database when cache is not available', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      (User.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDocument),
      });

      const result = await userDataService.getUserByEmail(mockEmail);

      expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail });
      expect(mockUserCacheService.cacheUser).toHaveBeenCalledWith(
        `email:${mockEmail}`,
        mockUserDocument,
        mockUserCacheService.ttlConfig.default
      );
      expect(result).toEqual(mockUserDocument);
    });

    it('should return null when user is not found', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      (User.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await userDataService.getUserByEmail(mockEmail);

      expect(result).toBeNull();
      expect(mockUserCacheService.cacheUser).not.toHaveBeenCalled();
    });

    it('should skip cache when skipCache is true', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDocument),
      });

      const result = await userDataService.getUserByEmail(mockEmail, {
        skipCache: true,
      });

      expect(mockUserCacheService.getCachedUser).not.toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalled();
      expect(mockUserCacheService.cacheUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserDocument);
    });

    it('should cache result after fetching from database', async () => {
      mockUserCacheService.getCachedUser.mockResolvedValue(null);
      (User.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserDocument),
      });

      await userDataService.getUserByEmail(mockEmail);

      expect(mockUserCacheService.cacheUser).toHaveBeenCalledWith(
        `email:${mockEmail}`,
        mockUserDocument,
        mockUserCacheService.ttlConfig.default
      );
    });
  });

  describe('batchGetUsers', () => {
    const mockUserIds = ['user-id-1', 'user-id-2', 'user-id-3'];
    const mockUsers = [
      { ...mockUserDocument, _id: 'user-id-1' },
      { ...mockUserDocument, _id: 'user-id-2' },
      { ...mockUserDocument, _id: 'user-id-3' },
    ];
    const mockProfiles = [
      { ...mockUserProfile, id: 'user-id-1' },
      { ...mockUserProfile, id: 'user-id-2' },
      { ...mockUserProfile, id: 'user-id-3' },
    ];

    it('should return empty array when userIds is empty', async () => {
      const result = await userDataService.batchGetUsers([]);

      expect(result).toEqual([]);
      expect(mockQueryOptimizationService.batchUserLookup).not.toHaveBeenCalled();
    });

    it('should return formatted user profiles for batch lookup', async () => {
      mockQueryOptimizationService.batchUserLookup.mockResolvedValue(mockUsers);
      mockUserProfileFormatterService.format
        .mockReturnValueOnce(mockProfiles[0])
        .mockReturnValueOnce(mockProfiles[1])
        .mockReturnValueOnce(mockProfiles[2]);

      const result = await userDataService.batchGetUsers(mockUserIds);

      expect(mockQueryOptimizationService.batchUserLookup).toHaveBeenCalledWith(
        mockUserIds,
        User
      );
      expect(mockUserProfileFormatterService.format).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockProfiles);
    });

    it('should handle partial results when some users are not found', async () => {
      const partialUsers = [mockUsers[0], mockUsers[1]];
      mockQueryOptimizationService.batchUserLookup.mockResolvedValue(partialUsers);
      mockUserProfileFormatterService.format
        .mockReturnValueOnce(mockProfiles[0])
        .mockReturnValueOnce(mockProfiles[1]);

      const result = await userDataService.batchGetUsers(mockUserIds);

      expect(result).toHaveLength(2);
      expect(result).toEqual([mockProfiles[0], mockProfiles[1]]);
    });
  });
});

