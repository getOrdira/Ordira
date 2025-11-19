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

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const mongoose = require('mongoose');
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        const memUsage = process.memoryUsage();
        
        // Check Redis connection directly (not through job queue)
        let redisStatus = 'disconnected';
        let redisLatency = 0;
        try {
          const redisHealth = await redisClusterService.healthCheck();
          redisStatus = redisHealth.healthy ? 'connected' : 'disconnected';
          redisLatency = redisHealth.latency;
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
            redisLatency: redisLatency > 0 ? `${redisLatency}ms` : null,
            jobQueue: queueHealth.healthy ? 'healthy' : 'unhealthy',
            memory: {
              used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
              total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
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
