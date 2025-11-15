/**
 * Application Bootstrap Service
 * 
 * Handles the initialization and configuration of the Express application
 * with proper dependency injection and service registration.
 */

import express, { Application } from 'express';
import { logger } from '../../logging'; 
import path from 'path';

import { configService } from '../../config/core/config.service';
import { container, SERVICE_TOKENS, Container } from '../../dependency-injection';
// Note: 'container' is the tsyringe container, 'Container' is the utility wrapper class
import { 
  serviceModuleRegistry,
  AuthServiceModule,
  BusinessServiceModule,
  InfrastructureServiceModule,
  SupplyChainServiceModule
} from '../../dependency-injection/modules';
import { monitoringService } from '../../../external/monitoring.service';
import { circuitBreakerManager } from '../../../external/circuit-breaker.service';
import { initializeOpenTelemetry, setupPrometheusEndpoint } from '../../observability';
import { queueHealthService, jobQueueAdapter } from '../../resilience';

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

    // Initialize OpenTelemetry (must be done early, before other services)
    await this.initializeOpenTelemetry();

    // Register services in DI container
    await this.registerServices();

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
      logger.info('🔧 Initializing OpenTelemetry...');

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
   * Register services in the DI container using tsyringe and module registry
   */
  private async registerServices(): Promise<void> {
    logger.info('📦 Registering services in DI container (tsyringe)...');

    // Register core infrastructure services as instances (these are already instantiated)
    Container.registerInstance(SERVICE_TOKENS.CONFIG_SERVICE, configService);

    // Register infrastructure services
    const { cacheStoreService } = await import('../../cache');
    const { databaseService } = await import('../../database');
    const { performanceService } = await import('../../observability');
    const { S3Service } = await import('../../../media');

    Container.registerInstance(SERVICE_TOKENS.CACHE_SERVICE, cacheStoreService);
    Container.registerInstance(SERVICE_TOKENS.DATABASE_SERVICE, databaseService);
    Container.registerInstance(SERVICE_TOKENS.PERFORMANCE_SERVICE, performanceService);
    Container.registerInstance(SERVICE_TOKENS.S3_SERVICE, S3Service);

    // Register business services as instances (for now, can be migrated to @injectable later)
    const { authService } = await import('../../../auth/index');
    const { securityService } = await import('../../../business/security.service');
    const { tenantService } = await import('../../../business/tenant.service');
    const { UtilsService } = await import('../../shared/core/utils.service');

    Container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, authService);
    Container.registerInstance(SERVICE_TOKENS.SECURITY_SERVICE, securityService);
    Container.registerInstance(SERVICE_TOKENS.TENANT_SERVICE, tenantService);
    Container.registerInstance(SERVICE_TOKENS.UTILS_SERVICE, new UtilsService());

    // Register models
    const { User } = await import('../../../../models/user/user.model');
    const { Manufacturer } = await import('../../../../models/manufacturer/manufacturer.model');
    const { BrandSettings } = await import('../../../../models/brands/brandSettings.model');
    const { VotingRecord } = await import('../../../../models/voting/votingRecord.model');
    const { Certificate } = await import('../../../../models/certificates/certificate.model');
    const { SecurityEventModel } = await import('../../../../models/security/securityEvent.model');
    const { ActiveSessionModel } = await import('../../../../models/security/activeSession.model');
    const { BlacklistedTokenModel } = await import('../../../../models/security/blacklistedToken.model');

    Container.registerInstance(SERVICE_TOKENS.USER_MODEL, User);
    Container.registerInstance(SERVICE_TOKENS.MANUFACTURER_MODEL, Manufacturer);
    Container.registerInstance(SERVICE_TOKENS.BRAND_SETTINGS_MODEL, BrandSettings);
    Container.registerInstance(SERVICE_TOKENS.VOTING_RECORD_MODEL, VotingRecord);
    Container.registerInstance(SERVICE_TOKENS.CERTIFICATE_MODEL, Certificate);
    Container.registerInstance(SERVICE_TOKENS.SECURITY_EVENT_MODEL, SecurityEventModel);
    Container.registerInstance(SERVICE_TOKENS.ACTIVE_SESSION_MODEL, ActiveSessionModel);
    Container.registerInstance(SERVICE_TOKENS.BLACKLISTED_TOKEN_MODEL, BlacklistedTokenModel);

    const {
      SupplyChainServicesRegistry,
      DeploymentService,
      AssociationService,
      ContractReadService,
      ContractWriteService,
      SupplyChainQrCodeService,
      SupplyChainDashboardService,
      SupplyChainAnalyticsService,
      ProductLifecycleService,
      SupplyChainValidationService,
      SupplyChainMappers,
      LogParsingService
    } = await import('../../../supplyChain');

    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY,
      SupplyChainServicesRegistry.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_DEPLOYMENT_SERVICE,
      DeploymentService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_ASSOCIATION_SERVICE,
      AssociationService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_READ_SERVICE,
      ContractReadService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE,
      ContractWriteService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_QR_CODE_SERVICE,
      SupplyChainQrCodeService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_DASHBOARD_SERVICE,
      SupplyChainDashboardService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_ANALYTICS_SERVICE,
      SupplyChainAnalyticsService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE,
      ProductLifecycleService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_VALIDATION_SERVICE,
      SupplyChainValidationService.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_MAPPERS,
      SupplyChainMappers.getInstance()
    );
    Container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_LOG_SERVICE,
      LogParsingService.getInstance()
    );

    // Register service modules using module registry
    logger.info('📦 Registering service modules...');
    serviceModuleRegistry.registerAll([
      new InfrastructureServiceModule(),
      new AuthServiceModule(),
      new BusinessServiceModule(),
      new SupplyChainServiceModule()
    ]);

    // Register and initialize all modules
    await serviceModuleRegistry.registerAllModules(container);
    await serviceModuleRegistry.initializeAll(container);

    logger.info('✅ Services registered in DI container');
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
        
        // Check queue health
        const queueHealth = await jobQueueAdapter.checkHealth();
        const queueMetrics = queueHealthService.getMetrics();
        
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          services: {
            mongodb: mongoStatus,
            redis: queueHealth.healthy ? 'connected' : 'disconnected',
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
    this.app.get('/metrics', 
      process.env.NODE_ENV === 'production' ? authenticate : (req, res, next) => next(),
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
    this.app.use(warmupPlanCache());

    // Protected API routes with authentication and rate limiting
    this.app.use('/api', 
      authenticate, 
      dynamicRateLimiter(),
      cleanupOnError
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
    this.app.use(errorHandler);
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
    logger.info('📊 Starting queue health monitoring...');
    queueHealthService.start();
    logger.info('✅ Queue health monitoring started');
  }

}
