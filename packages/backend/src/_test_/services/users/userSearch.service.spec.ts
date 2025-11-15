/**
 * User Search Service Unit Tests
 * 
 * Tests user search functionality with filtering and sorting.
 */

import { UserSearchService } from '../../../services/users/features/search.service';
import { User } from '../../../models/user';
import { userProfileFormatterService } from '../../../services/users/utils/profileFormatter.service';

// Mock dependencies
const mockUserProfileFormatterService = {
  format: jest.fn(),
};

// Mock services
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

describe('UserSearchService', () => {
  let userSearchService: UserSearchService;
  let mockUserModel: jest.Mocked<typeof User>;

  const mockUsers = [
    {
      _id: 'user-id-1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isEmailVerified: true,
    },
    {
      _id: 'user-id-2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      isActive: true,
      isEmailVerified: true,
    },
  ];

  const mockProfiles = [
    {
      id: 'user-id-1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    {
      id: 'user-id-2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  ];

  beforeEach(() => {
    userSearchService = new UserSearchService();
    jest.clearAllMocks();
    
    mockUserModel = User as jest.Mocked<typeof User>;
    
    (User.find as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockUsers),
            }),
          }),
        }),
      }),
    });

    (User.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(2);
    
    mockUserProfileFormatterService.format
      .mockReturnValueOnce(mockProfiles[0])
      .mockReturnValueOnce(mockProfiles[1]);
  });

  describe('searchUsers', () => {
    it('should search users with text query', async () => {
      const params = {
        query: 'john',
        limit: 20,
        offset: 0,
      };

      const result = await userSearchService.searchUsers(params);

      expect(User.find).toHaveBeenCalledWith({
        $text: { $search: 'john' },
      });
      expect(User.countDocuments).toHaveBeenCalledWith({
        $text: { $search: 'john' },
      });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should search users without query using default sorting', async () => {
      const params = {
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      expect(User.find).toHaveBeenCalledWith({});
      expect(User.countDocuments).toHaveBeenCalledWith({});
      
      const sortCall = (User.find as jest.Mock).mock.results[0].value.select().sort;
      expect(sortCall).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should filter by isActive status', async () => {
      const params = {
        isActive: true,
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      expect(User.find).toHaveBeenCalledWith({
        isActive: true,
      });
    });

    it('should filter by isEmailVerified status', async () => {
      const params = {
        isEmailVerified: true,
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      expect(User.find).toHaveBeenCalledWith({
        isEmailVerified: true,
      });
    });

    it('should combine multiple filters', async () => {
      const params = {
        query: 'john',
        isActive: true,
        isEmailVerified: true,
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      expect(User.find).toHaveBeenCalledWith({
        $text: { $search: 'john' },
        isActive: true,
        isEmailVerified: true,
      });
    });

    it('should apply custom sort order', async () => {
      const params = {
        sortBy: 'firstName',
        sortOrder: 'asc' as const,
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      const sortCall = (User.find as jest.Mock).mock.results[0].value.select().sort;
      expect(sortCall).toHaveBeenCalledWith({ firstName: 1 });
    });

    it('should apply text score sorting when query is provided', async () => {
      const params = {
        query: 'john',
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      const sortCall = (User.find as jest.Mock).mock.results[0].value.select().sort;
      expect(sortCall).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
    });

    it('should apply pagination with limit and offset', async () => {
      const params = {
        limit: 10,
        offset: 5,
      };

      await userSearchService.searchUsers(params);

      const limitCall = (User.find as jest.Mock).mock.results[0].value
        .select().sort().limit;
      expect(limitCall).toHaveBeenCalledWith(10);
      
      const skipCall = limitCall().skip;
      expect(skipCall).toHaveBeenCalledWith(5);
    });

    it('should use default pagination when not provided', async () => {
      const params = {};

      await userSearchService.searchUsers(params);

      const limitCall = (User.find as jest.Mock).mock.results[0].value
        .select().sort().limit;
      expect(limitCall).toHaveBeenCalledWith(20);
      
      const skipCall = limitCall().skip;
      expect(skipCall).toHaveBeenCalledWith(0);
    });

    it('should format all returned users', async () => {
      const params = {
        limit: 20,
        offset: 0,
      };

      const result = await userSearchService.searchUsers(params);

      expect(mockUserProfileFormatterService.format).toHaveBeenCalledTimes(2);
      expect(result.users).toEqual(mockProfiles);
    });

    it('should indicate hasMore when there are more results', async () => {
      (User.countDocuments as jest.Mock).mockResolvedValue(25);

      const params = {
        limit: 20,
        offset: 0,
      };

      const result = await userSearchService.searchUsers(params);

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });

    it('should indicate no more results when all are returned', async () => {
      (User.countDocuments as jest.Mock).mockResolvedValue(2);

      const params = {
        limit: 20,
        offset: 0,
      };

      const result = await userSearchService.searchUsers(params);

      expect(result.hasMore).toBe(false);
    });

    it('should handle empty search results', async () => {
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      (User.countDocuments as jest.Mock).mockResolvedValue(0);

      const params = {
        query: 'nonexistent',
        limit: 20,
        offset: 0,
      };

      const result = await userSearchService.searchUsers(params);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(error),
              }),
            }),
          }),
        }),
      });

      const params = {
        query: 'test',
        limit: 20,
        offset: 0,
      };

      await expect(userSearchService.searchUsers(params)).rejects.toThrow('Database error');
    });

    it('should select correct fields for user search', async () => {
      const params = {
        limit: 20,
        offset: 0,
      };

      await userSearchService.searchUsers(params);

      const selectCall = (User.find as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith(
        'firstName lastName fullName email profilePictureUrl isActive isEmailVerified lastLoginAt createdAt preferences votingHistory brandInteractions'
      );
    });
  });
});

