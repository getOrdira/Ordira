/**
 * Application Bootstrap Service
 * 
 * Handles the initialization and configuration of the Express application
 * with proper dependency injection and service registration.
 */

import express, { Application, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import type { Request } from 'express';
import { logger } from '../../logging'; 
import path from 'path';

import { configService } from '../../config/core/config.service';
import { 
  monitoringService, 
  circuitBreakerManager,
  initializeOpenTelemetry, 
  setupPrometheusEndpoint 
} from '../../observability';
import { queueHealthService, jobQueueAdapter } from '../../resilience';
import { redisClusterService } from '../../cache';

// Middleware configuration modules
import {
  configureSecurityMiddleware,
  configurePerformanceMiddleware,
  configureMonitoringMiddleware,
  configureSentryErrorHandler,
  configureBodyParsingMiddleware,
  configureCorsMiddleware
} from '../middleware';

// Feature modules and registry
import {
  moduleRegistry,
  AuthModule,
  UsersModule,
  ManufacturersModule,
  BrandsModule,
  SupplyChainModule,
  AnalyticsModule,
  CertificatesModule,
  IntegrationsModule,
  ProductsModule,
  VotesModule,
  SubscriptionsModule,
  NotificationsModule,
  SecurityModule,
  DomainsModule,
  MediaModule,
  NftModule
} from '../modules';

// Core middleware (still needed for routes)
import {
  errorHandler,
  authenticate,
  dynamicRateLimiter,
  cleanupOnError,
  warmupPlanCache
} from '../../../../middleware';
import type { UnifiedAuthRequest } from '../../../../middleware/auth/unifiedAuth.middleware';
import type { UploadRequest } from '../../../../middleware/upload/upload.middleware';

/**
 * Type-safe wrapper for authenticate middleware
 * Converts standard Express Request to UnifiedAuthRequest for compatibility
 */
const authenticateMiddleware: RequestHandler = (req, res, next) => {
  authenticate(req as UnifiedAuthRequest, res, next).catch(next);
};

/**
 * Type-safe wrapper for cleanupOnError middleware
 * Converts standard Express Request to UploadRequest for compatibility
 * Note: This is safe because cleanupOnError checks for req.files before accessing it
 */
const cleanupOnErrorMiddleware: RequestHandler = (req, res, next) => {
  cleanupOnError(req as UploadRequest, res, next);
};

export class AppBootstrapService {
  private app: Application;

  constructor() {
    this.app = express();
  }

  /**
   * Initialize the Express application
   */
  async initialize(): Promise<Application> {
    logger.info(' Initializing Ordira Platform...');

    // Register all services in DI container (must be done before modules)
    await this.registerDIContainerServices();

    // Initialize OpenTelemetry (must be done early, before other services)
    await this.initializeOpenTelemetry();

    // Configure Express app
    this.configureExpress();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes (now async)
    await this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();

    // Start monitoring
    this.startMonitoring();

    // Start queue health monitoring
    this.startQueueHealthMonitoring();

    logger.info('✅ Application initialization completed');
    return this.app;
  }

  /**
   * Initialize OpenTelemetry
   */
  private async initializeOpenTelemetry(): Promise<void> {
    try {
      // Logging is handled by initializeOpenTelemetry() function
      await initializeOpenTelemetry({
        serviceName: process.env.SERVICE_NAME || 'ordira-backend',
        serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        enableMetrics: process.env.OTEL_METRICS_ENABLED !== 'false',
        enableTracing: process.env.OTEL_TRACING_ENABLED !== 'false',
        enablePrometheus: process.env.OTEL_PROMETHEUS_ENABLED !== 'false',
        prometheusPort: parseInt(process.env.OTEL_PROMETHEUS_PORT || '9090', 10),
        otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        jaegerEndpoint: process.env.JAEGER_ENDPOINT,
        zipkinEndpoint: process.env.ZIPKIN_ENDPOINT
      });

      // Setup Prometheus metrics endpoint
      setupPrometheusEndpoint(this.app, '/metrics');

      logger.info('✅ OpenTelemetry initialized');
    } catch (error: any) {
      logger.error('❌ Failed to initialize OpenTelemetry:', error);
      // Don't throw - continue without OpenTelemetry (graceful degradation)
    }
  }


  /**
   * Configure Express application settings
   */
  private configureExpress(): void {
    logger.info('🔧 Configuring Express application...');

    // Trust proxy for accurate IP addresses behind load balancers
    this.app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

    // Set view engine if needed
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../../../../views'));

    logger.info('✅ Express application configured');
  }

  /**
   * Setup middleware using modular configuration
   */
  private setupMiddleware(): void {
    logger.info('🔧 Setting up middleware...');

    // Security middleware
    configureSecurityMiddleware(this.app);

    // Performance middleware
    configurePerformanceMiddleware(this.app);

    // Body parsing middleware
    configureBodyParsingMiddleware(this.app);

    // CORS middleware
    configureCorsMiddleware(this.app);

    // Monitoring middleware
    configureMonitoringMiddleware(this.app);

    logger.info('✅ Middleware setup completed');
  }

  /**
   * Setup routes
   */
  private async setupRoutes(): Promise<void> {
    logger.info('📦 Setting up routes...');

    // Health check routes
    this.setupHealthRoutes();

    // Register all feature modules
    await this.registerFeatureModules();

    // Global API middleware (applied after module routes)
    this.setupGlobalApiMiddleware();

    // Static file serving
    this.setupStaticRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn(`🚫 Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    logger.info('✅ Routes setup completed');
  }

  /**
   * Setup health check routes
   */
  private setupHealthRoutes(): void {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Ordira Platform API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    this.app.head('/', (req, res) => {
      res.status(200).end();
    });

    // Sentry debug endpoint - for testing error tracking
    // ⚠️ SECURITY: Only available in development/staging, or protected by auth in production
    // This endpoint intentionally throws an error to verify Sentry is working
    // Remove or disable this endpoint after verifying Sentry setup
    const debugSentryHandler: RequestHandler = async (req, res, next) => {
      // Only allow in development/staging, or if explicitly enabled in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isStaging = process.env.NODE_ENV === 'staging';
      const allowInProduction = process.env.ALLOW_SENTRY_DEBUG === 'true';
      
      if (!isDevelopment && !isStaging && !allowInProduction) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Debug endpoint not available in production',
          timestamp: new Date().toISOString()
        });
      }

      if (!process.env.SENTRY_DSN) {
        return res.status(503).json({
          error: 'Sentry DSN not configured',
          message: 'Set SENTRY_DSN environment variable to enable Sentry error tracking',
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        // Import Sentry to manually capture the error
        const Sentry = await import('@sentry/node');
        
        // Create a test error
        const testError = new Error('My first Sentry error!');
        
        // Manually capture the error to Sentry (ensures it's sent)
        const eventId = Sentry.captureException(testError, {
          tags: {
            test: 'true',
            endpoint: '/debug-sentry',
            environment: process.env.NODE_ENV || 'unknown'
          },
          extra: {
            requestPath: req.path,
            requestMethod: req.method,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
          }
        });
        
        // Also set status for error handler
        (testError as any).status = 500;
        
        // Return response with event ID so user knows it was sent
        res.status(500).json({
          error: 'Test error sent to Sentry',
          message: testError.message,
          sentryEventId: eventId,
          note: 'Check your Sentry dashboard to verify the error was received',
          timestamp: new Date().toISOString()
        });
        
        // Also pass to error handler (for logging, etc.)
        next(testError);
      } catch (error) {
        // If Sentry import fails, just throw the error normally
        const testError = new Error('My first Sentry error!');
        (testError as any).status = 500;
        next(testError);
      }
    };

    // Apply authentication in production if explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SENTRY_DEBUG === 'true') {
      this.app.get('/debug-sentry', authenticateMiddleware, debugSentryHandler);
    } else {
      this.app.get('/debug-sentry', debugSentryHandler);
    }

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const mongoose = require('mongoose');
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        const memUsage = process.memoryUsage();
        // Get actual heap limit from V8 for accurate memory reporting
        const v8 = require('v8');
        const heapStats = v8.getHeapStatistics();
        const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
        const heapAllocatedMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapUsagePercentOfLimit = (memUsage.heapUsed / heapStats.heap_size_limit) * 100;
        
        // Check Redis connection directly (not through job queue)
        let redisStatus = 'disconnected';
        let redisLatency: number | null = null;
        try {
          const redisHealth = await redisClusterService.healthCheck();
          // If we got a latency measurement, Redis is connected (even if healthy is false due to other issues)
          if (redisHealth.latency > 0) {
            redisStatus = redisHealth.healthy ? 'connected' : 'degraded';
            redisLatency = redisHealth.latency;
          } else {
            redisStatus = 'disconnected';
          }
        } catch (error) {
          // Redis check failed, status remains 'disconnected'
          logger.debug('Redis health check failed in /health endpoint:', { error });
        }
        
        // Check queue health (separate from Redis - requires bull package)
        let queueHealth: { healthy: boolean; error?: string } = { healthy: false, error: 'Queue not initialized' };
        try {
          queueHealth = await jobQueueAdapter.checkHealth();
        } catch (error) {
          // Queue health check failed (bull not installed or other error)
          logger.debug('Queue health check failed in /health endpoint:', { error });
          queueHealth = { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
        const queueMetrics = queueHealthService.getMetrics();
        
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          services: {
            mongodb: mongoStatus,
            redis: redisStatus,
            redisLatency: redisLatency !== null && redisLatency > 0 ? `${redisLatency}ms` : null,
            jobQueue: queueHealth.healthy ? 'healthy' : 'unhealthy',
            memory: {
              used: `${heapUsedMB} MB`,
              allocated: `${heapAllocatedMB} MB`,
              limit: `${heapLimitMB} MB`,
              usagePercentOfLimit: `${heapUsagePercentOfLimit.toFixed(1)}%`
            }
          },
          queue: queueMetrics ? {
            depth: queueMetrics.queueDepth,
            active: queueMetrics.activeJobs,
            waiting: queueMetrics.waitingJobs,
            failed: queueMetrics.failedJobs,
            processingRate: queueMetrics.processingRate,
            failureRate: queueMetrics.failureRate,
            healthy: queueMetrics.isHealthy
          } : null
        });
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Enhanced metrics endpoint with authentication in production
    const metricsAuthMiddleware: RequestHandler = process.env.NODE_ENV === 'production' 
      ? authenticateMiddleware 
      : (req, res, next) => next();
    
    this.app.get('/metrics', 
      metricsAuthMiddleware,
      async (req, res) => {
        try {
          const health = await monitoringService.getSystemHealth();
          const metrics = monitoringService.getMetrics();
          const alerts = monitoringService.getActiveAlerts();
          
          res.json({
            status: health.status,
            timestamp: new Date().toISOString(),
            metrics: metrics.slice(-100), // Last 100 metrics
            alerts,
            system: health
          });
        } catch (error) {
          res.status(500).json({
            error: 'Failed to get metrics',
            timestamp: new Date().toISOString()
          });
        }
      }
    );

    // Memory diagnostics endpoint - shows real memory health analysis
    this.app.get('/health/memory', async (req, res) => {
      try {
        const { memoryMonitorService } = await import('../../observability');
        const memUsage = process.memoryUsage();
        const v8 = require('v8');
        const heapStats = v8.getHeapStatistics();
        const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
        const heapAllocatedMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const rssMB = Math.round(memUsage.rss / 1024 / 1024);
        const externalMB = Math.round(memUsage.external / 1024 / 1024);
        
        // Get comprehensive memory report
        const memoryReport = memoryMonitorService.getMemoryReport();
        const leakDetection = memoryMonitorService.getLeakDetection();
        const currentStats = memoryMonitorService.getCurrentStats();
        
        // Calculate percentages
        const heapUsagePercentOfAllocated = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        const heapUsagePercentOfLimit = (memUsage.heapUsed / heapStats.heap_size_limit) * 100;
        const heapGrowthPotential = heapLimitMB - heapAllocatedMB;
        
        // Determine if this is a real problem or just display issue
        const isRealProblem = heapAllocatedMB >= 500 || heapUsagePercentOfLimit > 80 || leakDetection.isLeakDetected;
        const isDisplayIssue = heapAllocatedMB < 500 && heapGrowthPotential > 200 && heapUsagePercentOfLimit < 20;
        
        // Calculate growth trend if we have history
        let growthTrend = 'stable';
        let growthRateMBPerMin = 0;
        if (currentStats && memoryReport.leakDetection.samples.length >= 2) {
          const samples = memoryReport.leakDetection.samples;
          const oldest = samples[0];
          const newest = samples[samples.length - 1];
          const durationMinutes = (newest.timestamp - oldest.timestamp) / (1000 * 60);
          growthRateMBPerMin = durationMinutes > 0 ? (newest.heapUsed - oldest.heapUsed) / durationMinutes : 0;
          
          if (growthRateMBPerMin > 5) {
            growthTrend = 'increasing (potential leak)';
          } else if (growthRateMBPerMin > 1) {
            growthTrend = 'slowly increasing';
          } else if (growthRateMBPerMin < -1) {
            growthTrend = 'decreasing (GC active)';
          } else {
            growthTrend = 'stable';
          }
        }
        
        res.json({
          timestamp: new Date().toISOString(),
          assessment: {
            isRealProblem,
            isDisplayIssue,
            verdict: isRealProblem 
              ? '⚠️ Real memory concern detected' 
              : isDisplayIssue 
              ? '✅ Normal - just a display calculation issue' 
              : '✅ Healthy',
            explanation: isDisplayIssue
              ? `Heap is small (${heapAllocatedMB}MB) but has room to grow (${heapGrowthPotential}MB available). The "95%" is misleading - you're only using ${heapUsagePercentOfLimit.toFixed(1)}% of your actual ${heapLimitMB}MB limit.`
              : isRealProblem
              ? `Memory usage is genuinely high: ${heapUsagePercentOfLimit.toFixed(1)}% of limit used, or heap is large (${heapAllocatedMB}MB) with high usage.`
              : 'Memory usage is within normal parameters.'
          },
          current: {
            heapUsed: `${heapUsedMB} MB`,
            heapAllocated: `${heapAllocatedMB} MB`,
            heapLimit: `${heapLimitMB} MB`,
            rss: `${rssMB} MB`,
            external: `${externalMB} MB`,
            heapUsagePercentOfAllocated: `${heapUsagePercentOfAllocated.toFixed(1)}%`,
            heapUsagePercentOfLimit: `${heapUsagePercentOfLimit.toFixed(1)}%`,
            heapGrowthPotential: `${heapGrowthPotential} MB`
          },
          trends: {
            growthRate: `${growthRateMBPerMin.toFixed(2)} MB/min`,
            trend: growthTrend,
            leakDetected: leakDetection.isLeakDetected,
            samplesAnalyzed: memoryReport.leakDetection.samples.length
          },
          thresholds: {
            warning: '512 MB',
            critical: '1024 MB',
            maxHeapUsagePercent: '95%',
            leakThreshold: '5 MB/min growth'
          },
          recommendations: memoryReport.recommendations.length > 0 
            ? memoryReport.recommendations 
            : ['Memory usage is healthy. No action needed.'],
          alerts: memoryReport.recentAlerts.map(alert => ({
            level: alert.level,
            message: alert.message,
            currentUsage: alert.currentUsage,
            threshold: alert.threshold,
            timestamp: alert.timestamp,
            suggestion: alert.suggestion
          }))
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to get memory diagnostics',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Database index management endpoint (protected in production)
    this.app.post('/health/indexes/create', 
      metricsAuthMiddleware,
      async (req, res) => {
        try {
          const { databaseOptimizationService } = await import('../../database/features/indexOptimization.service');
          
          logger.info('Creating missing database indexes...');
          const result = await databaseOptimizationService.createMissingIndexes();
          
          res.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
              created: result.created,
              failed: result.failed,
              total: result.created + result.failed
            },
            details: result.details,
            note: result.failed === 0 
              ? 'All missing indexes created successfully' 
              : `${result.failed} indexes failed to create. Check details for errors.`
          });
        } catch (error: any) {
          logger.error('Failed to create indexes:', { error: error.message });
          res.status(500).json({
            success: false,
            error: 'Failed to create indexes',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    );

    // Database index report endpoint
    this.app.get('/health/indexes/report', async (req, res) => {
      try {
        const { databaseOptimizationService } = await import('../../database/features/indexOptimization.service');
        
        const report = await databaseOptimizationService.generateIndexReport();
        const missingTotal = report.items.reduce((sum, item) => sum + item.missingIndexes.length, 0);
        
        res.json({
          timestamp: new Date().toISOString(),
          summary: {
            totalMissing: missingTotal,
            collectionsChecked: report.items.length,
            collectionsWithMissingIndexes: report.items.filter(item => item.missingIndexes.length > 0).length
          },
          report: report.items.map(item => ({
            collection: item.collection,
            expected: item.expectedIndexes.length,
            existing: item.existingIndexes.length,
            missing: item.missingIndexes.length,
            missingIndexes: item.missingIndexes,
            existingIndexes: item.existingIndexes
          }))
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to generate index report',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Register all services in DI container before modules initialize
   */
  private async registerDIContainerServices(): Promise<void> {
    logger.info('📦 Registering services in DI container...');
    
    // Import and call the service registration function
    const { registerAllDIContainerServices } = await import('../../dependency-injection/core/serviceRegistration.service');
    registerAllDIContainerServices();
  }

  /**
   * Register all feature modules
   */
  private async registerFeatureModules(): Promise<void> {
    logger.info('📦 Registering feature modules...');

    // Register all modules
    moduleRegistry.registerAll([
      new AuthModule(),
      new UsersModule(),
      new ManufacturersModule(),
      new BrandsModule(),
      new SupplyChainModule(),
      new AnalyticsModule(),
      new CertificatesModule(),
      new IntegrationsModule(),
      new ProductsModule(),
      new VotesModule(),
      new SubscriptionsModule(),
      new NotificationsModule(),
      new SecurityModule(),
      new DomainsModule(),
      new MediaModule(),
      new NftModule()
    ]);

    // Initialize all modules (validates dependencies, registers routes)
    await moduleRegistry.initializeModules(this.app);
  }

  /**
   * Setup global API middleware that applies to all API routes
   */
  private setupGlobalApiMiddleware(): void {
    // Plan cache warmup for authenticated users
    // warmupPlanCache returns an async middleware, which Express handles automatically
    const warmupMiddleware = warmupPlanCache();
    this.app.use(warmupMiddleware as RequestHandler);

    // Protected API routes with authentication and rate limiting
    this.app.use('/api', 
      authenticateMiddleware, 
      dynamicRateLimiter(),
      cleanupOnErrorMiddleware
    );
  }

  /**
   * Setup static file routes
   */
  private setupStaticRoutes(): void {
    // ACME challenge support
    this.app.use('/.well-known/acme-challenge', 
      express.static(path.join(process.cwd(), '.well-known', 'acme-challenge'))
    );

    // Uploaded files
    const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
    this.app.use('/uploads', 
      express.static(path.resolve(__dirname, '../../../../', UPLOAD_DIR), {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
          if (path.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
          }
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
        }
      })
    );
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Sentry error handler (configured via monitoring middleware)
    configureSentryErrorHandler(this.app);

    // Global error handler (imported from modular middleware)
    // Error handlers have signature: (err, req, res, next) => void
    this.app.use(errorHandler as ErrorRequestHandler);
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    logger.info('📊 Starting monitoring services...');

    // Start system metrics collection
    setInterval(() => {
      monitoringService.recordSystemMetrics();
    }, 30000); // Every 30 seconds

    // Start circuit breaker metrics collection
    setInterval(() => {
      const stats = circuitBreakerManager.getAllStats();
      monitoringService.recordCircuitBreakerMetrics(stats);
    }, 60000); // Every minute

    logger.info('✅ Monitoring services started');
  }

  /**
   * Start queue health monitoring
   */
  private startQueueHealthMonitoring(): void {
    // Logging is handled by queueHealthService.start()
    queueHealthService.start();
  }

}
