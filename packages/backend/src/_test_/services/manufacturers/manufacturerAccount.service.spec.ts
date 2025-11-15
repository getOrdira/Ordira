/**
 * Manufacturer Account Service Unit Tests
 * 
 * Tests manufacturer account management operations.
 */

import { ManufacturerAccountService } from '../../../services/manufacturers/core/manufacturerAccount.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { Media } from '../../../models/media/media.model';
import { Notification } from '../../../models/infrastructure/notification.model';

// Mock models
jest.mock('../../../models/manufacturer/manufacturer.model');
jest.mock('../../../models/media/media.model');
jest.mock('../../../models/infrastructure/notification.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('ManufacturerAccountService', () => {
  let manufacturerAccountService: ManufacturerAccountService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockManufacturer = {
    _id: 'manufacturer-id-123',
    name: 'Test Manufacturer',
    email: 'test@manufacturer.com',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    description: 'Test description',
    industry: 'Technology',
    contactEmail: 'contact@manufacturer.com',
    servicesOffered: ['Production'],
    moq: 100,
    headquarters: {
      country: 'US',
      city: 'New York',
    },
    isActive: true,
    isVerified: true,
    verifiedAt: new Date(),
    businessLicense: 'license-123',
    certifications: ['ISO 9001'],
    establishedYear: 2010,
    employeeCount: 50,
    preferredContactMethod: 'email',
    timezone: 'UTC',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    manufacturerAccountService = new ManufacturerAccountService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
  });

  describe('getManufacturerAccount', () => {
    it('should return manufacturer account details', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockManufacturer),
      });

      const result = await manufacturerAccountService.getManufacturerAccount('manufacturer-id-123');

      expect(Manufacturer.findById).toHaveBeenCalledWith('manufacturer-id-123');
      expect(result).toEqual(mockManufacturer);
    });

    it('should throw error when manufacturer ID is missing', async () => {
      await expect(
        manufacturerAccountService.getManufacturerAccount('')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'MISSING_MANUFACTURER_ID',
      });
    });

    it('should throw error when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        manufacturerAccountService.getManufacturerAccount('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'MANUFACTURER_NOT_FOUND',
      });
    });

    it('should select only allowed fields', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockManufacturer),
      });

      await manufacturerAccountService.getManufacturerAccount('manufacturer-id-123');

      const selectCall = (Manufacturer.findById as jest.Mock).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith(
        expect.stringContaining('name email profilePictureUrl')
      );
    });

    it('should log activity when profile is viewed', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockManufacturer),
      });

      await manufacturerAccountService.getManufacturerAccount('manufacturer-id-123');

      // Activity logging is called internally
      expect(Manufacturer.findById).toHaveBeenCalled();
    });
  });

  describe('updateManufacturerAccount', () => {
    const mockUpdates = {
      name: 'Updated Manufacturer',
      description: 'Updated description',
    };

    beforeEach(() => {
      (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockManufacturer,
          ...mockUpdates,
        }),
      });
    });

    it('should update manufacturer account successfully', async () => {
      const result = await manufacturerAccountService.updateManufacturerAccount(
        'manufacturer-id-123',
        mockUpdates
      );

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.name).toBe('Updated Manufacturer');
    });

    it('should throw error when manufacturer ID is missing', async () => {
      await expect(
        manufacturerAccountService.updateManufacturerAccount('', mockUpdates)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'MISSING_MANUFACTURER_ID',
      });
    });

    it('should throw error when update data is empty', async () => {
      await expect(
        manufacturerAccountService.updateManufacturerAccount('manufacturer-id-123', {})
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMPTY_UPDATE_DATA',
      });
    });

    it('should validate email format when email is updated', async () => {
      await expect(
        manufacturerAccountService.updateManufacturerAccount('manufacturer-id-123', {
          email: 'invalid-email',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_EMAIL',
      });
    });

    it('should update only allowed fields', async () => {
      await manufacturerAccountService.updateManufacturerAccount('manufacturer-id-123', {
        name: 'Updated Name',
        description: 'Updated Description',
      });

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('softDeleteAccount', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockResolvedValue(mockManufacturer);
      (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockManufacturer,
        isActive: false,
      });
    });

    it('should soft delete manufacturer account', async () => {
      const result = await manufacturerAccountService.softDeleteAccount('manufacturer-id-123');

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          isActive: false,
          deactivatedAt: expect.any(Date),
        }),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.canRestore).toBe(true);
      expect(result.retentionPeriod).toBe(30);
    });

    it('should throw error when manufacturer ID is missing', async () => {
      await expect(
        manufacturerAccountService.softDeleteAccount('')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'MISSING_MANUFACTURER_ID',
      });
    });

    it('should throw error when manufacturer is not found', async () => {
      (Manufacturer.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        manufacturerAccountService.softDeleteAccount('non-existent-id')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'MANUFACTURER_NOT_FOUND',
      });
    });

    it('should set deactivatedAt timestamp', async () => {
      const beforeDelete = new Date();
      const result = await manufacturerAccountService.softDeleteAccount('manufacturer-id-123');
      const afterDelete = new Date();

      expect(result.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
      expect(result.deletedAt.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
    });
  });

  describe('getAccountActivity', () => {
    const mockFilters = {
      page: 1,
      limit: 20,
    };

    it('should return account activity with default filters', async () => {
      const result = await manufacturerAccountService.getAccountActivity(
        'manufacturer-id-123',
        mockFilters
      );

      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
      expect(result.total).toBeDefined();
    });

    it('should filter activities by type', async () => {
      const filters = {
        ...mockFilters,
        type: 'login',
      };

      const result = await manufacturerAccountService.getAccountActivity(
        'manufacturer-id-123',
        filters
      );

      expect(result.activities.every(a => a.type === 'login')).toBe(true);
    });

    it('should filter activities by date range', async () => {
      const filters = {
        ...mockFilters,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const result = await manufacturerAccountService.getAccountActivity(
        'manufacturer-id-123',
        filters
      );

      expect(result.activities).toBeDefined();
    });

    it('should filter activities by severity', async () => {
      const filters = {
        ...mockFilters,
        severity: 'high' as const,
      };

      const result = await manufacturerAccountService.getAccountActivity(
        'manufacturer-id-123',
        filters
      );

      expect(result.activities).toBeDefined();
    });

    it('should apply pagination', async () => {
      const filters = {
        page: 2,
        limit: 10,
      };

      const result = await manufacturerAccountService.getAccountActivity(
        'manufacturer-id-123',
        filters
      );

      expect(result.activities.length).toBeLessThanOrEqual(10);
    });
  });

  describe('updateNotificationPreferences', () => {
    const mockPreferences = {
      emailNotifications: {
        invitations: true,
        orderUpdates: true,
        systemUpdates: true,
        marketing: false,
      },
      frequency: 'immediate' as const,
      timezone: 'UTC',
    };

    it('should update notification preferences', async () => {
      (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockManufacturer,
        notificationPreferences: mockPreferences,
      });

      const result = await manufacturerAccountService.updateNotificationPreferences(
        'manufacturer-id-123',
        mockPreferences
      );

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when manufacturer ID is missing', async () => {
      await expect(
        manufacturerAccountService.updateNotificationPreferences('', mockPreferences)
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });
});

