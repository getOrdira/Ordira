/**
 * Manufacturer Data Service Unit Tests
 * 
 * Tests manufacturer data operations with caching and optimization.
 */

import { ManufacturerDataService } from '../../../services/manufacturers/core/manufacturerData.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { enhancedCacheService } from '../../../services/external/enhanced-cache.service';
import { queryOptimizationService } from '../../../services/external/query-optimization.service';

// Mock dependencies
const mockEnhancedCacheService = {
  getCachedManufacturerSearch: jest.fn(),
  cacheManufacturerSearch: jest.fn(),
  getCachedManufacturer: jest.fn(),
  cacheManufacturer: jest.fn(),
  invalidateByTags: jest.fn(),
};

const mockQueryOptimizationService = {
  optimizedManufacturerSearch: jest.fn(),
};

// Mock services
jest.mock('../../../services/external/enhanced-cache.service', () => ({
  enhancedCacheService: mockEnhancedCacheService,
}));

jest.mock('../../../services/external/query-optimization.service', () => ({
  queryOptimizationService: mockQueryOptimizationService,
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

describe('ManufacturerDataService', () => {
  let manufacturerDataService: ManufacturerDataService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockManufacturer = {
    _id: 'manufacturer-id-123',
    name: 'Test Manufacturer',
    email: 'test@manufacturer.com',
    industry: 'Technology',
    description: 'Test description',
    servicesOffered: ['Production', 'Assembly'],
    moq: 100,
    isActive: true,
    isEmailVerified: true,
  };

  const mockSearchResult = {
    manufacturers: [mockManufacturer],
    total: 1,
  };

  beforeEach(() => {
    manufacturerDataService = new ManufacturerDataService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
  });

  describe('searchManufacturers', () => {
    const mockSearchParams = {
      query: 'test',
      industry: 'Technology',
      limit: 20,
      offset: 0,
    };

    it('should return cached search results when available', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(mockSearchResult);

      const result = await manufacturerDataService.searchManufacturers(mockSearchParams);

      expect(mockEnhancedCacheService.getCachedManufacturerSearch).toHaveBeenCalledWith(
        mockSearchParams,
        { ttl: 60 }
      );
      expect(mockQueryOptimizationService.optimizedManufacturerSearch).not.toHaveBeenCalled();
      expect(result).toEqual(mockSearchResult);
    });

    it('should fetch from database when cache is not available', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(null);
      mockQueryOptimizationService.optimizedManufacturerSearch.mockResolvedValue(mockSearchResult);

      const result = await manufacturerDataService.searchManufacturers(mockSearchParams);

      expect(mockQueryOptimizationService.optimizedManufacturerSearch).toHaveBeenCalledWith(
        mockSearchParams,
        Manufacturer
      );
      expect(mockEnhancedCacheService.cacheManufacturerSearch).toHaveBeenCalledWith(
        mockSearchParams,
        mockSearchResult,
        { ttl: 60 }
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should handle errors and log them', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(null);
      const error = new Error('Database error');
      mockQueryOptimizationService.optimizedManufacturerSearch.mockRejectedValue(error);

      await expect(
        manufacturerDataService.searchManufacturers(mockSearchParams)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getManufacturerById', () => {
    it('should return cached manufacturer when cache is available', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(mockManufacturer);

      const result = await manufacturerDataService.getManufacturerById('manufacturer-id-123');

      expect(mockEnhancedCacheService.getCachedManufacturer).toHaveBeenCalledWith('manufacturer-id-123');
      expect(Manufacturer.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockManufacturer);
    });

    it('should fetch from database when cache is not available', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      const result = await manufacturerDataService.getManufacturerById('manufacturer-id-123');

      expect(Manufacturer.findById).toHaveBeenCalledWith('manufacturer-id-123');
      expect(mockEnhancedCacheService.cacheManufacturer).toHaveBeenCalledWith(
        'manufacturer-id-123',
        mockManufacturer,
        { ttl: 300 }
      );
      expect(result).toEqual(mockManufacturer);
    });

    it('should return null when manufacturer is not found', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await manufacturerDataService.getManufacturerById('non-existent-id');

      expect(result).toBeNull();
      expect(mockEnhancedCacheService.cacheManufacturer).not.toHaveBeenCalled();
    });

    it('should skip cache when useCache is false', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      const result = await manufacturerDataService.getManufacturerById('manufacturer-id-123', false);

      expect(mockEnhancedCacheService.getCachedManufacturer).not.toHaveBeenCalled();
      expect(Manufacturer.findById).toHaveBeenCalled();
      expect(mockEnhancedCacheService.cacheManufacturer).not.toHaveBeenCalled();
      expect(result).toEqual(mockManufacturer);
    });

    it('should exclude password from result', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      await manufacturerDataService.getManufacturerById('manufacturer-id-123');

      const selectCall = (Manufacturer.findById as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith('-password');
    });
  });

  describe('getManufacturerByEmail', () => {
    const mockEmail = 'test@manufacturer.com';

    it('should return cached manufacturer when cache is available', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(mockManufacturer);

      const result = await manufacturerDataService.getManufacturerByEmail(mockEmail);

      expect(mockEnhancedCacheService.getCachedManufacturer).toHaveBeenCalledWith(`email:${mockEmail}`);
      expect(Manufacturer.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockManufacturer);
    });

    it('should fetch from database when cache is not available', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockManufacturer),
      });

      const result = await manufacturerDataService.getManufacturerByEmail(mockEmail);

      expect(Manufacturer.findOne).toHaveBeenCalledWith({ email: mockEmail });
      expect(mockEnhancedCacheService.cacheManufacturer).toHaveBeenCalledWith(
        `email:${mockEmail}`,
        mockManufacturer,
        { ttl: 300 }
      );
      expect(result).toEqual(mockManufacturer);
    });

    it('should return null when manufacturer is not found', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await manufacturerDataService.getManufacturerByEmail(mockEmail);

      expect(result).toBeNull();
      expect(mockEnhancedCacheService.cacheManufacturer).not.toHaveBeenCalled();
    });

    it('should skip cache when skipCache is true', async () => {
      (Manufacturer.findOne as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockManufacturer),
      });

      const result = await manufacturerDataService.getManufacturerByEmail(mockEmail, true);

      expect(mockEnhancedCacheService.getCachedManufacturer).not.toHaveBeenCalled();
      expect(Manufacturer.findOne).toHaveBeenCalled();
      expect(mockEnhancedCacheService.cacheManufacturer).not.toHaveBeenCalled();
      expect(result).toEqual(mockManufacturer);
    });
  });

  describe('updateManufacturerProfile', () => {
    const mockUpdates = {
      name: 'Updated Manufacturer',
      description: 'Updated description',
    };

    beforeEach(() => {
      (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            ...mockManufacturer,
            ...mockUpdates,
          }),
        }),
      });
    });

    it('should update manufacturer profile successfully', async () => {
      // Mock getManufacturerById for getting current manufacturer
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });

      const result = await manufacturerDataService.updateManufacturerProfile(
        'manufacturer-id-123',
        mockUpdates
      );

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            ...mockUpdates,
            profileScore: expect.any(Number),
            updatedAt: expect.any(Date),
          }),
        }),
        { new: true, runValidators: true }
      );
      expect(result).toBeDefined();
    });

    it('should throw error when manufacturer is not found', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        manufacturerDataService.updateManufacturerProfile('non-existent-id', mockUpdates)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Manufacturer not found',
      });
    });

    it('should calculate profile score based on completeness', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            ...mockManufacturer,
            certifications: [{ name: 'ISO 9001' }],
          }),
        }),
      });

      await manufacturerDataService.updateManufacturerProfile('manufacturer-id-123', mockUpdates);

      const updateCall = (Manufacturer.findByIdAndUpdate as jest.Mock).mock.calls[0];
      const profileScore = updateCall[1].$set.profileScore;
      expect(profileScore).toBeGreaterThan(0);
    });

    it('should invalidate caches after update', async () => {
      mockEnhancedCacheService.getCachedManufacturer.mockResolvedValue(null);
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturer),
        }),
      });
      (Manufacturer.findById as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ email: 'test@manufacturer.com' }),
        }),
      });

      await manufacturerDataService.updateManufacturerProfile('manufacturer-id-123', mockUpdates);

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalled();
    });
  });

  describe('getManufacturersByIndustry', () => {
    it('should return cached manufacturers when available', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue({
        manufacturers: [mockManufacturer],
      });

      const result = await manufacturerDataService.getManufacturersByIndustry('Technology');

      expect(mockEnhancedCacheService.getCachedManufacturerSearch).toHaveBeenCalledWith(
        { industry: 'Technology', limit: 20 },
        expect.any(Object)
      );
      expect(result).toEqual([mockManufacturer]);
    });

    it('should fetch from database when cache is not available', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(null);
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      const result = await manufacturerDataService.getManufacturersByIndustry('Technology');

      expect(Manufacturer.find).toHaveBeenCalledWith({
        industry: 'Technology',
        isActive: { $ne: false },
        isEmailVerified: true,
      });
      expect(result).toEqual([mockManufacturer]);
    });

    it('should sort by profileScore in descending order', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(null);
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      await manufacturerDataService.getManufacturersByIndustry('Technology');

      const sortCall = (Manufacturer.find as jest.Mock).mock.results[0].value.select().sort;
      expect(sortCall).toHaveBeenCalledWith({ profileScore: -1 });
    });

    it('should use custom limit when provided', async () => {
      mockEnhancedCacheService.getCachedManufacturerSearch.mockResolvedValue(null);
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockManufacturer]),
            }),
          }),
        }),
      });

      await manufacturerDataService.getManufacturersByIndustry('Technology', 50);

      const limitCall = (Manufacturer.find as jest.Mock).mock.results[0].value.select().sort().limit;
      expect(limitCall).toHaveBeenCalledWith(50);
    });
  });

  describe('deleteManufacturer', () => {
    beforeEach(() => {
      (Manufacturer.deleteOne as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 1,
      });
    });

    it('should delete manufacturer successfully', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ email: 'test@manufacturer.com' }),
        }),
      });

      await manufacturerDataService.deleteManufacturer('manufacturer-id-123');

      expect(Manufacturer.deleteOne).toHaveBeenCalledWith({ _id: 'manufacturer-id-123' });
      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalled();
    });

    it('should throw error when manufacturer is not found', async () => {
      (Manufacturer.deleteOne as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });

      await expect(
        manufacturerDataService.deleteManufacturer('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Manufacturer not found',
      });
    });

    it('should invalidate caches after deletion', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ email: 'test@manufacturer.com' }),
        }),
      });

      await manufacturerDataService.deleteManufacturer('manufacturer-id-123');

      expect(mockEnhancedCacheService.invalidateByTags).toHaveBeenCalled();
    });
  });

  describe('manufacturerExists', () => {
    it('should return true when manufacturer exists and is active', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          isActive: true,
        }),
      });

      const result = await manufacturerDataService.manufacturerExists('manufacturer-id-123');

      expect(result).toBe(true);
    });

    it('should return false when manufacturer does not exist', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const result = await manufacturerDataService.manufacturerExists('non-existent-id');

      expect(result).toBe(false);
    });

    it('should return false when manufacturer is inactive', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          isActive: false,
        }),
      });

      const result = await manufacturerDataService.manufacturerExists('manufacturer-id-123');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await manufacturerDataService.manufacturerExists('manufacturer-id-123');

      expect(result).toBe(false);
    });
  });

  describe('getManufacturerBasicInfo', () => {
    const mockBasicInfo = {
      name: 'Test Manufacturer',
      industry: 'Technology',
      profilePictureUrl: 'https://example.com/avatar.jpg',
      isVerified: true,
    };

    it('should return basic manufacturer info', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBasicInfo),
        }),
      });

      const result = await manufacturerDataService.getManufacturerBasicInfo('manufacturer-id-123');

      expect(Manufacturer.findById).toHaveBeenCalledWith('manufacturer-id-123');
      expect(result).toEqual(mockBasicInfo);
    });

    it('should return null when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await manufacturerDataService.getManufacturerBasicInfo('non-existent-id');

      expect(result).toBeNull();
    });

    it('should select only required fields', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBasicInfo),
        }),
      });

      await manufacturerDataService.getManufacturerBasicInfo('manufacturer-id-123');

      const selectCall = (Manufacturer.findById as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith('name industry profilePictureUrl isVerified');
    });
  });

  describe('getManufacturersByIds', () => {
    const mockManufacturerIds = ['id-1', 'id-2', 'id-3'];
    const mockManufacturers = [mockManufacturer, { ...mockManufacturer, _id: 'id-2' }];

    it('should return manufacturers by IDs', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturers),
        }),
      });

      const result = await manufacturerDataService.getManufacturersByIds(mockManufacturerIds);

      expect(Manufacturer.find).toHaveBeenCalledWith({
        _id: { $in: mockManufacturerIds },
        isActive: { $ne: false },
      });
      expect(result).toEqual(mockManufacturers);
    });

    it('should filter out inactive manufacturers', async () => {
      (Manufacturer.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockManufacturers),
        }),
      });

      await manufacturerDataService.getManufacturersByIds(mockManufacturerIds);

      expect(Manufacturer.find).toHaveBeenCalledWith({
        _id: { $in: mockManufacturerIds },
        isActive: { $ne: false },
      });
    });
  });

  describe('getManufacturerCount', () => {
    it('should return manufacturer count with default criteria', async () => {
      (Manufacturer.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(100);

      const result = await manufacturerDataService.getManufacturerCount();

      expect(Manufacturer.countDocuments).toHaveBeenCalledWith({
        isActive: { $ne: false },
      });
      expect(result).toBe(100);
    });

    it('should merge custom criteria with default criteria', async () => {
      (Manufacturer.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(50);

      const result = await manufacturerDataService.getManufacturerCount({
        industry: 'Technology',
      });

      expect(Manufacturer.countDocuments).toHaveBeenCalledWith({
        isActive: { $ne: false },
        industry: 'Technology',
      });
      expect(result).toBe(50);
    });
  });
});

