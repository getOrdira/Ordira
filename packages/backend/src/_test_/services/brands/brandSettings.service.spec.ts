/**
 * Brand Settings Service Unit Tests
 * 
 * Tests brand settings management operations.
 */

import { BrandSettingsCoreService } from '../../../services/brands/core/brandSettings.service';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import * as certificateManager from '../../../services/external/certificateManager';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('../../../services/external/certificateManager', () => ({
  // Add methods as needed
}));

// Mock models
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

describe('BrandSettingsCoreService', () => {
  let brandSettingsService: BrandSettingsCoreService;

  const mockBrandSettings = {
    _id: 'settings-id-123',
    business: 'business-id-123',
    subdomain: 'test-brand',
    customDomain: 'testbrand.com',
    isActive: true,
    themeColor: '#FF0000',
    logoUrl: 'https://example.com/logo.jpg',
    updatedAt: new Date(),
    plan: 'premium',
  };

  beforeEach(() => {
    brandSettingsService = new BrandSettingsCoreService();
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return brand settings for business', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);

      const result = await brandSettingsService.getSettings('business-id-123');

      expect(BrandSettings.findOne).toHaveBeenCalledWith({ business: 'business-id-123' });
      expect(result).toEqual(mockBrandSettings);
    });

    it('should create settings when they do not exist', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (BrandSettings.create as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);

      const result = await brandSettingsService.getSettings('business-id-123');

      expect(BrandSettings.create).toHaveBeenCalledWith({ business: 'business-id-123' });
      expect(result).toEqual(mockBrandSettings);
    });

    it('should throw error when business ID is invalid', async () => {
      await expect(
        brandSettingsService.getSettings('')
      ).rejects.toThrow('Invalid business ID provided');
    });
  });

  describe('getEnhancedSettings', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBrandSettings);
    });

    it('should return enhanced settings with metadata', async () => {
      const result = await brandSettingsService.getEnhancedSettings('business-id-123');

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('lastUpdatedBy');
      expect(result).toHaveProperty('updateSource');
    });
  });

  describe('getIntegrationStatus', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        shopifyDomain: 'test-shop.myshopify.com',
        wooDomain: 'test-woo.com',
        wixDomain: 'test-wix.com',
      });
    });

    it('should return integration status', async () => {
      const result = await brandSettingsService.getIntegrationStatus('business-id-123');

      expect(result.shopify).toBe(true);
      expect(result.woocommerce).toBe(true);
      expect(result.wix).toBe(true);
      expect(result.lastSync).toBeDefined();
    });

    it('should return false for unconfigured integrations', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        shopifyDomain: null,
        wooDomain: null,
        wixDomain: null,
      });

      const result = await brandSettingsService.getIntegrationStatus('business-id-123');

      expect(result.shopify).toBe(false);
      expect(result.woocommerce).toBe(false);
      expect(result.wix).toBe(false);
    });
  });

  describe('getDomainStatus', () => {
    beforeEach(() => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        subdomain: 'test-brand',
        customDomain: 'testbrand.com',
      });
    });

    it('should return domain status', async () => {
      const result = await brandSettingsService.getDomainStatus('business-id-123');

      expect(result.subdomain).toBeDefined();
      expect(result.subdomain.configured).toBe(true);
      expect(result.customDomain).toBeDefined();
      expect(result.customDomain.configured).toBe(true);
    });

    it('should return unconfigured status when domains are not set', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        subdomain: null,
        customDomain: null,
      });

      const result = await brandSettingsService.getDomainStatus('business-id-123');

      expect(result.subdomain.configured).toBe(false);
      expect(result.customDomain.configured).toBe(false);
    });
  });

  describe('updateBrandSettings', () => {
    const mockUpdateData = {
      customDomain: 'updated-brand.com',
      themeColor: '#00FF00',
    };

    beforeEach(() => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        ...mockBrandSettings,
        ...mockUpdateData,
      });
    });

    it('should update brand settings successfully', async () => {
      const result = await brandSettingsService.updateBrandSettings(
        'business-id-123',
        mockUpdateData
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(result.customDomain).toBe('updated-brand.com');
    });

    it('should handle null custom domain', async () => {
      const updateData = {
        customDomain: null,
      };

      const result = await brandSettingsService.updateBrandSettings(
        'business-id-123',
        updateData
      );

      expect(result).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection for Shopify integration', async () => {
      const shopifyData = {
        shopifyDomain: 'test-shop.myshopify.com',
        shopifyAccessToken: 'token-123',
      };

      const result = await brandSettingsService.testConnection(
        'business-id-123',
        'shopify',
        shopifyData
      );

      expect(result.success).toBeDefined();
    });

    it('should return error when connection test fails', async () => {
      const invalidData = {
        shopifyDomain: '',
        shopifyAccessToken: '',
      };

      const result = await brandSettingsService.testConnection(
        'business-id-123',
        'shopify',
        invalidData
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

