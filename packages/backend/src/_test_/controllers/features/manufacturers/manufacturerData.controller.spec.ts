/**
 * Manufacturer Data Controller Unit Tests
 * 
 * Tests manufacturer data operations: search, get by ID, update, delete, batch operations.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerDataController } from '../../../../controllers/features/manufacturers/manufacturerData.controller';
import { manufacturerDataCoreService } from '../../../../services/manufacturers/core/manufacturerData.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer data service
jest.mock('../../../../services/manufacturers/core/manufacturerData.service', () => ({
  manufacturerDataCoreService: {
    searchManufacturers: jest.fn(),
    getManufacturerById: jest.fn(),
    updateManufacturer: jest.fn(),
    deleteManufacturer: jest.fn(),
    getManufacturersByIndustry: jest.fn(),
    getManufacturersByIds: jest.fn(),
    getManufacturerCount: jest.fn(),
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

describe('ManufacturerDataController', () => {
  let manufacturerDataController: ManufacturerDataController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerDataController = new ManufacturerDataController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    // Set default authenticated business user
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
      hasMore: false,
    };

    beforeEach(() => {
      (manufacturerDataCoreService.searchManufacturers as jest.Mock).mockResolvedValue(
        mockSearchResults
      );
    });

    it('should search manufacturers with default pagination', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
          sortOrder: 'desc',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should search manufacturers with query string', async () => {
      mockRequest.validatedQuery = {
        query: 'electronics',
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'electronics',
        })
      );
    });

    it('should apply industry filter', async () => {
      mockRequest.validatedQuery = {
        industry: 'Electronics',
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'Electronics',
        })
      );
    });

    it('should apply services filter', async () => {
      mockRequest.validatedQuery = {
        services: ['Assembly', 'Packaging'],
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['Assembly', 'Packaging'],
        })
      );
    });

    it('should apply MOQ range filters', async () => {
      mockRequest.validatedQuery = {
        minMoq: 100,
        maxMoq: 1000,
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          minMoq: 100,
          maxMoq: 1000,
        })
      );
    });

    it('should apply location filter', async () => {
      mockRequest.validatedQuery = {
        location: 'United States',
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'United States',
        })
      );
    });

    it('should apply custom pagination', async () => {
      mockRequest.validatedQuery = {
        limit: 50,
        offset: 100,
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 100,
        })
      );
    });

    it('should apply sorting parameters', async () => {
      mockRequest.validatedQuery = {
        sortBy: 'name',
        sortOrder: 'asc',
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedQuery = {};

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      // Should reject with 403 or 401
      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });

    it('should combine multiple search filters', async () => {
      mockRequest.validatedQuery = {
        query: 'electronics',
        industry: 'Electronics',
        services: ['Assembly'],
        minMoq: 100,
        location: 'US',
        limit: 30,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.searchManufacturers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'electronics',
          industry: 'Electronics',
          services: ['Assembly'],
          minMoq: 100,
          location: 'US',
          limit: 30,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Search service unavailable',
      };
      (manufacturerDataCoreService.searchManufacturers as jest.Mock).mockRejectedValue(
        serviceError
      );

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getManufacturerById', () => {
    const mockManufacturer = {
      id: 'manufacturer-id-123',
      name: 'Test Manufacturer',
      industry: 'Electronics',
      servicesOffered: ['Assembly'],
    };

    beforeEach(() => {
      (manufacturerDataCoreService.getManufacturerById as jest.Mock).mockResolvedValue(
        mockManufacturer
      );
    });

    it('should retrieve manufacturer by ID with caching', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerDataController.getManufacturerById(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.getManufacturerById).toHaveBeenCalledWith(
        'manufacturer-id-123',
        true // useCache
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('manufacturer');
      expect(responseData.data.manufacturer).toEqual(mockManufacturer);
    });

    it('should return 404 when manufacturer is not found', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'non-existent-id',
      };
      (manufacturerDataCoreService.getManufacturerById as jest.Mock).mockResolvedValue(null);

      await manufacturerDataController.getManufacturerById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerDataController.getManufacturerById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      const serviceError = new Error('Database connection failed');
      (manufacturerDataCoreService.getManufacturerById as jest.Mock).mockRejectedValue(
        serviceError
      );

      await manufacturerDataController.getManufacturerById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('updateManufacturer', () => {
    const updateData = {
      name: 'Updated Manufacturer Name',
      description: 'Updated description',
      industry: 'Updated Industry',
    };

    const updatedManufacturer = {
      id: 'manufacturer-id-123',
      ...updateData,
    };

    beforeEach(() => {
      (manufacturerDataCoreService.updateManufacturer as jest.Mock).mockResolvedValue(
        updatedManufacturer
      );
    });

    it('should update manufacturer successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = updateData;

      await manufacturerDataController.updateManufacturer(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.updateManufacturer).toHaveBeenCalledWith(
        'manufacturer-id-123',
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('manufacturer');
      expect(responseData.data.manufacturer).toEqual(updatedManufacturer);
    });

    it('should handle partial updates', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        name: 'Partial Update',
      };

      await manufacturerDataController.updateManufacturer(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.updateManufacturer).toHaveBeenCalledWith(
        'manufacturer-id-123',
        { name: 'Partial Update' }
      );
    });

    it('should handle complex nested updates', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        headquarters: {
          country: 'United States',
          city: 'New York',
          address: '123 Main St',
        },
        certifications: [
          {
            name: 'ISO 9001',
            issuer: 'ISO',
            issueDate: new Date('2024-01-01'),
          },
        ],
      };

      await manufacturerDataController.updateManufacturer(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.updateManufacturer).toHaveBeenCalled();
      const callArgs = (manufacturerDataCoreService.updateManufacturer as jest.Mock).mock
        .calls[0][1];
      expect(callArgs.headquarters).toBeDefined();
      expect(callArgs.certifications).toBeDefined();
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = updateData;

      await manufacturerDataController.updateManufacturer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });

    it('should propagate validation errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        moq: -1, // Invalid MOQ
      };
      const validationError = {
        statusCode: 400,
        message: 'MOQ must be positive',
      };
      (manufacturerDataCoreService.updateManufacturer as jest.Mock).mockRejectedValue(
        validationError
      );

      await manufacturerDataController.updateManufacturer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteManufacturer', () => {
    beforeEach(() => {
      (manufacturerDataCoreService.deleteManufacturer as jest.Mock).mockResolvedValue({
        success: true,
      });
    });

    it('should delete manufacturer successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerDataController.deleteManufacturer(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.deleteManufacturer).toHaveBeenCalledWith(
        'manufacturer-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('deleted');
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerDataController.deleteManufacturer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(
        expect.arrayContaining([401, 403]).includes(mockResponse.status.mock.calls[0][0])
          ? expect.anything()
          : 403
      );
    });

    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      const serviceError = {
        statusCode: 403,
        message: 'Cannot delete manufacturer with active connections',
      };
      (manufacturerDataCoreService.deleteManufacturer as jest.Mock).mockRejectedValue(
        serviceError
      );

      await manufacturerDataController.deleteManufacturer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getManufacturersByIndustry', () => {
    const mockManufacturers = [
      { id: 'manufacturer-id-1', industry: 'Electronics' },
      { id: 'manufacturer-id-2', industry: 'Electronics' },
    ];

    beforeEach(() => {
      (manufacturerDataCoreService.getManufacturersByIndustry as jest.Mock).mockResolvedValue(
        mockManufacturers
      );
    });

    it('should retrieve manufacturers by industry', async () => {
      mockRequest.validatedQuery = {
        industry: 'Electronics',
      };

      await manufacturerDataController.getManufacturersByIndustry(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerDataCoreService.getManufacturersByIndustry).toHaveBeenCalledWith(
        'Electronics',
        undefined // limit
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply limit parameter', async () => {
      mockRequest.validatedQuery = {
        industry: 'Electronics',
        limit: 10,
      };

      await manufacturerDataController.getManufacturersByIndustry(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerDataCoreService.getManufacturersByIndustry).toHaveBeenCalledWith(
        'Electronics',
        10
      );
    });

    it('should return 400 when industry is missing', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerDataController.getManufacturersByIndustry(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(manufacturerDataCoreService.getManufacturersByIndustry).not.toHaveBeenCalled();
    });
  });

  describe('getManufacturersByIds', () => {
    const mockManufacturers = [
      { id: 'manufacturer-id-1', name: 'Manufacturer 1' },
      { id: 'manufacturer-id-2', name: 'Manufacturer 2' },
    ];

    beforeEach(() => {
      (manufacturerDataCoreService.getManufacturersByIds as jest.Mock).mockResolvedValue(
        mockManufacturers
      );
    });

    it('should retrieve multiple manufacturers by IDs', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: ['manufacturer-id-1', 'manufacturer-id-2'],
      };

      await manufacturerDataController.getManufacturersByIds(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerDataCoreService.getManufacturersByIds).toHaveBeenCalledWith([
        'manufacturer-id-1',
        'manufacturer-id-2',
      ]);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.manufacturers).toEqual(mockManufacturers);
    });

    it('should return 400 when manufacturerIds array is missing', async () => {
      mockRequest.validatedBody = {};

      await manufacturerDataController.getManufacturersByIds(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when manufacturerIds array is empty', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: [],
      };

      await manufacturerDataController.getManufacturersByIds(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getManufacturerCount', () => {
    beforeEach(() => {
      (manufacturerDataCoreService.getManufacturerCount as jest.Mock).mockResolvedValue(150);
    });

    it('should retrieve manufacturer count without criteria', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerDataController.getManufacturerCount(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.getManufacturerCount).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.count).toBe(150);
    });

    it('should retrieve manufacturer count with criteria', async () => {
      mockRequest.validatedQuery = {
        criteria: 'verified=true',
      };

      await manufacturerDataController.getManufacturerCount(mockRequest, mockResponse, mockNext);

      expect(manufacturerDataCoreService.getManufacturerCount).toHaveBeenCalledWith(
        'verified=true'
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics for search', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerDataController,
        'recordPerformance' as any
      );
      mockRequest.validatedQuery = {};
      (manufacturerDataCoreService.searchManufacturers as jest.Mock).mockResolvedValue({
        manufacturers: [],
        total: 0,
      });

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'SEARCH_MANUFACTURERS'
      );
    });
  });

  describe('Logging', () => {
    it('should log search operation with results count', async () => {
      const logActionSpy = jest.spyOn(manufacturerDataController, 'logAction' as any);
      mockRequest.validatedQuery = {};
      (manufacturerDataCoreService.searchManufacturers as jest.Mock).mockResolvedValue({
        manufacturers: [{ id: '1' }, { id: '2' }],
        total: 2,
      });

      await manufacturerDataController.searchManufacturers(mockRequest, mockResponse, mockNext);

      expect(logActionSpy).toHaveBeenCalledWith(
        mockRequest,
        'SEARCH_MANUFACTURERS_SUCCESS',
        expect.objectContaining({
          businessId: 'business-id-123',
          resultsCount: 2,
        })
      );
    });
  });
});

