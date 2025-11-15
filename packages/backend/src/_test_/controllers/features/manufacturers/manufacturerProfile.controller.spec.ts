/**
 * Manufacturer Profile Controller Unit Tests
 * 
 * Tests manufacturer profile operations: search, get profile, get context, list profiles.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerProfileController } from '../../../../controllers/features/manufacturers/manufacturerProfile.controller';
import { manufacturerProfileCoreService } from '../../../../services/manufacturers/core/manufacturerProfile.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer profile service
jest.mock('../../../../services/manufacturers/core/manufacturerProfile.service', () => ({
  manufacturerProfileCoreService: {
    searchManufacturers: jest.fn(),
    getManufacturerProfile: jest.fn(),
    getProfileContext: jest.fn(),
    getManufacturersByIndustry: jest.fn(),
    getAvailableIndustries: jest.fn(),
    getAvailableServices: jest.fn(),
    listManufacturerProfiles: jest.fn(),
  },
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

describe('ManufacturerProfileController', () => {
  let manufacturerProfileController: ManufacturerProfileController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerProfileController = new ManufacturerProfileController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('searchManufacturers', () => {
    const mockSearchResults = {
      manufacturers: [
        { id: 'manufacturer-id-1', name: 'Manufacturer 1' },
        { id: 'manufacturer-id-2', name: 'Manufacturer 2' },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };

    beforeEach(() => {
      (manufacturerProfileCoreService.searchManufacturers as jest.Mock).mockResolvedValue(
        mockSearchResults
      );
    });

    it('should search manufacturers with default pagination and sorting', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerProfileController.searchManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerProfileCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply all search filters correctly', async () => {
      mockRequest.validatedQuery = {
        query: 'electronics',
        industry: 'Electronics',
        services: ['Assembly'],
        minMoq: 100,
        maxMoq: 1000,
        page: 2,
        limit: 50,
        sortBy: 'moq',
        sortOrder: 'desc',
      };

      await manufacturerProfileController.searchManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerProfileCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'electronics',
          industry: 'Electronics',
          services: ['Assembly'],
          minMoq: 100,
          maxMoq: 1000,
          page: 2,
          limit: 50,
          sortBy: 'moq',
          sortOrder: 'desc',
        })
      );
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedQuery = {};

      await manufacturerProfileController.searchManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes((mockResponse.status as jest.Mock).mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });
  });

  describe('getManufacturerProfile', () => {
    const mockProfile = {
      id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      profileCompleteness: 85,
    };

    beforeEach(() => {
      (manufacturerProfileCoreService.getManufacturerProfile as jest.Mock).mockResolvedValue(
        mockProfile
      );
    });

    it('should retrieve manufacturer profile by ID', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerProfileController.getManufacturerProfile(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerProfileCoreService.getManufacturerProfile).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should return 404 when profile is not found', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'non-existent-id',
      };
      (manufacturerProfileCoreService.getManufacturerProfile as jest.Mock).mockResolvedValue(
        null
      );

      await manufacturerProfileController.getManufacturerProfile(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getProfileContext', () => {
    const mockContext = {
      manufacturerId: 'manufacturer-id-123',
      connectionStatus: 'connected',
      canConnect: true,
    };

    beforeEach(() => {
      (manufacturerProfileCoreService.getProfileContext as jest.Mock).mockResolvedValue(
        mockContext
      );
    });

    it('should retrieve profile context without brandId', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {};

      await manufacturerProfileController.getProfileContext(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerProfileCoreService.getProfileContext).toHaveBeenCalledWith(
        'manufacturer-id-123',
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should retrieve profile context with brandId', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        brandId: 'brand-id-456',
      };

      await manufacturerProfileController.getProfileContext(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerProfileCoreService.getProfileContext).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'brand-id-456'
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Service unavailable',
      };
      (manufacturerProfileCoreService.getManufacturerProfile as jest.Mock).mockRejectedValue(
        serviceError
      );

      await manufacturerProfileController.getManufacturerProfile(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});

