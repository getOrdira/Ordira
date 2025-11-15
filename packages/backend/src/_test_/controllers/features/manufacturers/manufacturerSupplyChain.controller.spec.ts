/**
 * Manufacturer Supply Chain Controller Unit Tests
 * 
 * Tests supply chain operations: deploy contract, create endpoints, register products, log events.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerSupplyChainController } from '../../../../controllers/features/manufacturers/manufacturerSupplyChain.controller';
import { supplyChainService } from '../../../../services/manufacturers/features/supplyChain.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock supply chain service
jest.mock('../../../../services/manufacturers/features/supplyChain.service', () => ({
  supplyChainService: {
    deployContract: jest.fn(),
    getContractInfo: jest.fn(),
    createEndpoint: jest.fn(),
    getEndpoints: jest.fn(),
    registerProduct: jest.fn(),
    getProducts: jest.fn(),
    logEvent: jest.fn(),
    getProductEvents: jest.fn(),
    getDashboard: jest.fn(),
    generateQRCode: jest.fn(),
    generateBatchQRCodes: jest.fn(),
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

describe('ManufacturerSupplyChainController', () => {
  let manufacturerSupplyChainController: ManufacturerSupplyChainController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    manufacturerSupplyChainController = new ManufacturerSupplyChainController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};
  });

  describe('deployContract', () => {
    const mockContractDeployment = {
      contractAddress: '0x123...',
      transactionHash: '0xabc...',
    };

    beforeEach(() => {
      (supplyChainService.deployContract as jest.Mock).mockResolvedValue(mockContractDeployment);
    });

    it('should deploy contract successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        manufacturerName: 'Test Manufacturer',
      };

      await manufacturerSupplyChainController.deployContract(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.deployContract).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'Test Manufacturer'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when manufacturerName is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {};

      await manufacturerSupplyChainController.deployContract(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getContractInfo', () => {
    const mockContractInfo = {
      contractAddress: '0x123...',
      deployedAt: new Date(),
    };

    beforeEach(() => {
      (supplyChainService.getContractInfo as jest.Mock).mockResolvedValue(mockContractInfo);
    });

    it('should retrieve contract information', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerSupplyChainController.getContractInfo(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.getContractInfo).toHaveBeenCalledWith('manufacturer-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createEndpoint', () => {
    const mockEndpoint = {
      endpointId: 1,
      name: 'Assembly Point',
    };

    beforeEach(() => {
      (supplyChainService.createEndpoint as jest.Mock).mockResolvedValue(mockEndpoint);
    });

    it('should create endpoint successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        name: 'Assembly Point',
        eventType: 'manufactured',
        location: 'Factory Floor 1',
      };

      await manufacturerSupplyChainController.createEndpoint(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.createEndpoint).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          name: 'Assembly Point',
          eventType: 'manufactured',
          location: 'Factory Floor 1',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when required fields are missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        name: 'Assembly Point',
        // Missing eventType and location
      };

      await manufacturerSupplyChainController.createEndpoint(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('registerProduct', () => {
    const mockProductRegistration = {
      productId: 'product-id-123',
      registered: true,
    };

    beforeEach(() => {
      (supplyChainService.registerProduct as jest.Mock).mockResolvedValue(mockProductRegistration);
    });

    it('should register product successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        productId: 'product-id-123',
        name: 'Test Product',
        description: 'Product description',
      };

      await manufacturerSupplyChainController.registerProduct(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.registerProduct).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          productId: 'product-id-123',
          name: 'Test Product',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logEvent', () => {
    const mockLoggedEvent = {
      eventId: 'event-id-123',
      loggedAt: new Date(),
    };

    beforeEach(() => {
      (supplyChainService.logEvent as jest.Mock).mockResolvedValue(mockLoggedEvent);
    });

    it('should log event successfully', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        endpointId: 1,
        productId: 'product-id-123',
        eventType: 'manufactured',
        location: 'Factory Floor 1',
        details: 'Product assembled',
      };

      await manufacturerSupplyChainController.logEvent(mockRequest, mockResponse, mockNext);

      expect(supplyChainService.logEvent).toHaveBeenCalledWith(
        'manufacturer-id-123',
        expect.objectContaining({
          endpointId: 1,
          productId: 'product-id-123',
          eventType: 'manufactured',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProductEvents', () => {
    const mockEvents = [
      { eventId: 'event-1', eventType: 'manufactured' },
      { eventId: 'event-2', eventType: 'shipped' },
    ];

    beforeEach(() => {
      (supplyChainService.getProductEvents as jest.Mock).mockResolvedValue(mockEvents);
    });

    it('should retrieve product events', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        productId: 'product-id-123',
      };

      await manufacturerSupplyChainController.getProductEvents(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.getProductEvents).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'product-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when productId is missing', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {};

      await manufacturerSupplyChainController.getProductEvents(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('generateQRCode', () => {
    const mockQRCode = {
      qrCodeUrl: 'https://example.com/qrcode.png',
      productId: 'product-id-123',
    };

    beforeEach(() => {
      (supplyChainService.generateQRCode as jest.Mock).mockResolvedValue(mockQRCode);
    });

    it('should generate QR code for product', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedQuery = {
        productId: 'product-id-123',
      };

      await manufacturerSupplyChainController.generateQRCode(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.generateQRCode).toHaveBeenCalledWith(
        'manufacturer-id-123',
        'product-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getDashboard', () => {
    const mockDashboard = {
      totalProducts: 10,
      totalEvents: 50,
      activeEndpoints: 3,
    };

    beforeEach(() => {
      (supplyChainService.getDashboard as jest.Mock).mockResolvedValue(mockDashboard);
    });

    it('should retrieve supply chain dashboard', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };

      await manufacturerSupplyChainController.getDashboard(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(supplyChainService.getDashboard).toHaveBeenCalledWith('manufacturer-id-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      mockRequest.validatedBody = {
        manufacturerName: 'Test Manufacturer',
      };
      const serviceError = {
        statusCode: 500,
        message: 'Contract deployment failed',
      };
      (supplyChainService.deployContract as jest.Mock).mockRejectedValue(serviceError);

      await manufacturerSupplyChainController.deployContract(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerSupplyChainController,
        'recordPerformance' as any
      );
      mockRequest.validatedParams = {
        manufacturerId: 'manufacturer-id-123',
      };
      (supplyChainService.getContractInfo as jest.Mock).mockResolvedValue({
        contractAddress: '0x123...',
      });

      await manufacturerSupplyChainController.getContractInfo(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(recordPerformanceSpy).toHaveBeenCalled();
    });
  });
});

