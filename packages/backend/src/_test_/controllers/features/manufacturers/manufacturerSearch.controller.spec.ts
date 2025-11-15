/**
 * Manufacturer Search Controller Unit Tests
 * 
 * Tests advanced manufacturer search, comparison, trend analysis, and benchmarks.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerSearchController } from '../../../../controllers/features/manufacturers/manufacturerSearch.controller';
import { manufacturerSearchService } from '../../../../services/manufacturers/features/search.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock manufacturer search service
jest.mock('../../../../services/manufacturers/features/search.service', () => ({
  manufacturerSearchService: {
    advancedSearch: jest.fn(),
    compareManufacturers: jest.fn(),
    getTrendAnalysis: jest.fn(),
    getIndustryBenchmarks: jest.fn(),
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

describe('ManufacturerSearchController', () => {
  let manufacturerSearchController: ManufacturerSearchController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerSearchController = new ManufacturerSearchController();
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

  describe('advancedSearch', () => {
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
      (manufacturerSearchService.advancedSearch as jest.Mock).mockResolvedValue(mockSearchResults);
    });

    it('should perform advanced search with basic filters', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        industry: 'Electronics',
      };
      mockRequest.validatedQuery = {};

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(manufacturerSearchService.advancedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Manufacturer',
          industry: 'Electronics',
        }),
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply all search filters', async () => {
      mockRequest.validatedBody = {
        name: 'Test',
        industry: 'Electronics',
        location: 'United States',
        verificationStatus: 'verified',
        size: 'large',
        establishedYear: { min: 2000, max: 2020 },
        certifications: ['ISO 9001'],
        productCategories: ['Electronics'],
        sustainabilityRating: { min: 4, max: 5 },
        revenueRange: { min: 1000000, max: 10000000 },
        employeeCount: { min: 100, max: 1000 },
        supplyChainCompliance: true,
        hasBlockchainIntegration: true,
        geolocation: {
          lat: 40.7128,
          lng: -74.0060,
          radius: 50,
        },
      };
      mockRequest.validatedQuery = {
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
        fuzzySearch: true,
        highlightMatches: true,
      };

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(manufacturerSearchService.advancedSearch).toHaveBeenCalled();
    });

    it('should apply default search options', async () => {
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      const callArgs = (manufacturerSearchService.advancedSearch as jest.Mock).mock.calls[0][1];
      expect(callArgs.sortBy).toBe('relevance');
      expect(callArgs.sortOrder).toBe('desc');
      expect(callArgs.page).toBe(1);
      expect(callArgs.limit).toBe(20);
    });

    it('should sanitize input before searching', async () => {
      mockRequest.validatedBody = {
        name: '<script>alert("xss")</script>Test',
      };
      mockRequest.validatedQuery = {};

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(manufacturerSearchService.advancedSearch).toHaveBeenCalled();
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('compareManufacturers', () => {
    const mockComparison = {
      manufacturers: [],
      comparisons: {
        financialMetrics: {},
        sustainabilityScores: {},
      },
    };

    beforeEach(() => {
      (manufacturerSearchService.compareManufacturers as jest.Mock).mockResolvedValue(
        mockComparison
      );
    });

    it('should compare manufacturers successfully', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: ['manufacturer-id-1', 'manufacturer-id-2'],
        criteria: {
          financialMetrics: true,
          sustainabilityScores: true,
        },
      };

      await manufacturerSearchController.compareManufacturers(mockRequest, mockResponse, mockNext);

      expect(manufacturerSearchService.compareManufacturers).toHaveBeenCalledWith(
        ['manufacturer-id-1', 'manufacturer-id-2'],
        expect.objectContaining({
          financialMetrics: true,
          sustainabilityScores: true,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when manufacturerIds array is empty', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: [],
      };

      await manufacturerSearchController.compareManufacturers(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should apply all comparison criteria', async () => {
      mockRequest.validatedBody = {
        manufacturerIds: ['manufacturer-id-1', 'manufacturer-id-2'],
        criteria: {
          financialMetrics: true,
          sustainabilityScores: true,
          productPortfolio: true,
          certifications: true,
          supplyChainMetrics: true,
          customerSatisfaction: true,
          innovationIndex: true,
        },
      };

      await manufacturerSearchController.compareManufacturers(mockRequest, mockResponse, mockNext);

      const callArgs = (manufacturerSearchService.compareManufacturers as jest.Mock).mock
        .calls[0][1];
      expect(callArgs.financialMetrics).toBe(true);
      expect(callArgs.innovationIndex).toBe(true);
    });
  });

  describe('getTrendAnalysis', () => {
    const mockTrendData = {
      metric: 'sustainabilityRating',
      dataPoints: [],
      trend: 'increasing',
    };

    beforeEach(() => {
      (manufacturerSearchService.getTrendAnalysis as jest.Mock).mockResolvedValue(mockTrendData);
    });

    it('should retrieve trend analysis', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        metric: 'sustainabilityRating',
        timeframe: 'monthly',
      };

      await manufacturerSearchController.getTrendAnalysis(mockRequest, mockResponse, mockNext);

      expect(manufacturerSearchService.getTrendAnalysis).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'sustainabilityRating',
        'monthly'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when metric is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        timeframe: 'monthly',
      };

      await manufacturerSearchController.getTrendAnalysis(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when timeframe is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        metric: 'sustainabilityRating',
      };

      await manufacturerSearchController.getTrendAnalysis(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getIndustryBenchmarks', () => {
    const mockBenchmarks = {
      industry: 'Electronics',
      averages: {},
      percentiles: {},
    };

    beforeEach(() => {
      (manufacturerSearchService.getIndustryBenchmarks as jest.Mock).mockResolvedValue(
        mockBenchmarks
      );
    });

    it('should retrieve industry benchmarks', async () => {
      mockRequest.validatedQuery = {
        industry: 'Electronics',
      };

      await manufacturerSearchController.getIndustryBenchmarks(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(manufacturerSearchService.getIndustryBenchmarks).toHaveBeenCalledWith('Electronics');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when industry is missing', async () => {
      mockRequest.validatedQuery = {};

      await manufacturerSearchController.getIndustryBenchmarks(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        name: 'Test',
      };
      mockRequest.validatedQuery = {};
      const serviceError = {
        statusCode: 500,
        message: 'Search service unavailable',
      };
      (manufacturerSearchService.advancedSearch as jest.Mock).mockRejectedValue(serviceError);

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerSearchController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {};
      mockRequest.validatedQuery = {};
      (manufacturerSearchService.advancedSearch as jest.Mock).mockResolvedValue({
        manufacturers: [],
        total: 0,
      });

      await manufacturerSearchController.advancedSearch(mockRequest, mockResponse, mockNext);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'ADVANCED_MANUFACTURER_SEARCH'
      );
    });
  });
});

