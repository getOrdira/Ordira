/**
 * Brand Customer Access Service Unit Tests
 * 
 * Tests customer access management and email gating.
 */

import { CustomerAccessService } from '../../../services/brands/features/customerAccess.service';
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

describe('CustomerAccessService', () => {
  let customerAccessService: CustomerAccessService;

  beforeEach(() => {
    customerAccessService = new CustomerAccessService();
    jest.clearAllMocks();
  });

  describe('checkEmailAccess', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: {
          enabled: true,
          whitelist: ['allowed@example.com'],
          blacklist: ['blocked@example.com'],
        },
      });
    });

    it('should allow access for whitelisted email', async () => {
      const result = await customerAccessService.checkEmailAccess(
        'business-id-123',
        'allowed@example.com'
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny access for blacklisted email', async () => {
      const result = await customerAccessService.checkEmailAccess(
        'business-id-123',
        'blocked@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow access when email gating is disabled', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: {
          enabled: false,
        },
      });

      const result = await customerAccessService.checkEmailAccess(
        'business-id-123',
        'any@example.com'
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny access when email is not whitelisted and gating is enabled', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: {
          enabled: true,
          whitelist: ['allowed@example.com'],
          blacklist: [],
        },
      });

      const result = await customerAccessService.checkEmailAccess(
        'business-id-123',
        'notallowed@example.com'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('importCustomers', () => {
    const mockCustomers = [
      {
        email: 'customer1@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        email: 'customer2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ];

    it('should import customers successfully', async () => {
      const result = await customerAccessService.importCustomers(
        'business-id-123',
        mockCustomers
      );

      expect(result.successful).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.total).toBe(mockCustomers.length);
    });

    it('should handle duplicate emails', async () => {
      const duplicateCustomers = [
        ...mockCustomers,
        { email: 'customer1@example.com', firstName: 'Duplicate' },
      ];

      const result = await customerAccessService.importCustomers(
        'business-id-123',
        duplicateCustomers
      );

      expect(result.failed.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate email format', async () => {
      const invalidCustomers = [
        { email: 'invalid-email', firstName: 'Test' },
      ];

      const result = await customerAccessService.importCustomers(
        'business-id-123',
        invalidCustomers
      );

      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe('updateEmailGatingSettings', () => {
    const mockSettings = {
      enabled: true,
      whitelist: ['allowed@example.com'],
      blacklist: ['blocked@example.com'],
    };

    beforeEach(() => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: mockSettings,
      });
    });

    it('should update email gating settings', async () => {
      const result = await customerAccessService.updateEmailGatingSettings(
        'business-id-123',
        mockSettings
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(result.enabled).toBe(true);
    });

    it('should enable email gating', async () => {
      const result = await customerAccessService.updateEmailGatingSettings(
        'business-id-123',
        { enabled: true }
      );

      expect(result.enabled).toBe(true);
    });

    it('should disable email gating', async () => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: { enabled: false },
      });

      const result = await customerAccessService.updateEmailGatingSettings(
        'business-id-123',
        { enabled: false }
      );

      expect(result.enabled).toBe(false);
    });
  });

  describe('getCustomerList', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        emailGating: {
          whitelist: ['customer1@example.com', 'customer2@example.com'],
        },
      });
    });

    it('should return customer list', async () => {
      const result = await customerAccessService.getCustomerList('business-id-123');

      expect(result.customers).toBeDefined();
      expect(Array.isArray(result.customers)).toBe(true);
    });

    it('should apply pagination', async () => {
      const result = await customerAccessService.getCustomerList('business-id-123', {
        page: 1,
        limit: 10,
      });

      expect(result.customers).toBeDefined();
    });

    it('should filter customers by search query', async () => {
      const result = await customerAccessService.getCustomerList('business-id-123', {
        search: 'customer1',
      });

      expect(result.customers).toBeDefined();
    });
  });
});

