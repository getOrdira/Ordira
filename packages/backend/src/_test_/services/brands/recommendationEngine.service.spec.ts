/**
 * Recommendation Engine Service Unit Tests
 * 
 * Tests personalized recommendation generation.
 */

import { RecommendationEngineService } from '../../../services/brands/utils/recommendationEngine.service';
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

describe('RecommendationEngineService', () => {
  let recommendationEngine: RecommendationEngineService;

  const mockContext = {
    businessId: 'business-id-123',
    plan: 'premium',
    industry: 'Technology',
  };

  beforeEach(() => {
    recommendationEngine = new RecommendationEngineService();
    jest.clearAllMocks();
  });

  describe('generatePersonalizedRecommendations', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'business-id-123',
        industry: 'Technology',
        toObject: jest.fn().mockReturnValue({}),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue({}),
      });
    });

    it('should generate personalized recommendations', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(mockContext);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should respect limit option', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(
        mockContext,
        { limit: 5 }
      );

      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should filter by types when specified', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(
        mockContext,
        { types: ['profile'] }
      );

      expect(result.recommendations.every(r => r.type === 'profile')).toBe(true);
    });

    it('should filter by minimum priority', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(
        mockContext,
        { minPriority: 'high' }
      );

      expect(
        result.recommendations.every(
          r => ['high', 'critical'].includes(r.priority)
        )
      ).toBe(true);
    });

    it('should generate filters by type', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(mockContext);

      expect(result.filters.byType).toBeDefined();
      expect(result.filters.byPriority).toBeDefined();
      expect(result.filters.byCategory).toBeDefined();
    });

    it('should calculate personalized score', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(mockContext);

      expect(result.personalizedScore).toBeDefined();
      expect(result.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(result.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should generate summary statistics', async () => {
      const result = await recommendationEngine.generatePersonalizedRecommendations(mockContext);

      expect(result.summary.total).toBeGreaterThanOrEqual(0);
      expect(result.summary.highPriority).toBeGreaterThanOrEqual(0);
      expect(result.summary.quickWins).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when business is not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(
        recommendationEngine.generatePersonalizedRecommendations(mockContext)
      ).rejects.toThrow('Business not found');
    });
  });

  describe('getRecommendationById', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'business-id-123',
        toObject: jest.fn().mockReturnValue({}),
      });
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue({}),
      });
    });

    it('should return recommendation by ID', async () => {
      const result = await recommendationEngine.getRecommendationById(
        'business-id-123',
        'recommendation-id'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('recommendation-id');
    });

    it('should return null when recommendation not found', async () => {
      const result = await recommendationEngine.getRecommendationById(
        'business-id-123',
        'non-existent-id'
      );

      expect(result).toBeNull();
    });
  });
});

