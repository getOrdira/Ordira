/**
 * Manufacturer Supply Chain Service Unit Tests
 * 
 * Tests supply chain contract operations and blockchain integration.
 */

import { SupplyChainService } from '../../../services/manufacturers/features/supplyChain.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { QrCodeService } from '../../../services/external/qrCode.service';
import {
  SupplyChainServicesRegistry,
  DeploymentService,
  ContractReadService,
  ContractWriteService,
} from '../../../services/supplyChain';

// Mock dependencies
const mockDeploymentService = {
  deployContract: jest.fn(),
};

const mockContractReadService = {
  getContractInfo: jest.fn(),
  getEndpoints: jest.fn(),
  getProducts: jest.fn(),
  getEvents: jest.fn(),
};

const mockContractWriteService = {
  createEndpoint: jest.fn(),
  createProduct: jest.fn(),
  logEvent: jest.fn(),
};

const mockQrCodeService = {
  generateQRCode: jest.fn(),
};

// Mock services
jest.mock('../../../services/supplyChain', () => ({
  SupplyChainServicesRegistry: {
    getInstance: jest.fn(),
  },
  DeploymentService: {
    getInstance: jest.fn(),
  },
  ContractReadService: {
    getInstance: jest.fn(),
  },
  ContractWriteService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../services/external/qrCode.service', () => ({
  QrCodeService: jest.fn().mockImplementation(() => mockQrCodeService),
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

describe('SupplyChainService', () => {
  let supplyChainService: SupplyChainService;
  let mockManufacturerModel: jest.Mocked<typeof Manufacturer>;

  const mockContractInfo = {
    contractAddress: '0x1234567890abcdef',
    manufacturerName: 'Test Manufacturer',
    deployedAt: new Date(),
    totalEvents: 10,
    totalProducts: 5,
    totalEndpoints: 3,
    isActive: true,
  };

  beforeEach(() => {
    (SupplyChainServicesRegistry.getInstance as jest.Mock) = jest.fn().mockReturnValue({
      deploymentService: mockDeploymentService,
      contractReadService: mockContractReadService,
      contractWriteService: mockContractWriteService,
    });
    
    supplyChainService = new SupplyChainService();
    jest.clearAllMocks();
    
    mockManufacturerModel = Manufacturer as jest.Mocked<typeof Manufacturer>;
    
    mockDeploymentService.deployContract.mockResolvedValue({
      success: true,
      deployment: mockContractInfo,
    });
    
    mockContractReadService.getContractInfo.mockResolvedValue(mockContractInfo);
    mockContractReadService.getEndpoints.mockResolvedValue([]);
    mockContractReadService.getProducts.mockResolvedValue([]);
    mockContractReadService.getEvents.mockResolvedValue([]);
    
    (Manufacturer.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({});
  });

  describe('deploySupplyChainContract', () => {
    it('should deploy supply chain contract successfully', async () => {
      const result = await supplyChainService.deploySupplyChainContract(
        'manufacturer-id-123',
        'Test Manufacturer'
      );

      expect(mockDeploymentService.deployContract).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'Test Manufacturer'
      );
      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.contractAddress).toBeDefined();
      expect(result.isActive).toBe(true);
    });

    it('should throw error when deployment fails', async () => {
      mockDeploymentService.deployContract.mockResolvedValue({
        success: false,
        error: 'Deployment failed',
      });

      await expect(
        supplyChainService.deploySupplyChainContract('manufacturer-id-123', 'Test Manufacturer')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'DEPLOYMENT_ERROR',
      });
    });

    it('should update manufacturer with contract address', async () => {
      await supplyChainService.deploySupplyChainContract(
        'manufacturer-id-123',
        'Test Manufacturer'
      );

      expect(Manufacturer.findByIdAndUpdate).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            'supplyChainSettings.contractAddress': mockContractInfo.contractAddress,
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('getSupplyChainDashboard', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          supplyChainSettings: {
            contractAddress: '0x1234567890abcdef',
          },
        }),
      });
    });

    it('should return supply chain dashboard data', async () => {
      const result = await supplyChainService.getSupplyChainDashboard('manufacturer-id-123');

      expect(result.contractInfo).toBeDefined();
      expect(result.endpoints).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.recentEvents).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('should return null contract info when contract not deployed', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          supplyChainSettings: {},
        }),
      });

      const result = await supplyChainService.getSupplyChainDashboard('manufacturer-id-123');

      expect(result.contractInfo).toBeNull();
    });

    it('should aggregate statistics', async () => {
      mockContractReadService.getEvents.mockResolvedValue([
        { eventType: 'manufactured', timestamp: new Date() },
        { eventType: 'shipped', timestamp: new Date() },
      ]);
      mockContractReadService.getProducts.mockResolvedValue([
        { productId: 'product-1' },
        { productId: 'product-2' },
      ]);
      mockContractReadService.getEndpoints.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      const result = await supplyChainService.getSupplyChainDashboard('manufacturer-id-123');

      expect(result.stats.totalEvents).toBeDefined();
      expect(result.stats.totalProducts).toBeDefined();
      expect(result.stats.totalEndpoints).toBeDefined();
    });
  });

  describe('createSupplyChainEndpoint', () => {
    const mockEndpointData = {
      name: 'Production Line 1',
      eventType: 'manufactured' as const,
      location: 'Factory Floor A',
    };

    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          supplyChainSettings: {
            contractAddress: '0x1234567890abcdef',
          },
        }),
      });
      mockContractWriteService.createEndpoint.mockResolvedValue({
        id: 1,
        ...mockEndpointData,
      });
    });

    it('should create supply chain endpoint successfully', async () => {
      const result = await supplyChainService.createSupplyChainEndpoint(
        'manufacturer-id-123',
        mockEndpointData
      );

      expect(mockContractWriteService.createEndpoint).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockEndpointData.name);
    });

    it('should throw error when contract is not deployed', async () => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          supplyChainSettings: {},
        }),
      });

      await expect(
        supplyChainService.createSupplyChainEndpoint('manufacturer-id-123', mockEndpointData)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CONTRACT_NOT_DEPLOYED',
      });
    });
  });

  describe('generateProductQRCode', () => {
    beforeEach(() => {
      (Manufacturer.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'manufacturer-id-123',
          supplyChainSettings: {
            contractAddress: '0x1234567890abcdef',
          },
        }),
      });
      mockContractReadService.getProducts.mockResolvedValue([
        {
          productId: 'product-123',
          name: 'Test Product',
        },
      ]);
      mockQrCodeService.generateQRCode.mockResolvedValue({
        qrCodeUrl: 'https://example.com/qr.png',
        qrCodeData: 'product-data',
      });
    });

    it('should generate QR code for product', async () => {
      const result = await supplyChainService.generateProductQrCode(
        'manufacturer-id-123',
        'product-123'
      );

      expect(mockQrCodeService.generateQRCode).toHaveBeenCalled();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.productName).toBeDefined();
    });

    it('should throw error when product is not found', async () => {
      mockContractReadService.getProducts.mockResolvedValue([]);

      await expect(
        supplyChainService.generateProductQrCode('manufacturer-id-123', 'non-existent-product')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });
  });
});

