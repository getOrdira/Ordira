/**
 * Server Startup Service
 * 
 * Handles server startup, graceful shutdown, and process management.
 */

import { Server } from 'http';
import { logger } from '../../logging';
import { Application } from 'express';
import * as Sentry from '@sentry/node';
import { monitoringService } from '../../../external/monitoring.service';
import { securityScanService } from '../../../external/security-scan.service';

export class ServerStartupService {
  private server: Server | null = null;
  private isShuttingDown = false;

  /**
   * Start the HTTP server
   */
  async start(app: Application, port: number = 4000): Promise<Server> {
    logger.info('🚀 Starting HTTP server...');

    try {
      this.server = app.listen(port, '0.0.0.0', () => {
        this.logServerStartup(port);
      });

      // Configure server timeouts
      this.configureServerTimeouts();

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      // Setup process error handlers
      this.setupProcessErrorHandlers();

      // Start background services
      this.startBackgroundServices();

      logger.info('✅ HTTP server started successfully');
      return this.server;

    } catch (error) {
      logger.error('❌ Failed to start HTTP server:', error);
      
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  /**
   * Log server startup information
   */
  private logServerStartup(port: number): void {
    logger.info(`
🚀 Ordira Platform Server Started!
┌────────────────────────────────────────────────────────────────────┐
│ 📡 Server:     http://0.0.0.0:${port}                                │
│ 🌐 Environment: ${process.env.NODE_ENV}                               │
│ 📊 Metrics:    http://0.0.0.0:${port}/metrics                       │
│ 💊 Health:     http://0.0.0.0:${port}/health                        │
│ 🔧 Version:    ${process.env.npm_package_version || '1.0.0'}         │
└────────────────────────────────────────────────────────────────────┘

✅ Features Enabled:
   • Enhanced Authentication & Authorization
   • Dynamic Rate Limiting by Plan
   • Comprehensive Input Validation
   • Secure File Upload Processing
   • Multi-tenant Architecture
   • Real-time Metrics & Monitoring
   • Web3 & NFT Integration
   • Advanced Governance System
   • Manufacturer Verification
   • E-commerce Integrations
   
🔒 Security Features:
   • Helmet Security Headers
   • CORS with Custom Domain Support
   • Rate Limiting & DDoS Protection
   • Input Sanitization & Validation
   • JWT Token Security
   • File Upload Security
   
📈 Monitoring:
   • Prometheus Metrics
   • Sentry Error Tracking
   • Performance Monitoring
   • Health Check Endpoints
   • Circuit Breaker Patterns
   • Automated Security Scanning
      `);
  }

  /**
   * Configure server timeouts
   */
  private configureServerTimeouts(): void {
    if (!this.server) return;

    // Server timeout configuration
    this.server.timeout = 120000; // 2 minutes
    this.server.keepAliveTimeout = 61000; // 61 seconds
    this.server.headersTimeout = 62000; // 62 seconds

    logger.info('✅ Server timeouts configured');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      if (this.isShuttingDown) {
        logger.info('⚠️ Shutdown already in progress, forcing exit...');
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close(async () => {
          logger.info('📡 HTTP server closed');
          
          try {
            // Close database connections
            const mongoose = require('mongoose');
            await mongoose.connection.close();
            logger.info('📡 MongoDB connection closed');
          } catch (error) {
            logger.error('⚠️ Error closing MongoDB:', error);
          }
          
          logger.info('📡 Graceful shutdown complete');
          process.exit(0);
        });
        
        // Force close after 30 seconds
        setTimeout(() => {
          logger.error('⚠️ Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      } else {
        process.exit(0);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    logger.info('✅ Graceful shutdown handlers registered');
  }

  /**
   * Setup process error handlers
   */
  private setupProcessErrorHandlers(): void {
    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('⚠️ Unhandled Promise Rejection', { promise: promise?.toString(), reason: reason?.toString() });
      
      // Record metrics
      monitoringService.recordMetric({
        name: 'unhandled_promise_rejection',
        value: 1,
        tags: { 
          reason: reason?.toString() || 'unknown',
          promise: promise?.toString() || 'unknown'
        }
      });
      
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
      }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('⚠️ Uncaught Exception:', error);
      
      // Record metrics
      monitoringService.recordMetric({
        name: 'uncaught_exception',
        value: 1,
        tags: { 
          error: error.message,
          stack: error.stack?.substring(0, 500) || 'no stack'
        }
      });
      
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      
      process.exit(1);
    });

    logger.info('✅ Process error handlers registered');
  }

  /**
   * Start background services
   */
  private startBackgroundServices(): void {
    logger.info('🔄 Starting background services...');

    // Start periodic security scans
    this.startPeriodicSecurityScans();

    // Start system health monitoring
    this.startSystemHealthMonitoring();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    logger.info('✅ Background services started');
  }

  /**
   * Start periodic security scans
   */
  private startPeriodicSecurityScans(): void {
    // Run security scan every hour
    setInterval(async () => {
      try {
        const result = await securityScanService.performSecurityScan();
        
        // Record scan metrics
        monitoringService.recordMetric({
          name: 'security_scan_completed',
          value: 1,
          tags: { 
            scan_id: result.scanId,
            vulnerabilities_found: result.vulnerabilities.length.toString(),
            status: result.status
          }
        });

        // Log critical vulnerabilities
        const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical');
        if (criticalVulns.length > 0) {
          logger.warn(`🚨 Critical security vulnerabilities detected: ${criticalVulns.length}`);
          criticalVulns.forEach(vuln => {
            logger.warn(`   - ${vuln.title}: ${vuln.description}`);
          });
        }

      } catch (error) {
        logger.error('❌ Periodic security scan failed:', error);
        
        monitoringService.recordMetric({
          name: 'security_scan_failed',
          value: 1,
          tags: { error: error.message }
        });
      }
    }, 60 * 60 * 1000); // 1 hour

    logger.info('✅ Periodic security scans started');
  }

  /**
   * Start system health monitoring
   */
  private startSystemHealthMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(async () => {
      try {
        const health = await monitoringService.getSystemHealth();
        
        // Record health metrics
        monitoringService.recordMetrics([
          {
            name: 'system_health_status',
            value: health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0,
            tags: { status: health.status }
          },
          {
            name: 'system_cpu_usage',
            value: health.metrics.cpu,
            unit: 'percent'
          },
          {
            name: 'system_memory_usage',
            value: health.metrics.memory,
            unit: 'percent'
          },
          {
            name: 'system_disk_usage',
            value: health.metrics.disk,
            unit: 'percent'
          },
          {
            name: 'system_response_time',
            value: health.metrics.responseTime,
            unit: 'ms'
          },
          {
            name: 'system_error_rate',
            value: health.metrics.errorRate,
            unit: 'percent'
          }
        ]);

        // Log health status if not healthy
        if (health.status !== 'healthy') {
          logger.warn(`⚠️ System health: ${health.status}`);
          if (health.alerts.length > 0) {
            logger.warn(`   Active alerts: ${health.alerts.length}`);
          }
        }

      } catch (error) {
        logger.error('❌ System health monitoring failed:', error);
      }
    }, 30000); // 30 seconds

    logger.info('✅ System health monitoring started');
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor performance every minute
    setInterval(async () => {
      try {
        // Record system metrics
        monitoringService.recordSystemMetrics();

        // Get and record circuit breaker metrics
        const { circuitBreakerManager } = require('../../../external/circuit-breaker.service');
        const circuitStats = circuitBreakerManager.getAllStats();
        monitoringService.recordCircuitBreakerMetrics(circuitStats);

        // Log performance warnings
        const memUsage = process.memoryUsage();
        const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        if (memUsagePercent > 80) {
          logger.warn(`⚠️ High memory usage: ${memUsagePercent.toFixed(2)}%`);
        }

        // Check for open circuit breakers
        Object.entries(circuitStats).forEach(([name, stats]) => {
          if ((stats as { state?: string }).state === 'OPEN') {
            logger.warn(`⚠️ Circuit breaker '${name}' is OPEN`);
          }
        });

      } catch (error) {
        logger.error('❌ Performance monitoring failed:', error);
      }
    }, 60000); // 1 minute

    logger.info('✅ Performance monitoring started');
  }

  /**
   * Get server status
   */
  getServerStatus(): { running: boolean; port?: number; address?: string } {
    if (!this.server) {
      return { running: false };
    }

    const address = this.server.address();
    if (typeof address === 'string') {
      return { running: true, address };
    } else if (address) {
      return { running: true, port: address.port, address: address.address };
    }

    return { running: true };
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          logger.info('📡 Server stopped');
          resolve();
        });
      });
    }
  }
}

