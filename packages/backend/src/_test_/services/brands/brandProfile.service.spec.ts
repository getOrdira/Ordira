/**
 * Brand Profile Service Unit Tests
 * 
 * Tests brand profile operations.
 */

import { BrandProfileCoreService } from '../../../services/brands/core/brandProfile.service';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { Business } from '../../../models/deprecated/business.model';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { connectionDataService } from '../../../services/connections/core/connectionData.service';
import { matchingEngineService } from '../../../services/connections/utils/matchingEngine.service';
import { recommendationsService } from '../../../services/connections/features/recommendations.service';

// Mock dependencies
const mockConnectionDataService = {
  getConnections: jest.fn(),
};

const mockMatchingEngineService = {
  findMatches: jest.fn(),
};

const mockRecommendationsService = {
  getRecommendations: jest.fn(),
};

// Mock services
jest.mock('../../../services/connections/core/connectionData.service', () => ({
  connectionDataService: mockConnectionDataService,
}));

jest.mock('../../../services/connections/utils/matchingEngine.service', () => ({
  matchingEngineService: mockMatchingEngineService,
}));

jest.mock('../../../services/connections/features/recommendations.service', () => ({
  recommendationsService: mockRecommendationsService,
}));

// Mock models
jest.mock('../../../models/brands/brandSettings.model');
jest.mock('../../../models/deprecated/business.model');
jest.mock('../../../models/infrastructure/invitation.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('BrandProfileCoreService', () => {
  let brandProfileService: BrandProfileCoreService;

  const mockBrandSettings = {
    _id: 'settings-id-123',
    business: {
      _id: 'business-id-123',
      businessName: 'Test Brand',
    },
    subdomain: 'test-brand',
    customDomain: 'testbrand.com',
    isActive: true,
    themeColor: '#FF0000',
    logoUrl: 'https://example.com/logo.jpg',
  };

  beforeEach(() => {
    brandProfileService = new BrandProfileCoreService();
    jest.clearAllMocks();
  });

  describe('listBrandProfiles', () => {
    it('should return list of brand profiles', async () => {
      (BrandSettings.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockBrandSettings]),
        }),
      });

      const result = await brandProfileService.listBrandProfiles();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('businessName');
    });

    it('should filter out inactive brands', async () => {
      (BrandSettings.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { ...mockBrandSettings, isActive: true },
            { ...mockBrandSettings, isActive: false },
          ]),
        }),
      });

      const result = await brandProfileService.listBrandProfiles();

      expect(BrandSettings.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should return empty array when no brands found', async () => {
      (BrandSettings.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await brandProfileService.listBrandProfiles();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (BrandSettings.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await brandProfileService.listBrandProfiles();

      expect(result).toEqual([]);
    });
  });

  describe('getBrandProfile', () => {
    it('should return brand profile by ID', async () => {
      (BrandSettings.findById as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrandSettings),
        }),
      });

      const result = await brandProfileService.getBrandProfile('settings-id-123');

      expect(result.id).toBe('settings-id-123');
      expect(result.businessName).toBe('Test Brand');
    });

    it('should throw error when brand is not found', async () => {
      (BrandSettings.findById as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        brandProfileService.getBrandProfile('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Brand not found.',
      });
    });
  });

  describe('getBrandProfileBySubdomain', () => {
    it('should return brand profile by subdomain', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrandSettings),
        }),
      });

      const result = await brandProfileService.getBrandProfileBySubdomain('test-brand');

      expect(result).toBeDefined();
      expect(result?.subdomain).toBe('test-brand');
    });

    it('should return null when subdomain not found', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await brandProfileService.getBrandProfileBySubdomain('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getBrandProfileByCustomDomain', () => {
    it('should return brand profile by custom domain', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrandSettings),
        }),
      });

      const result = await brandProfileService.getBrandProfileByCustomDomain('testbrand.com');

      expect(result).toBeDefined();
      expect(result?.customDomain).toBe('testbrand.com');
    });

    it('should return null when custom domain not found', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await brandProfileService.getBrandProfileByCustomDomain('nonexistent.com');

      expect(result).toBeNull();
    });
  });

  describe('searchBrandProfiles', () => {
    beforeEach(() => {
      (Business.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: 'business-id-123', businessName: 'Test Brand' },
          ]),
        }),
      });
      (BrandSettings.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockBrandSettings]),
        }),
      });
    });

    it('should search brand profiles by query', async () => {
      const result = await brandProfileService.searchBrandProfiles('Test');

      expect(Business.find).toHaveBeenCalledWith({
        businessName: expect.any(Object),
        isActive: true,
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      (Business.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await brandProfileService.searchBrandProfiles('Nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getBrandAnalytics', () => {
    beforeEach(() => {
      (BrandSettings.findById as jest.Mock) = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBrandSettings),
      });
      mockConnectionDataService.getConnections.mockResolvedValue({
        total: 10,
        active: 5,
      });
      (Invitation.countDocuments as jest.Mock) = jest.fn()
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);
    });

    it('should return brand analytics', async () => {
      const result = await brandProfileService.getBrandAnalytics('settings-id-123');

      expect(result).toBeDefined();
      expect(result.profileViews).toBeDefined();
      expect(result.connectionCount).toBeDefined();
      expect(result.totalInvitationsSent).toBeDefined();
    });

    it('should calculate acceptance rate', async () => {
      const result = await brandProfileService.getBrandAnalytics('settings-id-123');

      expect(result.acceptanceRate).toBeDefined();
      expect(result.acceptanceRate).toBeGreaterThanOrEqual(0);
      expect(result.acceptanceRate).toBeLessThanOrEqual(100);
    });
  });
});

