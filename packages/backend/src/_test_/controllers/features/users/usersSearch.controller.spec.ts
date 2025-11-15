/**
 * Users Search Controller Unit Tests
 * 
 * Tests user search functionality with filters, pagination, and sorting.
 */

import { Response } from 'express';
import { UsersSearchController } from '../../../../controllers/features/users/usersSearch.controller';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock services
const mockUserSearchService = {
  searchUsers: jest.fn(),
};

// Mock the base controller services
jest.mock('../../../../services/container.service', () => ({
  getUserServices: jest.fn(),
  getUserAuthService: jest.fn(),
  getUserProfileService: jest.fn(),
  getUserSearchService: () => mockUserSearchService,
  getUserAnalyticsService: jest.fn(),
  getUserDataService: jest.fn(),
  getUserFormatterService: jest.fn(),
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

describe('UsersSearchController', () => {
  let usersSearchController: UsersSearchController;
  let mockRequest: any;
  let mockResponse: Response;

  beforeEach(() => {
    usersSearchController = new UsersSearchController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();

    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('searchUsers', () => {
    const mockSearchResults = {
      users: [
        { id: 'user-id-1', email: 'user1@example.com' },
        { id: 'user-id-2', email: 'user2@example.com' },
      ],
      total: 2,
      hasMore: false,
    };

    beforeEach(() => {
      mockUserSearchService.searchUsers.mockResolvedValue(mockSearchResults);
    });

    it('should search users with default pagination', async () => {
      mockRequest.validatedQuery = {};

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20, // Default limit
          offset: 0,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('users');
      expect(responseData.data).toHaveProperty('total', 2);
      expect(responseData.data).toHaveProperty('hasMore', false);
      expect(responseData.data).toHaveProperty('pagination');
    });

    it('should search users with query string', async () => {
      mockRequest.validatedQuery = {
        query: 'john',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'john',
        })
      );
    });

    it('should apply isActive filter', async () => {
      mockRequest.validatedQuery = {
        isActive: true,
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
    });

    it('should apply isEmailVerified filter', async () => {
      mockRequest.validatedQuery = {
        isEmailVerified: false,
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: false,
        })
      );
    });

    it('should handle boolean filters as strings and convert them', async () => {
      mockRequest.validatedQuery = {
        isActive: 'true',
        isEmailVerified: 'false',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          isEmailVerified: false,
        })
      );
    });

    it('should apply custom pagination parameters', async () => {
      mockRequest.validatedQuery = {
        limit: 50,
        offset: 100,
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 100,
        })
      );
    });

    it('should enforce maximum limit', async () => {
      mockRequest.validatedQuery = {
        limit: 200, // Exceeds maxLimit of 100
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      // Should cap at maxLimit
      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: expect.any(Number),
        })
      );
      const callArgs = (mockUserSearchService.searchUsers as jest.Mock).mock.calls[0][0];
      expect(callArgs.limit).toBeLessThanOrEqual(100);
    });

    it('should apply sortBy and sortOrder parameters', async () => {
      mockRequest.validatedQuery = {
        sortBy: 'email',
        sortOrder: 'asc',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'email',
          sortOrder: 'asc',
        })
      );
    });

    it('should ignore invalid sortOrder values', async () => {
      mockRequest.validatedQuery = {
        sortOrder: 'invalid',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: undefined,
        })
      );
    });

    it('should return pagination metadata', async () => {
      mockRequest.validatedQuery = {
        limit: 20,
        offset: 0,
      };
      mockSearchResults.total = 45;

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.pagination).toHaveProperty('page');
      expect(responseData.data.pagination).toHaveProperty('limit', 20);
      expect(responseData.data.pagination).toHaveProperty('total', 45);
      expect(responseData.data.pagination).toHaveProperty('totalPages');
      expect(responseData.data.pagination).toHaveProperty('hasNext');
      expect(responseData.data.pagination).toHaveProperty('hasPrev');
    });

    it('should combine multiple filters', async () => {
      mockRequest.validatedQuery = {
        query: 'john',
        isActive: true,
        isEmailVerified: true,
        limit: 30,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'john',
          isActive: true,
          isEmailVerified: true,
          limit: 30,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('should handle empty search results', async () => {
      mockUserSearchService.searchUsers.mockResolvedValue({
        users: [],
        total: 0,
        hasMore: false,
      });
      mockRequest.validatedQuery = {
        query: 'nonexistent',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.users).toEqual([]);
      expect(responseData.data.total).toBe(0);
    });

    it('should fallback to req.query when validatedQuery is missing', async () => {
      mockRequest.validatedQuery = undefined;
      mockRequest.query = {
        query: 'fallback',
      };

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fallback',
        })
      );
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Search service unavailable',
      };
      mockUserSearchService.searchUsers.mockRejectedValue(serviceError);

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page-based pagination correctly', async () => {
      mockRequest.validatedQuery = {
        page: 2,
        limit: 20,
      };
      mockUserSearchService.searchUsers.mockResolvedValue({
        users: [],
        total: 50,
        hasMore: true,
      });

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.pagination.page).toBe(2);
      expect(responseData.data.pagination.hasNext).toBe(true);
      expect(responseData.data.pagination.hasPrev).toBe(true);
    });

    it('should calculate totalPages correctly', async () => {
      mockRequest.validatedQuery = {
        limit: 10,
      };
      mockUserSearchService.searchUsers.mockResolvedValue({
        users: [],
        total: 25,
        hasMore: false,
      });

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.pagination.totalPages).toBe(3); // Math.ceil(25/10)
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        usersSearchController,
        'recordPerformance' as any
      );
      mockRequest.validatedQuery = {};
      mockUserSearchService.searchUsers.mockResolvedValue({
        users: [],
        total: 0,
        hasMore: false,
      });

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'USERS_SEARCH');
    });
  });

  describe('Logging', () => {
    it('should log search operation with query details', async () => {
      const logActionSpy = jest.spyOn(usersSearchController, 'logAction' as any);
      mockRequest.validatedQuery = {
        query: 'test',
      };
      mockUserSearchService.searchUsers.mockResolvedValue({
        users: [],
        total: 5,
        hasMore: false,
      });

      await usersSearchController.searchUsers(mockRequest, mockResponse);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'USERS_SEARCH_SUCCESS',
        expect.objectContaining({
          query: 'test',
          total: 5,
        })
      );
    });
  });
});

