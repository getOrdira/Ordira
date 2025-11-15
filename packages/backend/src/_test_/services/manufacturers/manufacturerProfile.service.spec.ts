/**
 * Manufacturer Profile Service Unit Tests
 * 
 * Tests manufacturer profile operations: search, get profile, get context.
 */

import { ManufacturerProfileService, SearchOptions } from '../../../services/manufacturers/core/manufacturerProfile.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';

// Mock models
jest.mock('../../../models/manufacturer/manufacturer.model');
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

describe('ManufacturerProfileService', () => {
  let manufacturerProfileService: ManufacturerProfileService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockManufacturer = {
    _id: 'manufacturer-id-123',
    name: 'Test Manufacturer',
    industry: 'Technology',
    description: 'Test description',
    servicesOffered: ['Production', 'Assembly'],
    moq: 100,
    profilePictureUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
    isEmailVerified: true,
    isActive: true,
    profileScore: 85,
    totalConnections: 5,
    activityMetrics: {
      profileCompleteness: 80,
    },
    connectionRequests: {
      sent: 10,
      received: 8,
      approved: 5,
    },
    averageResponseTime: 12,
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    manufacturerProfileService = new ManufacturerProfileService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
    
    (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      }),
    });

    (Manufacturer.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
    
    (Manufacturer.distinct as jest.Mock) = jest.fn().mockResolvedValue(['Technology', 'Electronics']);
    
    (Manufacturer.aggregate as jest.Mock) = jest.fn().mockResolvedValue([
      { _id: 'Production' },
      { _id: 'Assembly' },
    ]);
  });

  describe('searchManufacturers', () => {
    it('should search manufacturers with query', async () => {
      const params = {
        query: 'test',
        limit: 20,
        offset: 0,
      };

      const result = await manufacturerProfileService.searchManufacturers(params);

      expect(Manufacturer.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
      expect(result.manufacturers).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should filter by industry', async () => {
      const params = {
        industry: 'Technology',
        limit: 20,
        offset: 0,
      };

      await manufacturerProfileService.searchManufacturers(params);

      expect(Manufacturer.find).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: expect.any(Object),
        })
      );
    });

    it('should filter by services', async () => {
      const params = {
        services: ['Production'],
        limit: 20,
        offset: 0,
      };

      await manufacturerProfileService.searchManufacturers(params);

      expect(Manufacturer.find).toHaveBeenCalledWith(
        expect.objectContaining({
          servicesOffered: expect.any(Object),
        })
      );
    });

    it('should filter by MOQ range', async () => {
      const params = {
        minMoq: 50,
        maxMoq: 200,
        limit: 20,
        offset: 0,
      };

      await manufacturerProfileService.searchManufacturers(params);

      expect(Manufacturer.find).toHaveBeenCalledWith(
        expect.objectContaining({
          moq: expect.objectContaining({
            $gte: 50,
            $lte: 200,
          }),
        })
      );
    });

    it('should sort by profileCompleteness when specified', async () => {
      const params = {
        sortBy: 'profileCompleteness',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      };

      await manufacturerProfileService.searchManufacturers({
        sortBy: 'profileCompleteness',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      } as SearchOptions);

      const sortCall = (Manufacturer.find as jest.Mock).mock.results[0].value.select().sort;
      expect(sortCall).toHaveBeenCalledWith({
        'activityMetrics.profileCompleteness': -1,
      });
    });

    it('should apply pagination', async () => {
      const params = {
        limit: 10,
        offset: 5,
      };

      await manufacturerProfileService.searchManufacturers(params);

      const skipCall = (Manufacturer.find as jest.Mock).mock.results[0].value
        .select().sort().skip;
      expect(skipCall).toHaveBeenCalledWith(5);
      
      const limitCall = skipCall().limit;
      expect(limitCall).toHaveBeenCalledWith(10);
    });

    it('should return aggregations', async () => {
      const params = {
        limit: 20,
        offset: 0,
      };

      (Manufacturer.aggregate as jest.Mock).mockResolvedValue([
        {
          _id: null,
          industries: ['Technology'],
          services: [['Production']],
          averageScore: 85,
          verifiedCount: 1,
        },
      ]);

      const result = await manufacturerProfileService.searchManufacturers(params);

      expect(result.aggregations).toBeDefined();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      (Manufacturer.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(error),
              }),
            }),
          }),
        }),
      });

      const params = {
        limit: 20,
        offset: 0,
      };

      await expect(
        manufacturerProfileService.searchManufacturers(params)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getManufacturerProfile', () => {
    it('should return manufacturer profile by id', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      const result = await manufacturerProfileService.getManufacturerProfile('manufacturer-id-123');

      expect(Manufacturer.findById).toHaveBeenCalledWith('manufacturer-id-123');
      expect(result).toBeDefined();
      expect(result?.id).toBe('manufacturer-id-123');
    });

    it('should return null when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await manufacturerProfileService.getManufacturerProfile('non-existent-id');

      expect(result).toBeNull();
    });

    it('should exclude sensitive fields from profile', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      await manufacturerProfileService.getManufacturerProfile('manufacturer-id-123');

      const selectCall = (Manufacturer.findById as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith(
        '-password -loginAttempts -lockUntil -passwordResetToken -twoFactorSecret'
      );
    });
  });

  describe('getProfileContext', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'manufacturer-id-123',
        brands: [],
        profileViews: 100,
        connectionRequests: {
          received: 10,
        },
        averageResponseTime: 12,
        lastLoginAt: new Date(),
        isEmailVerified: true,
        isActive: true,
        activityMetrics: {
          profileCompleteness: 80,
        },
      });
    });

    it('should return profile context without brand', async () => {
      const result = await manufacturerProfileService.getProfileContext('manufacturer-id-123');

      expect(result.connectionStatus).toBe('none');
      expect(result.canConnect).toBe(true);
      expect(result.analytics).toBeDefined();
    });

    it('should return connected status when brand is connected', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'brand-settings-id',
        business: 'brand-id',
        updatedAt: new Date(),
      });

      (Manufacturer.findById as jest.Mock).mockResolvedValue({
        _id: 'manufacturer-id-123',
        brands: ['brand-settings-id'],
        profileViews: 100,
        connectionRequests: {
          received: 10,
        },
        averageResponseTime: 12,
        lastLoginAt: new Date(),
        isEmailVerified: true,
        isActive: true,
        activityMetrics: {
          profileCompleteness: 80,
        },
      });

      const result = await manufacturerProfileService.getProfileContext(
        'manufacturer-id-123',
        'brand-id'
      );

      expect(result.connectionStatus).toBe('connected');
      expect(result.canConnect).toBe(false);
    });

    it('should throw error when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        manufacturerProfileService.getProfileContext('non-existent-id')
      ).rejects.toThrow('Manufacturer not found');
    });

    it('should calculate response rate in analytics', async () => {
      const result = await manufacturerProfileService.getProfileContext('manufacturer-id-123');

      expect(result.analytics?.responseRate).toBeDefined();
      expect(typeof result.analytics?.responseRate).toBe('number');
    });
  });

  describe('getManufacturersByIndustry', () => {
    it('should return manufacturers by industry', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockManufacturer]),
          }),
        }),
      });

      const result = await manufacturerProfileService.getManufacturersByIndustry('Technology');

      expect(Manufacturer.find).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: expect.any(Object),
        })
      );
      expect(result.manufacturers).toBeDefined();
      expect(result.averageCompleteness).toBeDefined();
      expect(result.topServices).toBeDefined();
    });

    it('should calculate average completeness', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockManufacturer]),
          }),
        }),
      });

      const result = await manufacturerProfileService.getManufacturersByIndustry('Technology');

      expect(result.averageCompleteness).toBeGreaterThanOrEqual(0);
      expect(result.averageCompleteness).toBeLessThanOrEqual(100);
    });

    it('should return top services', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { ...mockManufacturer, servicesOffered: ['Production', 'Assembly'] },
              { ...mockManufacturer, servicesOffered: ['Production', 'Testing'] },
            ]),
          }),
        }),
      });

      const result = await manufacturerProfileService.getManufacturersByIndustry('Technology');

      expect(result.topServices).toBeDefined();
      expect(Array.isArray(result.topServices)).toBe(true);
    });
  });

  describe('getAvailableIndustries', () => {
    it('should return list of available industries', async () => {
      const result = await manufacturerProfileService.getAvailableIndustries();

      expect(Manufacturer.distinct).toHaveBeenCalledWith('industry', expect.any(Object));
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('Technology');
    });

    it('should filter out empty industries', async () => {
      (Manufacturer.distinct as jest.Mock).mockResolvedValue(['Technology', '', '   ', null]);

      const result = await manufacturerProfileService.getAvailableIndustries();

      expect(result.every(industry => industry && industry.trim() !== '')).toBe(true);
    });
  });

  describe('getAvailableServices', () => {
    it('should return list of available services', async () => {
      const result = await manufacturerProfileService.getAvailableServices();

      expect(Manufacturer.aggregate).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter out empty services', async () => {
      (Manufacturer.aggregate as jest.Mock).mockResolvedValue([
        { _id: 'Production' },
        { _id: '' },
        { _id: null },
      ]);

      const result = await manufacturerProfileService.getAvailableServices();

      expect(result.every(service => service)).toBe(true);
    });
  });

  describe('listManufacturerProfiles', () => {
    it('should return list of manufacturer profiles', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      const result = await manufacturerProfileService.listManufacturerProfiles();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should limit results to 50', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      await manufacturerProfileService.listManufacturerProfiles();

      const limitCall = (Manufacturer.find as jest.Mock).mock.results[0].value
        .select().sort().limit;
      expect(limitCall).toHaveBeenCalledWith(50);
    });

    it('should only return active and verified manufacturers', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      await manufacturerProfileService.listManufacturerProfiles();

      expect(Manufacturer.find).toHaveBeenCalledWith({
        isActive: { $ne: false },
        isEmailVerified: true,
      });
    });
  });
});

