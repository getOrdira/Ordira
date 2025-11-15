/**
 * Manufacturer Score Controller Unit Tests
 * 
 * Tests manufacturer scoring operations: calculate initial score, profile score, completeness.
 */

import { Response, NextFunction } from 'express';
import { ManufacturerScoreController } from '../../../../controllers/features/manufacturers/manufacturerScore.controller';
import { ScoreCalculatorService } from '../../../../services/manufacturers/utils/scoreCalculator.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock score calculator service
jest.mock('../../../../services/manufacturers/utils/scoreCalculator.service', () => ({
  ScoreCalculatorService: jest.fn().mockImplementation(() => ({
    calculateInitialProfileScore: jest.fn(),
    calculateProfileScore: jest.fn(),
    calculateProfileCompleteness: jest.fn(),
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

describe('ManufacturerScoreController', () => {
  let manufacturerScoreController: ManufacturerScoreController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockScoreCalculator: any;

  beforeEach(() => {
    manufacturerScoreController = new ManufacturerScoreController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    // Get the mocked instance
    mockScoreCalculator = (manufacturerScoreController as any).scoreCalculator;
  });

  describe('calculateInitialProfileScore', () => {
    beforeEach(() => {
      (mockScoreCalculator.calculateInitialProfileScore as jest.Mock).mockReturnValue(65);
    });

    it('should calculate initial profile score for registration data', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
        industry: 'Electronics',
        contactEmail: 'contact@example.com',
        description: 'Test description',
        servicesOffered: ['Assembly', 'Packaging'],
        moq: 100,
        headquarters: {
          country: 'United States',
          city: 'New York',
        },
      };

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockScoreCalculator.calculateInitialProfileScore).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.initialScore).toBe(65);
    });

    it('should calculate score with minimal required fields', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockScoreCalculator.calculateInitialProfileScore).toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      mockRequest.validatedBody = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should require business user authentication', async () => {
      mockRequest.userType = 'customer';
      mockRequest.businessId = undefined;
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('calculateProfileScore', () => {
    beforeEach(() => {
      (mockScoreCalculator.calculateProfileScore as jest.Mock).mockReturnValue(85);
    });

    it('should calculate profile score for existing manufacturer', async () => {
      mockRequest.validatedBody = {
        manufacturerData: {
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          industry: 'Electronics',
          servicesOffered: ['Assembly'],
          certifications: [],
          profileCompleteness: 75,
        },
      };

      await manufacturerScoreController.calculateProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockScoreCalculator.calculateProfileScore).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturerData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.profileScore).toBe(85);
    });

    it('should return 400 when manufacturerData is missing', async () => {
      mockRequest.validatedBody = {};

      await manufacturerScoreController.calculateProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('calculateProfileCompleteness', () => {
    beforeEach(() => {
      (mockScoreCalculator.calculateProfileCompleteness as jest.Mock).mockReturnValue(80);
    });

    it('should calculate profile completeness', async () => {
      mockRequest.validatedBody = {
        manufacturerData: {
          id: 'manufacturer-id-123',
          name: 'Test Manufacturer',
          industry: 'Electronics',
          servicesOffered: ['Assembly'],
        },
      };

      await manufacturerScoreController.calculateProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockScoreCalculator.calculateProfileCompleteness).toHaveBeenCalledWith(
        mockRequest.validatedBody.manufacturerData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.completeness).toBe(80);
    });

    it('should return 400 when manufacturerData is missing', async () => {
      mockRequest.validatedBody = {};

      await manufacturerScoreController.calculateProfileCompleteness(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };
      const serviceError = new Error('Score calculation failed');
      (mockScoreCalculator.calculateInitialProfileScore as jest.Mock).mockImplementation(() => {
        throw serviceError;
      });

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(
        manufacturerScoreController,
        'recordPerformance' as any
      );
      mockRequest.validatedBody = {
        name: 'Test Manufacturer',
        email: 'test@example.com',
        password: 'Password123!',
      };
      (mockScoreCalculator.calculateInitialProfileScore as jest.Mock).mockReturnValue(65);

      await manufacturerScoreController.calculateInitialProfileScore(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(recordPerformanceSpy).toHaveBeenCalledWith(
        mockRequest,
        'CALCULATE_INITIAL_PROFILE_SCORE'
      );
    });
  });
});

