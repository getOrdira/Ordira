/**
 * Manufacturer Comparison Controller Unit Tests
 * 
 * Tests manufacturer comparison operations: compare two, find similar, match criteria, ranking.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerComparisonController } from '../../../../controllers/features/manufacturers/manufacturerComparison.controller';
import { ComparisonEngineService } from '../../../../services/manufacturers/utils/comparisonEngine.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock comparison engine service
jest.mock('../../../../services/manufacturers/utils/comparisonEngine.service', () => ({
  ComparisonEngineService: jest.fn().mockImplementation(() => ({
    compareManufacturers: jest.fn(),
    findSimilarManufacturers: jest.fn(),
    matchAgainstCriteria: jest.fn(),
    rankManufacturers: jest.fn(),
  })),
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

describe('ManufacturerComparisonController', () => {
  let manufacturerComparisonController: ManufacturerComparisonController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockComparisonEngine: any;

  beforeEach(() => {
    manufacturerComparisonController = new ManufacturerComparisonController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    // Get the mocked instance
    mockComparisonEngine = (manufacturerComparisonController as any).comparisonEngine;
  });

  describe('compareManufacturers', () => {
    beforeEach(() => {
      (mockComparisonEngine.compareManufacturers as jest.Mock).mockReturnValue(0.85);
    });

    it('should compare two manufacturers successfully', async () => {
      mockRequest.validatedBody = {
        manufacturer1: {
          id: 'manufacturer-id-1',
          name: 'Manufacturer 1',
          industry: 'Electronics',
        },
        manufacturer2: {
          id: 'manufacturer-id-2',
          name: 'Manufacturer 2',
          industry: 'Electronics',
        },
      };

      await manufacturerComparisonController.compareManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.compareManufacturers).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturer1,
        mockRequest.validatedBody.manufacturer2
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.similarityScore).toBe(0.85);
    });

    it('should return 400 when manufacturer1 is missing', async () => {
      mockRequest.validatedBody = {
        manufacturer2: {
          id: 'manufacturer-id-2',
          name: 'Manufacturer 2',
        },
      };

      await manufacturerComparisonController.compareManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedBody = {
        manufacturer1: { id: 'manufacturer-id-1' },
        manufacturer2: { id: 'manufacturer-id-2' },
      };

      await manufacturerComparisonController.compareManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('findSimilarManufacturers', () => {
    const mockSimilarManufacturers = [
      { id: 'manufacturer-id-2', similarity: 0.9 },
      { id: 'manufacturer-id-3', similarity: 0.75 },
    ];

    beforeEach(() => {
      (mockComparisonEngine.findSimilarManufacturers as jest.Mock).mockReturnValue(
        mockSimilarManufacturers
      );
    });

    it('should find similar manufacturers with default threshold', async () => {
      mockRequest.validatedBody = {
        sourceManufacturer: {
          id: 'manufacturer-id-1',
          industry: 'Electronics',
        },
        candidates: [
          { id: 'manufacturer-id-2', industry: 'Electronics' },
          { id: 'manufacturer-id-3', industry: 'Electronics' },
        ],
      };

      await manufacturerComparisonController.findSimilarManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.findSimilarManufacturers).toHaveBeenCalledWith(
        mockRequest.validatedBody.sourceManufacturer,
        mockRequest.validatedBody.candidates,
        50 // Default threshold
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply custom threshold', async () => {
      mockRequest.validatedBody = {
        sourceManufacturer: { id: 'manufacturer-id-1' },
        candidates: [{ id: 'manufacturer-id-2' }],
        threshold: 80,
      };

      await manufacturerComparisonController.findSimilarManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.findSimilarManufacturers).toHaveBeenCalledWith(
        mockRequest.validatedBody.sourceManufacturer,
        mockRequest.validatedBody.candidates,
        80
      );
    });

    it('should return 400 when sourceManufacturer is missing', async () => {
      mockRequest.validatedBody = {
        candidates: [{ id: 'manufacturer-id-2' }],
      };

      await manufacturerComparisonController.findSimilarManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('matchAgainstCriteria', () => {
    const mockMatchResult = {
      matches: true,
      score: 0.92,
      matchedCriteria: ['industry', 'services'],
    };

    beforeEach(() => {
      (mockComparisonEngine.matchAgainstCriteria as jest.Mock).mockReturnValue(mockMatchResult);
    });

    it('should match manufacturer against criteria', async () => {
      mockRequest.validatedBody = {
        manufacturer: {
          id: 'manufacturer-id-1',
          industry: 'Electronics',
          servicesOffered: ['Assembly'],
        },
        criteria: {
          industry: 'Electronics',
          services: ['Assembly'],
          moqRange: { min: 100, max: 1000 },
        },
      };

      await manufacturerComparisonController.matchAgainstCriteria(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.matchAgainstCriteria).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturer,
        mockRequest.validatedBody.criteria
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.matchResult).toEqual(mockMatchResult);
    });

    it('should return 400 when manufacturer is missing', async () => {
      mockRequest.validatedBody = {
        criteria: {
          industry: 'Electronics',
        },
      };

      await manufacturerComparisonController.matchAgainstCriteria(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rankManufacturers', () => {
    const mockRankedManufacturers = [
      { id: 'manufacturer-id-1', rank: 1, score: 0.95 },
      { id: 'manufacturer-id-2', rank: 2, score: 0.85 },
    ];

    beforeEach(() => {
      (mockComparisonEngine.rankManufacturers as jest.Mock).mockReturnValue(
        mockRankedManufacturers
      );
    });

    it('should rank manufacturers with default weights', async () => {
      mockRequest.validatedBody = {
        manufacturers: [
          { id: 'manufacturer-id-1' },
          { id: 'manufacturer-id-2' },
        ],
      };

      await manufacturerComparisonController.rankManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.rankManufacturers).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturers,
        undefined // Default weights
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply custom weights', async () => {
      mockRequest.validatedBody = {
        manufacturers: [{ id: 'manufacturer-id-1' }],
        weights: {
          profileScore: 0.4,
          matchScore: 0.3,
          certificationCount: 0.2,
          servicesCount: 0.1,
        },
      };

      await manufacturerComparisonController.rankManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockComparisonEngine.rankManufacturers).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturers,
        mockRequest.validatedBody.weights
      );
    });

    it('should return 400 when manufacturers array is empty', async () => {
      mockRequest.validatedBody = {
        manufacturers: [],
      };

      await manufacturerComparisonController.rankManufacturers(
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
        manufacturer1: { id: 'manufacturer-id-1' },
        manufacturer2: { id: 'manufacturer-id-2' },
      };
      const serviceError = new Error('Comparison failed');
      (mockComparisonEngine.compareManufacturers as jest.Mock).mockImplementation(() => {
        throw serviceError;
      });

      await manufacturerComparisonController.compareManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerComparisonController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        manufacturer1: { id: 'manufacturer-id-1' },
        manufacturer2: { id: 'manufacturer-id-2' },
      };
      (mockComparisonEngine.compareManufacturers as jest.Mock).mockReturnValue(0.85);

      await manufacturerComparisonController.compareManufacturers(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'COMPARE_TWO_MANUFACTURERS'
      );
    });
  });
});

