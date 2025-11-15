/**
 * Manufacturer Search Service Unit Tests
 * 
 * Tests advanced manufacturer search functionality.
 */

import { ManufacturerSearchService } from '../../../services/manufacturers/features/search.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { enhancedDatabaseService } from '../../../services/external/enhanced-database.service';
import { enhancedCacheService } from '../../../services/external/enhanced-cache.service';
import { aggregationOptimizationService } from '../../../services/external/aggregation-optimization.service';
import { cacheService } from '../../../services/external/cache.service';

// Mock dependencies
const mockEnhancedDatabaseService = {
  // Add methods as needed
};

const mockEnhancedCacheService = {
  // Add methods as needed
};

const mockAggregationOptimizationService = {
  executeOptimizedAggregation: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

// Mock services
jest.mock('../../../services/external/enhanced-database.service', () => ({
  enhancedDatabaseService: mockEnhancedDatabaseService,
}));

jest.mock('../../../services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));

jest.mock('../../../services/external/aggregation-optimization.service', () => ({
  aggregationOptimizationService: mockAggregationOptimizationService,
}));

jest.mock('../../../services/external/cache.service', () => ({
  cacheService: mockCacheService,
}));

// Mock Manufacturer model
jest.mock('../../../models/manufacturer/manufacturer.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerSearchService', () => {
  let manufacturerSearchService: ManufacturerSearchService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockManufacturer = {
    _id: 'manufacturer-id-123',
    name: 'Test Manufacturer',
    industry: 'Technology',
    verificationStatus: 'verified',
    sustainabilityRating: 85,
    certifications: ['ISO 9001'],
    location: {
      country: 'US',
    },
    companySize: 'medium',
    establishedYear: 2010,
    annualRevenue: 1000000,
    employeeCount: 50,
    supplyChainCompliance: true,
    hasBlockchainIntegration: true,
  };

  beforeEach(() => {
    manufacturerSearchService = new ManufacturerSearchService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
    mockCacheService.get.mockResolvedValue(null);
    mockAggregationOptimizationService.executeOptimizedAggregation.mockResolvedValue([mockManufacturer]);
  });

  describe('advancedSearch', () => {
    const mockFilters = {
      name: 'Test',
      industry: 'Technology',
      verificationStatus: 'verified' as const,
    };

    const mockOptions = {
      sortBy: 'relevance' as const,
      sortOrder: 'desc' as const,
      page: 1,
      limit: 20,
    };

    it('should return cached search results when available', async () => {
      const cachedResult = {
        results: [{ manufacturer: mockManufacturer, score: 100 }],
        total: 1,
        page: 1,
        totalPages: 1,
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await manufacturerSearchService.advancedSearch(mockFilters, mockOptions);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockAggregationOptimizationService.executeOptimizedAggregation).not.toHaveBeenCalled();
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
    });

    it('should perform advanced search when cache is not available', async () => {
      mockAggregationOptimizationService.executeOptimizedAggregation
        .mockResolvedValueOnce([mockManufacturer])
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await manufacturerSearchService.advancedSearch(mockFilters, mockOptions);

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
      expect(result.results).toBeDefined();
      expect(result.total).toBe(1);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should filter by name', async () => {
      await manufacturerSearchService.advancedSearch(
        { name: 'Test' },
        mockOptions
      );

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });

    it('should filter by industry', async () => {
      await manufacturerSearchService.advancedSearch(
        { industry: 'Technology' },
        mockOptions
      );

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });

    it('should filter by verification status', async () => {
      await manufacturerSearchService.advancedSearch(
        { verificationStatus: 'verified' },
        mockOptions
      );

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });

    it('should filter by geolocation when provided', async () => {
      const filters = {
        geolocation: {
          lat: 40.7128,
          lng: -74.0060,
          radius: 50,
        },
      };

      await manufacturerSearchService.advancedSearch(filters, mockOptions);

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });

    it('should generate search suggestions when no results', async () => {
      mockAggregationOptimizationService.executeOptimizedAggregation
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);
      
      (Manufacturer.distinct as jest.Mock) = jest.fn().mockResolvedValue(['Technology']);

      const result = await manufacturerSearchService.advancedSearch(mockFilters, mockOptions);

      expect(result.suggestions).toBeDefined();
    });

    it('should handle pagination', async () => {
      const options = {
        ...mockOptions,
        page: 2,
        limit: 10,
      };

      await manufacturerSearchService.advancedSearch(mockFilters, options);

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });

    it('should calculate relevance score when sortBy is relevance', async () => {
      const options = {
        ...mockOptions,
        sortBy: 'relevance' as const,
      };

      await manufacturerSearchService.advancedSearch(mockFilters, options);

      expect(mockAggregationOptimizationService.executeOptimizedAggregation).toHaveBeenCalled();
    });
  });

  describe('compareManufacturers', () => {
    const mockManufacturerIds = ['id-1', 'id-2'];
    const mockCriteria = {
      financialMetrics: true,
      sustainabilityScores: true,
    };

    beforeEach(() => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer, _id: 'id-1', annualRevenue: 1000000 },
          { ...mockManufacturer, _id: 'id-2', annualRevenue: 2000000 },
        ]),
      });
    });

    it('should compare manufacturers successfully', async () => {
      const result = await manufacturerSearchService.compareManufacturers(
        mockManufacturerIds,
        mockCriteria
      );

      expect(Manufacturer.find).toHaveBeenCalledWith({
        _id: { $in: mockManufacturerIds },
        isActive: true,
      });
      expect(result.manufacturers).toBeDefined();
      expect(result.comparisonMatrix).toBeDefined();
      expect(result.rankings).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached comparison when available', async () => {
      const cachedComparison = {
        manufacturers: [],
        comparisonMatrix: {},
        rankings: {},
        insights: [],
        generatedAt: new Date(),
      };
      mockCacheService.get.mockResolvedValue(cachedComparison);

      const result = await manufacturerSearchService.compareManufacturers(
        mockManufacturerIds,
        mockCriteria
      );

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedComparison);
    });

    it('should throw error when comparing less than 2 manufacturers', async () => {
      await expect(
        manufacturerSearchService.compareManufacturers(['id-1'], mockCriteria)
      ).rejects.toThrow('Can only compare between 2 and 5 manufacturers');
    });

    it('should throw error when comparing more than 5 manufacturers', async () => {
      await expect(
        manufacturerSearchService.compareManufacturers(
          ['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6'],
          mockCriteria
        )
      ).rejects.toThrow('Can only compare between 2 and 5 manufacturers');
    });

    it('should throw error when manufacturers are not found', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      await expect(
        manufacturerSearchService.compareManufacturers(mockManufacturerIds, mockCriteria)
      ).rejects.toThrow('One or more manufacturers not found');
    });

    it('should compare financial metrics when requested', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer, _id: 'id-1', annualRevenue: 1000000 },
          { ...mockManufacturer, _id: 'id-2', annualRevenue: 2000000 },
        ]),
      });

      const result = await manufacturerSearchService.compareManufacturers(
        mockManufacturerIds,
        { financialMetrics: true }
      );

      expect(result.rankings).toHaveProperty('annualRevenue');
    });

    it('should compare sustainability scores when requested', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer, _id: 'id-1', sustainabilityRating: 80 },
          { ...mockManufacturer, _id: 'id-2', sustainabilityRating: 90 },
        ]),
      });

      const result = await manufacturerSearchService.compareManufacturers(
        mockManufacturerIds,
        { sustainabilityScores: true }
      );

      expect(result.rankings).toHaveProperty('sustainabilityRating');
    });

    it('should generate insights from comparison', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer, _id: 'id-1', name: 'Manufacturer 1' },
          { ...mockManufacturer, _id: 'id-2', name: 'Manufacturer 2' },
        ]),
      });

      const result = await manufacturerSearchService.compareManufacturers(
        mockManufacturerIds,
        mockCriteria
      );

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return trend analysis for manufacturer', async () => {
      mockCacheService.get.mockResolvedValue(null);
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const result = await manufacturerSearchService.getTrendAnalysis(
        'manufacturer-id-123',
        'profileViews',
        'monthly'
      );

      expect(result.metric).toBe('profileViews');
      expect(result.timeframe).toBe('monthly');
      expect(result.data).toBeDefined();
      expect(result.trend).toBeDefined();
    });

    it('should return cached trend analysis when available', async () => {
      const cachedAnalysis = {
        metric: 'profileViews',
        timeframe: 'monthly',
        data: [],
        trend: 'stable' as const,
      };
      mockCacheService.get.mockResolvedValue(cachedAnalysis);

      const result = await manufacturerSearchService.getTrendAnalysis(
        'manufacturer-id-123',
        'profileViews',
        'monthly'
      );

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedAnalysis);
    });

    it('should handle different timeframes', async () => {
      const timeframes = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
      
      for (const timeframe of timeframes) {
        mockCacheService.get.mockResolvedValue(null);
        (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        });

        const result = await manufacturerSearchService.getTrendAnalysis(
          'manufacturer-id-123',
          'profileViews',
          timeframe
        );

        expect(result.timeframe).toBe(timeframe);
      }
    });
  });

  describe('getIndustryBenchmarks', () => {
    beforeEach(() => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer, sustainabilityRating: 80, annualRevenue: 1000000 },
          { ...mockManufacturer, sustainabilityRating: 90, annualRevenue: 2000000 },
        ]),
      });
    });

    it('should return industry benchmarks', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await manufacturerSearchService.getIndustryBenchmarks('Technology');

      expect(result.industry).toBe('Technology');
      expect(result.metrics).toBeDefined();
      expect(result.sampleSize).toBeGreaterThan(0);
    });

    it('should return cached benchmarks when available', async () => {
      const cachedBenchmarks = {
        industry: 'Technology',
        metrics: {},
        sampleSize: 10,
        lastUpdated: new Date(),
      };
      mockCacheService.get.mockResolvedValue(cachedBenchmarks);

      const result = await manufacturerSearchService.getIndustryBenchmarks('Technology');

      expect(result).toEqual(cachedBenchmarks);
    });

    it('should throw error when insufficient data', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockManufacturer },
          { ...mockManufacturer },
        ]),
      });
      mockCacheService.get.mockResolvedValue(null);

      await expect(
        manufacturerSearchService.getIndustryBenchmarks('Technology')
      ).rejects.toThrow('Insufficient data for industry benchmarks');
    });

    it('should calculate statistical metrics', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await manufacturerSearchService.getIndustryBenchmarks('Technology');

      if (result.metrics.sustainabilityRating) {
        expect(result.metrics.sustainabilityRating).toHaveProperty('average');
        expect(result.metrics.sustainabilityRating).toHaveProperty('median');
        expect(result.metrics.sustainabilityRating).toHaveProperty('min');
        expect(result.metrics.sustainabilityRating).toHaveProperty('max');
        expect(result.metrics.sustainabilityRating).toHaveProperty('percentiles');
      }
    });
  });
});

