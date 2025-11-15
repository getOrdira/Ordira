/**
 * Health Controller Unit Tests
 * 
 * Tests health check endpoints: basic, detailed, readiness, and liveness.
 */

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HealthController } from '../../../controllers/core/health.controller';
import { redisClusterService } from '../../../services/infrastructure/cache/core/redisClusterConnection.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../utils/__tests__/testHelpers';

// Mock Redis cluster service
jest.mock('../../../services/infrastructure/cache/core/redisClusterConnection.service', () => ({
  redisClusterService: {
    healthCheck: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
  LogLevel: {
    INFO: 'info',
    ERROR: 'error',
    WARN: 'warn',
  },
}));

describe('HealthController', () => {
  let healthController: HealthController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    healthController = new HealthController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
    
    // Set default environment
    (process.env as any).NODE_ENV = 'test';
    process.env.npm_package_version = '1.0.0';
  });

  describe('basicHealth', () => {
    it('should return healthy status with basic checks', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.basicHealth(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('status', 'healthy');
      expect(responseData.data).toHaveProperty('timestamp');
      expect(responseData.data).toHaveProperty('uptime');
      expect(responseData.data).toHaveProperty('version');
      expect(responseData.data).toHaveProperty('environment', 'test');
      expect(responseData.data).toHaveProperty('checks');
      expect(responseData.data.checks).toHaveProperty('database');
      expect(responseData.data.checks).toHaveProperty('redis');
      expect(responseData.data.checks).toHaveProperty('memory');
      expect(responseData.data.checks).toHaveProperty('disk');
    });

    it('should include request metadata when available', async () => {
      mockRequest.headers = {
        'x-request-id': 'test-request-id-123',
      };
      mockRequest.performanceMetrics = {
        duration: 50,
      };

      await healthController.basicHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.meta).toBeDefined();
      expect(responseData.meta.requestId).toBe('test-request-id-123');
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.npm_package_version;
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.basicHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.version).toBe('1.0.0'); // Default value
    });
  });

  describe('detailedHealth', () => {
    beforeEach(() => {
      // Mock successful database ping - ensure db object exists
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({ ok: 1 }),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }));
      }

      // Mock successful Redis health check
      (redisClusterService.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true,
        latency: 10,
        cluster: { nodes: 3 },
      });
    });

    it('should perform detailed health checks and return comprehensive status', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('status');
      expect(responseData.data).toHaveProperty('metrics');
      expect(responseData.data.metrics).toHaveProperty('responseTime');
      expect(responseData.data.metrics).toHaveProperty('memoryUsage');
      expect(responseData.data.metrics).toHaveProperty('cpuUsage');
      
      // Verify all checks are included
      expect(responseData.data.checks.database).toHaveProperty('status');
      expect(responseData.data.checks.redis).toHaveProperty('status');
      expect(responseData.data.checks.memory).toHaveProperty('status');
      expect(responseData.data.checks.disk).toHaveProperty('status');
    });

    it('should detect unhealthy database and mark status accordingly', async () => {
      // Mock database failure
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        }));
      }

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.checks.database.status).toBe('unhealthy');
      expect(responseData.data.status).toBe('unhealthy');
    });

    it('should detect unhealthy Redis and mark status accordingly', async () => {
      // Mock Redis failure
      (redisClusterService.healthCheck as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.checks.redis.status).toBe('unhealthy');
      expect(responseData.data.status).toBe('unhealthy');
    });

    it('should detect degraded memory status when usage is high', async () => {
      // Mock successful database and Redis checks first
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({ ok: 1 }),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }));
      }
      (redisClusterService.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true,
        latency: 10,
        cluster: { nodes: 3 },
      });

      // Mock high memory usage by manipulating process.memoryUsage
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 1000000000,
        heapTotal: 100000000,
        heapUsed: 85000000, // 85% usage - should be degraded
        external: 0,
        arrayBuffers: 0,
      });

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.checks.memory.status).toBe('degraded');
      expect(responseData.data.status).toBe('degraded');

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect unhealthy memory status when usage is critical', async () => {
      // Mock critical memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 1000000000,
        heapTotal: 100000000,
        heapUsed: 95000000, // 95% usage - should be unhealthy
        external: 0,
        arrayBuffers: 0,
      });

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.checks.memory.status).toBe('unhealthy');
      expect(responseData.data.status).toBe('unhealthy');

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });

    it('should include response time in metrics', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof responseData.data.metrics.responseTime).toBe('number');
    });

    it('should not expose sensitive connection details in error responses', async () => {
      // Mock database failure with connection string in error
      const errorWithSensitiveData = new Error('mongodb://user:password@host/db');
      if (mongoose.connection.db) {
        (mongoose.connection.db.admin as any) = {
          ping: jest.fn().mockRejectedValue(errorWithSensitiveData),
        };
      }

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const databaseCheck = responseData.data.checks.database;
      
      // Verify sensitive data is not exposed
      expect(JSON.stringify(databaseCheck)).not.toContain('mongodb://');
      expect(JSON.stringify(databaseCheck)).not.toContain('password');
      expect(databaseCheck.message).toBe('Database connection failed');
    });
  });

  describe('readiness', () => {
    beforeEach(() => {
      // Mock successful checks - ensure db object exists
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({ ok: 1 }),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }));
      }
      (redisClusterService.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true,
        latency: 10,
      });
    });

    it('should return ready status when critical checks pass', async () => {
      // Ensure database connection is properly mocked
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({ ok: 1 }),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }));
      }
      (redisClusterService.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true,
        latency: 10,
      });

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.readiness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.ready).toBe(true);
      expect(responseData.data).toHaveProperty('timestamp');
      expect(responseData.data).toHaveProperty('checks');
    });

    it('should return not ready status when database check fails', async () => {
      // Mock database failure
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        }));
      }

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.readiness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.ready).toBe(false);
      expect(responseData.data.checks.database.status).toBe('unhealthy');
    });

    it('should return not ready status when Redis check fails', async () => {
      // Mock Redis failure
      (redisClusterService.healthCheck as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.readiness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.ready).toBe(false);
      expect(responseData.data.checks.redis.status).toBe('unhealthy');
    });

    it('should handle errors gracefully', async () => {
      // Mock service throwing unexpected error
      if (!mongoose.connection.db) {
        (mongoose.connection as any).db = {
          admin: jest.fn(() => ({
            ping: jest.fn().mockImplementation(() => {
              throw new Error('Unexpected error');
            }),
          })),
        };
      } else {
        (mongoose.connection.db.admin as any) = jest.fn(() => ({
          ping: jest.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          }),
        }));
      }

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.readiness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });
  });

  describe('liveness', () => {
    it('should return alive status with process information', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.liveness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('alive', true);
      expect(responseData.data).toHaveProperty('timestamp');
      expect(responseData.data).toHaveProperty('uptime');
      expect(responseData.data).toHaveProperty('memoryUsage');
      expect(responseData.data).toHaveProperty('pid', process.pid);
    });

    it('should always return alive status regardless of external services', async () => {
      // Even if database/Redis fail, liveness should pass
      if (mongoose.connection.db) {
        (mongoose.connection.db.admin as any) = {
          ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };
      }

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.liveness(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.alive).toBe(true);
    });

    it('should include memory usage information', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.liveness(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.memoryUsage).toBeDefined();
      expect(responseData.data.memoryUsage).toHaveProperty('heapUsed');
      expect(responseData.data.memoryUsage).toHaveProperty('heapTotal');
    });

    it('should include uptime information', async () => {
      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.liveness(mockRequest, mockResponse, mockNext);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof responseData.data.uptime).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle async operation errors in detailedHealth', async () => {
      // Mock service throwing error - simulate disconnected state
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = null; // Simulate disconnected state

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      // Should handle error gracefully
      expect(mockResponse.status).toHaveBeenCalled();
      
      // Restore original
      (mongoose.connection as any).db = originalDb;
    });

    it('should handle missing request metadata gracefully', async () => {
      mockRequest.headers = {} as any;
      mockRequest.performanceMetrics = undefined;

      await healthController.basicHealth(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics for basic health check', async () => {
      const recordPerformanceSpy = jest.spyOn(healthController, 'recordPerformance' as any);

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.basicHealth(mockRequest, mockResponse, mockNext);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'BASIC_HEALTH_CHECK');
    });

    it('should record performance metrics for detailed health check', async () => {
      if (mongoose.connection.db) {
        (mongoose.connection.db.admin as any) = {
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        };
      }
      (redisClusterService.healthCheck as jest.Mock).mockResolvedValue({
        healthy: true,
        latency: 10,
      });

      const recordPerformanceSpy = jest.spyOn(healthController, 'recordPerformance' as any);

      mockRequest.headers = {};
      mockRequest.performanceMetrics = {};

      await healthController.detailedHealth(mockRequest, mockResponse, mockNext);

      expect(recordPerformanceSpy).toHaveBeenCalledWith(mockRequest, 'DETAILED_HEALTH_CHECK');
    });
  });
});

