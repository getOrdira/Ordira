/**
 * Manufacturer Analytics Service Unit Tests
 * 
 * Tests manufacturer analytics generation and reporting.
 */

import { AnalyticsService } from '../../../services/manufacturers/features/analytics.service';
import { IManufacturer, Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { enhancedCacheService } from '../../../services/external/enhanced-cache.service';

// Mock dependencies
const mockEnhancedCacheService = {
  getCachedAnalytics: jest.fn(),
  cacheAnalytics: jest.fn(),
};

// Mock services
jest.mock('../../../services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
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

describe('ManufacturerAnalyticsService', () => {
  let manufacturerAnalyticsService: AnalyticsService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockAnalytics = {
    profileViews: 100,
    connectionRequests: 25,
    activeConnections: 10,
    productInquiries: 5,
    profileCompleteness: 85,
    industryRanking: 5,
    performanceScore: 82,
    engagement: {
      totalInteractions: 150,
      averageResponseTime: 12,
      responseRate: 85,
    },
    growth: {
      viewsGrowth: 15,
      connectionsGrowth: 10,
      inquiriesGrowth: 5,
    },
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
  };

  beforeEach(() => {
    manufacturerAnalyticsService = new AnalyticsService();
    jest.clearAllMocks();
    
      mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
  });

  describe('getManufacturerAnalytics', () => {
    it('should return cached analytics when available', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(mockAnalytics);

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(mockEnhancedCacheService.getCachedAnalytics).toHaveBeenCalled();
      expect(result).toEqual(mockAnalytics);
    });

    it('should generate analytics when cache is not available', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 100,
            connectionRequests: {
              sent: 20,
              received: 15,
              approved: 10,
            },
            brands: [],
            averageResponseTime: 12,
            activityMetrics: {
              profileCompleteness: 85,
            },
            lastLoginAt: new Date(),
          }),
        }),
      });

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(result.profileViews).toBeDefined();
      expect(result.connectionRequests).toBeDefined();
      expect(result.activeConnections).toBeDefined();
      expect(mockEnhancedCacheService.cacheAnalytics).toHaveBeenCalled();
    });

    it('should calculate profile completeness', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 0,
            connectionRequests: {},
            brands: [],
            activityMetrics: {
              profileCompleteness: 85,
            },
          }),
        }),
      });

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(result.profileCompleteness).toBeDefined();
      expect(result.profileCompleteness).toBeGreaterThanOrEqual(0);
      expect(result.profileCompleteness).toBeLessThanOrEqual(100);
    });

    it('should calculate engagement metrics', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 100,
            connectionRequests: {
              sent: 20,
              received: 15,
              approved: 10,
            },
            brands: [],
            averageResponseTime: 12,
            activityMetrics: {
              profileCompleteness: 85,
            },
          }),
        }),
      });

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(result.engagement).toBeDefined();
      expect(result.engagement.totalInteractions).toBeDefined();
      expect(result.engagement.averageResponseTime).toBeDefined();
      expect(result.engagement.responseRate).toBeDefined();
    });

    it('should calculate growth metrics', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 100,
            connectionRequests: {},
            brands: [],
            activityMetrics: {
              profileCompleteness: 85,
            },
          }),
        }),
      });

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123'
      );

      expect(result.growth).toBeDefined();
      expect(result.growth.viewsGrowth).toBeDefined();
      expect(result.growth.connectionsGrowth).toBeDefined();
    });

    it('should handle time range filter', async () => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 0,
            connectionRequests: {},
            brands: [],
            activityMetrics: {},
          }),
        }),
      });

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      const result = await manufacturerAnalyticsService.getManufacturerAnalytics(
        'manufacturer-id-123',
        timeRange
      );

      expect(result.timeRange).toEqual(timeRange);
    });
  });

  describe('getManufacturerStatistics', () => {
    beforeEach(() => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { ...mockAnalytics, industry: 'Technology', profileScore: 85 },
          { ...mockAnalytics, industry: 'Technology', profileScore: 90 },
        ]),
      });
      
      (Manufacturer.aggregate as jest.Mock) = jest.fn().mockResolvedValue([
        { _id: 'Technology', count: 10 },
      ]);
    });

    it('should return global manufacturer statistics', async () => {
      const result = await manufacturerAnalyticsService.getManufacturerStatistics();

      expect(result.globalStats).toBeDefined();
      expect(result.globalStats.total).toBeDefined();
      expect(result.globalStats.active).toBeDefined();
      expect(result.globalStats.verified).toBeDefined();
      expect(result.globalStats.averageProfileScore).toBeDefined();
    });

    it('should return industry breakdown', async () => {
      const result = await manufacturerAnalyticsService.getManufacturerStatistics();

      expect(result.industryBreakdown).toBeDefined();
      expect(Array.isArray(result.industryBreakdown)).toBe(true);
    });

    it('should return trends data', async () => {
      const result = await manufacturerAnalyticsService.getManufacturerStatistics();

      expect(result.trends).toBeDefined();
      expect(result.trends.newManufacturers).toBeDefined();
      expect(result.trends.growthRate).toBeDefined();
    });

    it('should return top services', async () => {
      const result = await manufacturerAnalyticsService.getManufacturerStatistics();

      expect(result.topServices).toBeDefined();
      expect(Array.isArray(result.topServices)).toBe(true);
    });

    it('should return average metrics', async () => {
      const result = await manufacturerAnalyticsService.getManufacturerStatistics();

      expect(result.averageMetrics).toBeDefined();
      expect(result.averageMetrics.moq).toBeDefined();
      expect(result.averageMetrics.responseTime).toBeDefined();
      expect(result.averageMetrics.satisfaction).toBeDefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'manufacturer-id-123',
            profileViews: 100,
            connectionRequests: {
              sent: 20,
              received: 15,
              approved: 10,
              pending: 3,
              rejected: 2,
            },
            brands: [],
            averageResponseTime: 12,
            industry: 'Technology',
          }),
        }),
      });
    });

    it('should return performance metrics for manufacturer', async () => {
      const result = await manufacturerAnalyticsService.getPerformanceMetrics('manufacturer-id-123');

      expect(result.profileViews).toBeDefined();
      expect(result.connections).toBeDefined();
      expect(result.engagement).toBeDefined();
      expect(result.industryComparison).toBeDefined();
    });

    it('should calculate connection success rate', async () => {
      const result = await manufacturerAnalyticsService.getPerformanceMetrics('manufacturer-id-123');

      expect(result.connections.successRate).toBeDefined();
      expect(result.connections.successRate).toBeGreaterThanOrEqual(0);
      expect(result.connections.successRate).toBeLessThanOrEqual(100);
    });

    it('should calculate industry ranking', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { profileScore: 70 },
          { profileScore: 85 },
          { profileScore: 90 },
        ]),
      });

      const result = await manufacturerAnalyticsService.getPerformanceMetrics('manufacturer-id-123');

      expect(result.industryComparison.ranking).toBeDefined();
      expect(result.industryComparison.percentile).toBeDefined();
    });
  });

  describe('exportAnalytics', () => {
    beforeEach(() => {
      mockEnhancedCacheService.getCachedAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should export analytics in JSON format', async () => {
      const result = await manufacturerAnalyticsService.exportAnalytics(
        'manufacturer-id-123',
        { format: 'json', dateRange: { start: new Date(), end: new Date() }, includeGraphs: false, includeComparisons: false, anonymize: false }
      );

      expect(result.format).toBe('json');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should export analytics in CSV format', async () => {
      const result = await manufacturerAnalyticsService.exportAnalytics(
        'manufacturer-id-123',
        { format: 'csv', dateRange: { start: new Date(), end: new Date() }, includeGraphs: false, includeComparisons: false, anonymize: false }
      );

      expect(result.format).toBe('csv');
    });

    it('should export analytics in PDF format', async () => {
      const result = await manufacturerAnalyticsService.exportAnalytics(
        'manufacturer-id-123',
        { format: 'pdf', dateRange: { start: new Date(), end: new Date() }, includeGraphs: false, includeComparisons: false, anonymize: false }
      );

      expect(result.format).toBe('pdf');
    });

    it('should include date range in export', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      };

      const result = await manufacturerAnalyticsService.exportAnalytics(
        'manufacturer-id-123',
        {
          format: 'json',
          dateRange,
          includeGraphs: false,
          includeComparisons: false,
          anonymize: false
        }
      );

      expect(result.generatedAt).toEqual(dateRange);
    });
  });
});

