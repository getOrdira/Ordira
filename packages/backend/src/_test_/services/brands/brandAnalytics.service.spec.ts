/**
 * Brand Analytics Service Unit Tests
 * 
 * Tests brand analytics generation and reporting.
 */

import { AnalyticsService } from '../../../services/brands/features/analytics.service';
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';

// Mock models
jest.mock('../../../models/deprecated/business.model');
jest.mock('../../../models/brands/brandSettings.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    jest.clearAllMocks();
  });

  describe('getAccountAnalytics', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'business-id-123',
            profileViews: 100,
          }),
        }),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        plan: 'premium',
      });
    });

    it('should return account analytics with default timeframe', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123');

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.period.timeframe).toBe('30d');
      expect(result.apiUsage).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should parse timeframe correctly', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123', {
        timeframe: '7d',
      });

      expect(result.period.timeframe).toBe('7d');
    });

    it('should include engagement when requested', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123', {
        includeEngagement: true,
      });

      expect(result.options.includeEngagement).toBe(true);
      expect(result.engagement).toBeDefined();
    });

    it('should include conversions when requested', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123', {
        includeConversions: true,
      });

      expect(result.options.includeConversions).toBe(true);
      expect(result.conversions).toBeDefined();
    });

    it('should include advanced metrics when requested', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123', {
        includeAdvancedMetrics: true,
      });

      expect(result.options.includeAdvancedMetrics).toBe(true);
      expect(result.advanced).toBeDefined();
    });

    it('should calculate summary metrics', async () => {
      const result = await analyticsService.getAccountAnalytics('business-id-123');

      expect(result.summary.totalActiveDays).toBeDefined();
      expect(result.summary.mostActiveFeature).toBeDefined();
      expect(result.summary.growthTrend).toBeDefined();
    });
  });

  describe('getProfilePerformance', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'business-id-123',
          businessName: 'Test Brand',
          description: 'Test description',
          industry: 'Technology',
        }),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        plan: 'premium',
      });
    });

    it('should return profile performance metrics', async () => {
      const result = await analyticsService.getProfilePerformance('business-id-123');

      expect(result.completeness).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.missingFields).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should calculate completeness percentage', async () => {
      const result = await analyticsService.getProfilePerformance('business-id-123');

      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(100);
    });

    it('should identify missing fields', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'business-id-123',
          businessName: 'Test Brand',
          // Missing other fields
        }),
      });

      const result = await analyticsService.getProfilePerformance('business-id-123');

      expect(result.missingFields.length).toBeGreaterThan(0);
    });
  });

  describe('getAccountSummary', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'business-id-123',
          businessName: 'Test Brand',
          email: 'test@brand.com',
          industry: 'Technology',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isEmailVerified: true,
        }),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        plan: 'premium',
        web3Settings: {
          certificateWallet: '0x1234567890abcdef',
        },
      });
    });

    it('should return account summary', async () => {
      const result = await analyticsService.getAccountSummary('business-id-123');

      expect(result.id).toBe('business-id-123');
      expect(result.businessName).toBe('Test Brand');
      expect(result.email).toBe('test@brand.com');
      expect(result.plan).toBe('premium');
      expect(result.verified).toBe(true);
      expect(result.walletConnected).toBe(true);
    });

    it('should handle missing wallet', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        plan: 'premium',
        web3Settings: {},
      });

      const result = await analyticsService.getAccountSummary('business-id-123');

      expect(result.walletConnected).toBe(false);
    });
  });

  describe('exportAccountData', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'business-id-123',
        }),
      });
    });

    it('should export data in JSON format', async () => {
      const result = await analyticsService.exportAccountData('business-id-123', {
        format: 'json',
      });

      expect(result.format).toBe('json');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should export data in CSV format', async () => {
      const result = await analyticsService.exportAccountData('business-id-123', {
        format: 'csv',
      });

      expect(result.format).toBe('csv');
    });

    it('should include analytics when requested', async () => {
      const result = await analyticsService.exportAccountData('business-id-123', {
        format: 'json',
        includeAnalytics: true,
      });

      expect(result).toBeDefined();
    });

    it('should anonymize data when requested', async () => {
      const result = await analyticsService.exportAccountData('business-id-123', {
        format: 'json',
        anonymize: true,
      });

      expect(result).toBeDefined();
    });
  });
});

