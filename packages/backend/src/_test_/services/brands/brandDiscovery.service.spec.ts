/**
 * Brand Discovery Service Unit Tests
 * 
 * Tests brand discovery and recommendation features.
 */

import { DiscoveryService } from '../../../services/brands/features/discovery.service';
import { Business } from '../../../models/deprecated/business.model';

// Mock models
jest.mock('../../../models/deprecated/business.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  const mockBusiness = {
    _id: 'business-id-123',
    businessName: 'Test Brand',
    industry: 'Technology',
    profilePictureUrl: 'https://example.com/logo.jpg',
    isEmailVerified: false,
  };

  beforeEach(() => {
    discoveryService = new DiscoveryService();
    jest.clearAllMocks();
  });

  describe('getPersonalizedRecommendations', () => {
    beforeEach(() => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBusiness);
    });

    it('should return personalized recommendations', async () => {
      const result = await discoveryService.getPersonalizedRecommendations('business-id-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('priority');
    });

    it('should include profile completion recommendations', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBusiness,
        profilePictureUrl: null,
      });

      const result = await discoveryService.getPersonalizedRecommendations('business-id-123');

      const profileRec = result.find(r => r.type === 'profile');
      expect(profileRec).toBeDefined();
      expect(profileRec?.title).toContain('logo');
    });

    it('should include industry-specific recommendations', async () => {
      const result = await discoveryService.getPersonalizedRecommendations('business-id-123');

      const partnershipRec = result.find(r => r.type === 'partnership');
      expect(partnershipRec).toBeDefined();
    });

    it('should include verification recommendations', async () => {
      const result = await discoveryService.getPersonalizedRecommendations('business-id-123');

      const verificationRec = result.find(r => r.type === 'verification');
      expect(verificationRec).toBeDefined();
      expect(verificationRec?.title).toContain('email');
    });

    it('should respect limit option', async () => {
      const result = await discoveryService.getPersonalizedRecommendations('business-id-123', {
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should filter by type when specified', async () => {
      const result = await discoveryService.getPersonalizedRecommendations('business-id-123', {
        type: 'profile',
      });

      expect(result.every(r => r.type === 'profile')).toBe(true);
    });

    it('should return empty array when business not found', async () => {
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await discoveryService.getPersonalizedRecommendations('non-existent-id');

      expect(result).toEqual([]);
    });
  });

  describe('getConnectionOpportunities', () => {
    beforeEach(() => {
      (Business.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'business-2',
              businessName: 'Partner Brand',
              industry: 'Technology',
              profilePictureUrl: 'https://example.com/partner.jpg',
            },
          ]),
        }),
      });
      (Business.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBusiness);
    });

    it('should return connection opportunities', async () => {
      const result = await discoveryService.getConnectionOpportunities('business-id-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('businessId');
      expect(result[0]).toHaveProperty('compatibilityScore');
      expect(result[0]).toHaveProperty('connectionReason');
    });

    it('should calculate compatibility score', async () => {
      const result = await discoveryService.getConnectionOpportunities('business-id-123');

      expect(result[0].compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(result[0].compatibilityScore).toBeLessThanOrEqual(100);
    });

    it('should include connection reason', async () => {
      const result = await discoveryService.getConnectionOpportunities('business-id-123');

      expect(result[0].connectionReason).toBeDefined();
      expect(typeof result[0].connectionReason).toBe('string');
    });
  });

  describe('getSearchSuggestions', () => {
    beforeEach(() => {
      (Business.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { businessName: 'Test Brand 1' },
              { businessName: 'Test Brand 2' },
            ]),
          }),
        }),
      });
    });

    it('should return search suggestions', async () => {
      const result = await discoveryService.getSearchSuggestions('test');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('text');
    });

    it('should return empty array for empty query', async () => {
      const result = await discoveryService.getSearchSuggestions('');

      expect(result).toEqual([]);
    });
  });

  describe('getEcosystemAnalytics', () => {
    beforeEach(() => {
      (Business.countDocuments as jest.Mock) = jest.fn()
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);
      (Business.aggregate as jest.Mock) = jest.fn().mockResolvedValue([
        { _id: 'Technology', count: 50 },
        { _id: 'Electronics', count: 30 },
      ]);
    });

    it('should return ecosystem analytics', async () => {
      const result = await discoveryService.getEcosystemAnalytics();

      expect(result.overview).toBeDefined();
      expect(result.overview.totalBrands).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.trends.popularIndustries).toBeDefined();
    });

    it('should calculate growth rate', async () => {
      const result = await discoveryService.getEcosystemAnalytics();

      expect(result.trends.growthRate).toBeDefined();
      expect(typeof result.trends.growthRate).toBe('number');
    });

    it('should return popular industries', async () => {
      const result = await discoveryService.getEcosystemAnalytics();

      expect(Array.isArray(result.trends.popularIndustries)).toBe(true);
      expect(result.trends.popularIndustries.length).toBeGreaterThan(0);
    });
  });
});

