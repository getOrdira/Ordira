/**
 * Brand Settings Controller Unit Tests
 * 
 * Tests brand settings operations: get, update, test integrations, validate domain/wallet, export/import.
 */

import { Response, NextFunction } from 'express';
import { BrandSettingsController } from '../../../../controllers/features/brands/brandSettings.controller';
import { BrandServices } from '../../../../services/brands';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
}));

// Mock brand services
jest.mock('../../../../services/brands', () => ({
  BrandServices: {
    settings: {
      getSettings: jest.fn(),
      updateEnhancedSettings: jest.fn(),
      testShopifyConnection: jest.fn(),
      validateCustomDomain: jest.fn(),
      verifyWalletOwnership: jest.fn(),
      exportSettings: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('BrandSettingsController', () => {
  let brandSettingsController: BrandSettingsController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    brandSettingsController = new BrandSettingsController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandSettingsController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandSettingsController as any).recordPerformance = jest.fn();
    (brandSettingsController as any).logAction = jest.fn();
    (brandSettingsController as any).sanitizeInput = jest.fn((data: any) => data);
    (brandSettingsController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandSettingsController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getSettings', () => {
    const mockSettings = {
      themeColor: '#FF0000',
      logoUrl: 'https://example.com/logo.png',
      subdomain: 'test-brand',
    };

    beforeEach(() => {
      (BrandServices.settings.getSettings as jest.Mock).mockResolvedValue(mockSettings);
    });

    it('should retrieve brand settings', async () => {
      await brandSettingsController.getSettings(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.getSettings).toHaveBeenCalledWith('business-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.settings).toEqual(mockSettings);
    });

    it('should require business user authentication', async () => {
      (brandSettingsController as any).validateBusinessUser.mockImplementation(
        (req: any, res: any, callback: any) => {
          res.status(403).json({ success: false, message: 'Forbidden' });
        }
      );
      mockRequest.userType = 'customer';

      await brandSettingsController.getSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateSettings', () => {
    const updateData = {
      themeColor: '#00FF00',
      logoUrl: 'https://example.com/new-logo.png',
      subdomain: 'updated-brand',
    };

    const updatedSettings = {
      ...updateData,
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (BrandServices.settings.updateEnhancedSettings as jest.Mock).mockResolvedValue(
        updatedSettings
      );
    });

    it('should update brand settings successfully', async () => {
      mockRequest.validatedBody = updateData;

      await brandSettingsController.updateSettings(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.updateEnhancedSettings).toHaveBeenCalledWith(
        'business-id-123',
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle complex nested settings', async () => {
      mockRequest.validatedBody = {
        shopifyIntegration: {
          shopifyDomain: 'test.myshopify.com',
          shopifyAccessToken: 'token-123',
          syncProducts: true,
        },
        emailNotifications: {
          newConnections: true,
          productUpdates: false,
        },
        privacySettings: {
          profileVisibility: 'public',
          showContactInfo: true,
        },
      };

      await brandSettingsController.updateSettings(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.updateEnhancedSettings).toHaveBeenCalled();
    });
  });

  describe('testIntegration', () => {
    const mockTestResult = {
      success: true,
      latency: 150,
      message: 'Integration test successful',
    };

    beforeEach(() => {
      (BrandServices.settings.testShopifyConnection as jest.Mock).mockResolvedValue(mockTestResult);
    });

    it('should test Shopify integration', async () => {
      mockRequest.validatedBody = {
        integrationType: 'shopify',
        credentials: {
          domain: 'test.myshopify.com',
          accessToken: 'token-123',
        },
      };

      await brandSettingsController.testIntegration(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.testShopifyConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          shopifyDomain: 'test.myshopify.com',
          shopifyAccessToken: 'token-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle non-Shopify integrations with placeholder', async () => {
      mockRequest.validatedBody = {
        integrationType: 'woocommerce',
        credentials: {
          domain: 'test.com',
          consumerKey: 'key-123',
          consumerSecret: 'secret-123',
        },
      };

      await brandSettingsController.testIntegration(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('validateDomain', () => {
    const mockValidation = {
      valid: true,
      domain: 'example.com',
      message: 'Domain is valid',
    };

    beforeEach(() => {
      (BrandServices.settings.validateCustomDomain as jest.Mock).mockResolvedValue(mockValidation);
    });

    it('should validate domain successfully', async () => {
      mockRequest.validatedBody = {
        domain: 'example.com',
        subdomain: 'test',
      };

      await brandSettingsController.validateDomain(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.validateCustomDomain).toHaveBeenCalledWith('example.com');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('validateWallet', () => {
    const mockValidation = {
      verified: true,
      walletAddress: '0x123...',
      verifiedAt: new Date(),
    };

    beforeEach(() => {
      (BrandServices.settings.verifyWalletOwnership as jest.Mock).mockResolvedValue(mockValidation);
    });

    it('should validate wallet address successfully', async () => {
      mockRequest.validatedBody = {
        walletAddress: '0x123...',
        signature: 'signature-123',
        message: 'Verification message',
      };

      await brandSettingsController.validateWallet(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.verifyWalletOwnership).toHaveBeenCalledWith(
        'business-id-123',
        '0x123...',
        {
          signature: 'signature-123',
          message: 'Verification message'
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('exportSettings', () => {
    const mockExported = {
      format: 'json',
      data: { themeColor: '#FF0000' },
    };

    beforeEach(() => {
      (BrandServices.settings.exportSettings as jest.Mock).mockResolvedValue(mockExported);
    });

    it('should export settings in JSON format', async () => {
      mockRequest.validatedQuery = {
        format: 'json',
        includeSecrets: false,
      };

      await brandSettingsController.exportSettings(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.exportSettings).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          format: 'json',
          includeSensitive: false,
          exportedBy: 'user-id-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should export settings with secrets when requested', async () => {
      mockRequest.validatedQuery = {
        format: 'json',
        includeSecrets: true,
      };

      await brandSettingsController.exportSettings(mockRequest, mockResponse, mockNext);

      expect(BrandServices.settings.exportSettings).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          includeSensitive: true,
        })
      );
    });
  });

  describe('importSettings', () => {
    beforeEach(() => {
      // importSettings throws an error in the controller (not yet implemented)
    });

    it('should return error for import settings (not implemented)', async () => {
      mockRequest.validatedBody = {
        settings: { themeColor: '#FF0000' },
        format: 'json',
        overwrite: false,
      };

      await brandSettingsController.importSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.message).toContain('not yet implemented');
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Settings service unavailable',
      };
      (BrandServices.settings.getSettings as jest.Mock).mockRejectedValue(serviceError);

      await brandSettingsController.getSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (BrandServices.settings.getSettings as jest.Mock).mockResolvedValue({});

      await brandSettingsController.getSettings(mockRequest, mockResponse, mockNext);

      expect((brandSettingsController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_BRAND_SETTINGS'
      );
    });
  });
});

