/**
 * Supply Chain Dashboard Controller Unit Tests
 * 
 * Tests supply chain dashboard operations: get dashboard data, get overview, get product summaries, get endpoint summaries.
 */

import { Response } from 'express';
import { SupplyChainDashboardController } from '../../../../controllers/features/supplyChain/supplyChainDashboard.controller';
import { getSupplyChainDashboardService } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
} from '../../../../utils/__tests__/testHelpers';

// Mock supply chain services
jest.mock('../../../../services/container.service', () => ({
  getSupplyChainDashboardService: jest.fn(() => ({
    getDashboardData: jest.fn(),
    getDashboardOverview: jest.fn(),
    getProductSummaries: jest.fn(),
    getEndpointSummaries: jest.fn(),
  })),
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

describe('SupplyChainDashboardController', () => {
  let supplyChainDashboardController: SupplyChainDashboardController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockDashboardService: any;

  beforeEach(() => {
    supplyChainDashboardController = new SupplyChainDashboardController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockDashboardService = getSupplyChainDashboardService();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (supplyChainDashboardController as any).requireBusinessId = jest.fn().mockReturnValue('business-id-123');
    (supplyChainDashboardController as any).requireContractAddress = jest
      .fn()
      .mockReturnValue('0xContractAddress');
    (supplyChainDashboardController as any).parseTimeframe = jest.fn().mockReturnValue('month');
    (supplyChainDashboardController as any).parseOptionalBoolean = jest.fn().mockReturnValue(false);
    (supplyChainDashboardController as any).parseOptionalNumber = jest.fn().mockReturnValue(20);
    (supplyChainDashboardController as any).recordPerformance = jest.fn();
    (supplyChainDashboardController as any).logAction = jest.fn();
    (supplyChainDashboardController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (supplyChainDashboardController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getDashboardData', () => {
    const mockDashboardData = {
      success: true,
      data: {
        products: 10,
        events: 50,
        endpoints: 3,
      },
    };

    beforeEach(() => {
      (mockDashboardService.getDashboardData as jest.Mock).mockResolvedValue(mockDashboardData);
    });

    it('should retrieve dashboard data successfully', async () => {
      mockRequest.validatedQuery = {
        timeframe: 'month',
        includeInactive: false,
      };

      await supplyChainDashboardController.getDashboardData(mockRequest, mockResponse);

      expect(mockDashboardService.getDashboardData).toHaveBeenCalledWith({
        businessId: 'business-id-123',
        contractAddress: '0xContractAddress',
        timeframe: 'month',
        includeInactive: false,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.result).toEqual(mockDashboardData);
    });
  });

  describe('getDashboardOverview', () => {
    const mockOverview = {
      success: true,
      data: {
        totalProducts: 10,
        activeEndpoints: 3,
        recentEvents: 5,
      },
    };

    beforeEach(() => {
      (mockDashboardService.getDashboardOverview as jest.Mock).mockResolvedValue(mockOverview);
    });

    it('should retrieve dashboard overview successfully', async () => {
      await supplyChainDashboardController.getDashboardOverview(mockRequest, mockResponse);

      expect(mockDashboardService.getDashboardOverview).toHaveBeenCalledWith(
        'business-id-123',
        '0xContractAddress'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProductSummaries', () => {
    const mockSummaries = {
      success: true,
      data: [
        { productId: 'product-id-1', events: 10 },
        { productId: 'product-id-2', events: 5 },
      ],
    };

    beforeEach(() => {
      (mockDashboardService.getProductSummaries as jest.Mock).mockResolvedValue(mockSummaries);
    });

    it('should retrieve product summaries successfully', async () => {
      mockRequest.validatedQuery = {
        limit: 20,
      };

      await supplyChainDashboardController.getProductSummaries(mockRequest, mockResponse);

      expect(mockDashboardService.getProductSummaries).toHaveBeenCalledWith(
        'business-id-123',
        '0xContractAddress',
        20
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use default limit when not provided', async () => {
      mockRequest.validatedQuery = {};

      await supplyChainDashboardController.getProductSummaries(mockRequest, mockResponse);

      expect(mockDashboardService.getProductSummaries).toHaveBeenCalledWith(
        'business-id-123',
        '0xContractAddress',
        20
      );
    });
  });

  describe('getEndpointSummaries', () => {
    const mockSummaries = {
      success: true,
      data: [
        { endpoint: 'endpoint-1', status: 'active' },
        { endpoint: 'endpoint-2', status: 'inactive' },
      ],
    };

    beforeEach(() => {
      (mockDashboardService.getEndpointSummaries as jest.Mock).mockResolvedValue(mockSummaries);
    });

    it('should retrieve endpoint summaries successfully', async () => {
      await supplyChainDashboardController.getEndpointSummaries(mockRequest, mockResponse);

      expect(mockDashboardService.getEndpointSummaries).toHaveBeenCalledWith(
        'business-id-123',
        '0xContractAddress'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when businessId is missing', async () => {
      (supplyChainDashboardController as any).requireBusinessId.mockImplementation(() => {
        throw { statusCode: 400, message: 'Business identifier is required' };
      });

      await supplyChainDashboardController.getDashboardOverview(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when contractAddress is missing', async () => {
      (supplyChainDashboardController as any).requireContractAddress.mockImplementation(() => {
        throw { statusCode: 400, message: 'Contract address is required' };
      });

      await supplyChainDashboardController.getDashboardOverview(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Dashboard service unavailable',
      };
      (mockDashboardService.getDashboardData as jest.Mock).mockRejectedValue(serviceError);

      mockRequest.validatedQuery = {};

      await supplyChainDashboardController.getDashboardData(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockDashboardService.getDashboardData as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      await supplyChainDashboardController.getDashboardData(mockRequest, mockResponse);

      expect((supplyChainDashboardController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'SUPPLY_CHAIN_DASHBOARD_DATA'
      );
    });
  });
});

