/**
 * Application Bootstrap Service
 * 
 * Handles the initialization and configuration of the Express application
 * with proper dependency injection and service registration.
 */

import express, { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger'; 
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import path from 'path';

import { configService } from './config.service';
import { container, SERVICE_TOKENS } from './di-container.service';
import { monitoringService } from '../external/monitoring.service';
import { securityScanService } from '../external/security-scan.service';
import { circuitBreakerManager } from '../external/circuit-breaker.service';

export class AppBootstrapService {
  private app: Application;

  constructor() {
    this.app = express();
  }

  /**
   * Initialize the Express application
   */
  async initialize(): Promise<Application> {
    logger.info('🚀 Initializing Ordira Platform...');

    // Register services in DI container
    await this.registerServices();

    // Configure Express app
    this.configureExpress();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();

    // Start monitoring
    this.startMonitoring();

    logger.info('✅ Application initialization completed');
    return this.app;
  }

  /**
   * Register services in the DI container
   */
  private async registerServices(): Promise<void> {
    logger.info('📦 Registering services in DI container...');

    // Register configuration service
    container.registerInstance(SERVICE_TOKENS.CONFIG_SERVICE, configService);

    // Register external services
    const { cacheService } = await import('../external/cache.service');
    const { databaseService } = await import('../external/database.service');
    const { performanceService } = await import('../external/performance.service');
    const { S3Service } = await import('../external/s3.service');

    container.registerInstance(SERVICE_TOKENS.CACHE_SERVICE, cacheService);
    container.registerInstance(SERVICE_TOKENS.DATABASE_SERVICE, databaseService);
    container.registerInstance(SERVICE_TOKENS.PERFORMANCE_SERVICE, performanceService);
    container.registerInstance(SERVICE_TOKENS.S3_SERVICE, new S3Service());

    // Register business services
    const { authService } = await import('../auth/index');
    const { securityService } = await import('../business/security.service');
    const { tenantService } = await import('../business/tenant.service');
    const { UtilsService } = await import('./utils.service');

    container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, authService);
    container.registerInstance(SERVICE_TOKENS.SECURITY_SERVICE, securityService);
    container.registerInstance(SERVICE_TOKENS.TENANT_SERVICE, tenantService);
    container.registerInstance(SERVICE_TOKENS.UTILS_SERVICE, new UtilsService());

    // Register models
    const { User } = await import('../../models/user.model');
    const { Business } = await import('../../models/business.model');
    const { Manufacturer } = await import('../../models/manufacturer.model');
    const { BrandSettings } = await import('../../models/brandSettings.model');
    const { VotingRecord } = await import('../../models/votingRecord.model');
    const { Certificate } = await import('../../models/certificate.model');
    const { SecurityEventModel } = await import('../../models/securityEvent.model');
    const { ActiveSessionModel } = await import('../../models/activeSession.model');
    const { BlacklistedTokenModel } = await import('../../models/blacklistedToken.model');

    container.registerInstance(SERVICE_TOKENS.USER_MODEL, User);
    container.registerInstance(SERVICE_TOKENS.BUSINESS_MODEL, Business);
    container.registerInstance(SERVICE_TOKENS.MANUFACTURER_MODEL, Manufacturer);
    container.registerInstance(SERVICE_TOKENS.BRAND_SETTINGS_MODEL, BrandSettings);
    container.registerInstance(SERVICE_TOKENS.VOTING_RECORD_MODEL, VotingRecord);
    container.registerInstance(SERVICE_TOKENS.CERTIFICATE_MODEL, Certificate);
    container.registerInstance(SERVICE_TOKENS.SECURITY_EVENT_MODEL, SecurityEventModel);
    container.registerInstance(SERVICE_TOKENS.ACTIVE_SESSION_MODEL, ActiveSessionModel);
    container.registerInstance(SERVICE_TOKENS.BLACKLISTED_TOKEN_MODEL, BlacklistedTokenModel);

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
    } = await import('../supplyChain');

    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY,
      SupplyChainServicesRegistry.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_DEPLOYMENT_SERVICE,
      DeploymentService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_ASSOCIATION_SERVICE,
      AssociationService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_READ_SERVICE,
      ContractReadService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE,
      ContractWriteService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_QR_CODE_SERVICE,
      SupplyChainQrCodeService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_DASHBOARD_SERVICE,
      SupplyChainDashboardService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_ANALYTICS_SERVICE,
      SupplyChainAnalyticsService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE,
      ProductLifecycleService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_VALIDATION_SERVICE,
      SupplyChainValidationService.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_MAPPERS,
      SupplyChainMappers.getInstance()
    );
    container.registerInstance(
      SERVICE_TOKENS.SUPPLY_CHAIN_LOG_SERVICE,
      LogParsingService.getInstance()
    );

    logger.info('✅ Services registered in DI container');
  }

  /**
   * Configure Express application settings
   */
  private configureExpress(): void {
    logger.info('⚙️ Configuring Express application...');

    // Trust proxy for accurate IP addresses behind load balancers
    this.app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

    // Set view engine if needed
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../../views'));

    logger.info('✅ Express application configured');
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    logger.info('🔧 Setting up middleware...');

    // Security middleware
    this.setupSecurityMiddleware();

    // Performance middleware
    this.setupPerformanceMiddleware();

    // Body parsing middleware
    this.setupBodyParsingMiddleware();

    // CORS middleware
    this.setupCorsMiddleware();

    // Monitoring middleware
    this.setupMonitoringMiddleware();

    logger.info('✅ Middleware setup completed');
  }

  /**
   * Setup security middleware
   */
  private setupSecurityMiddleware(): void {
    // Helmet security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https:", "wss:"],
          mediaSrc: ["'self'", "https:", "blob:"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          workerSrc: ["'self'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // MongoDB sanitization
    this.app.use(mongoSanitize());
  }

  /**
   * Setup performance middleware
   */
  private setupPerformanceMiddleware(): void {
    // Enhanced Compression with optimized settings
    this.app.use(compression({
      level: 6,                    // Compression level (1-9, 6 is good balance)
      threshold: 100 * 1024,       // Only compress responses > 100KB
      memLevel: 8,                 // Memory level (1-9, 8 is default)
      windowBits: 15,              // Window size
      chunkSize: 16 * 1024,        // 16KB chunks
      filter: (req, res) => {
        // Don't compress if explicitly disabled
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Don't compress responses that are already compressed
        const contentEncoding = res.getHeader('Content-Encoding');
        if (contentEncoding) {
          return false;
        }

        // Don't compress certain content types
        const contentType = res.getHeader('Content-Type');
        if (contentType) {
          const type = contentType.toString().toLowerCase();
          const excludeTypes = [
            'image/',
            'video/',
            'audio/',
            'application/zip',
            'application/gzip',
            'application/x-compressed',
            'application/pdf'
          ];

          if (excludeTypes.some(excludeType => type.includes(excludeType))) {
            return false;
          }
        }

        // Use built-in filter for everything else
        return compression.filter(req, res);
      }
    }));

    // Performance monitoring with additional metrics
    this.app.use((req, res, next) => {
      const start = Date.now();
      const startMem = process.memoryUsage().heapUsed;

      // Add request ID for tracking
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', requestId);

      res.on('finish', () => {
        const duration = Date.now() - start;
        const endMem = process.memoryUsage().heapUsed;
        const memoryDelta = endMem - startMem;

        // Record HTTP metrics
        monitoringService.recordHttpMetrics(
          req.method,
          req.path,
          res.statusCode,
          duration
        );

        // Record additional performance metrics
        monitoringService.recordMetric({
          name: 'http_request_memory_delta',
          value: memoryDelta,
          tags: {
            method: req.method,
            status_code: res.statusCode.toString(),
            path: req.path
          }
        });

        // Log slow requests
        if (duration > 1000) {
          logger.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`, {
            requestId,
            duration,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        }

        // Log memory-intensive requests
        if (memoryDelta > 50 * 1024 * 1024) { // > 50MB
          logger.warn(`Memory-intensive request: ${req.method} ${req.path} - ${Math.round(memoryDelta / 1024 / 1024)}MB`, {
            requestId,
            memoryDelta: Math.round(memoryDelta / 1024 / 1024),
            method: req.method,
            path: req.path
          });
        }
      });

      next();
    });

    // Response time header
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);

        // Add performance hints
        if (duration > 2000) {
          res.setHeader('X-Performance-Warning', 'Very slow response');
        } else if (duration > 1000) {
          res.setHeader('X-Performance-Warning', 'Slow response');
        }
      });
      next();
    });
  }

  /**
   * Setup body parsing middleware
   */
  private setupBodyParsingMiddleware(): void {
    // JSON parsing with size limits
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req: any, res, buf) => {
        // Store raw body for webhook signature verification
        if (req.url?.includes('/webhook')) {
          req.rawBody = buf;
        }
      }
    }));

    // URL encoded parsing
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Raw body handling for webhook endpoints
    const webhookPaths = [
      '/api/integrations/shopify/webhook',
      '/api/integrations/woocommerce/webhook',
      '/api/integrations/wix/webhook',
      '/api/billing/webhook'
    ];
    
    webhookPaths.forEach(path => {
      this.app.use(path, express.raw({ type: 'application/json', limit: '1mb' }));
    });
  }

  /**
   * Setup CORS middleware
   */
  private setupCorsMiddleware(): void {
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests without origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Validate origin format first
        if (!this.isValidOriginFormat(origin)) {
          logger.warn('⚠️ CORS blocked invalid origin format: ${origin}');
          return callback(new Error(`Invalid origin format: ${origin}`));
        }
        
        // Allow configured frontend URL
        if (origin === process.env.FRONTEND_URL) return callback(null, true);
        
        // Strict localhost validation for development only
        if (process.env.NODE_ENV === 'development' && this.isValidLocalhostOrigin(origin)) {
          return callback(null, true);
        }
        
        // Production: Require HTTPS for all custom domains
        if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) {
          logger.warn('⚠️ CORS blocked non-HTTPS origin in production: ${origin}');
          return callback(new Error(`HTTPS required in production: ${origin}`));
        }
        
        // Check against cached custom domains
        const { isAllowedCustomDomain } = require('../../cache/domainCache');
        if (isAllowedCustomDomain(origin)) {
          if (this.isValidCustomDomain(origin)) {
            return callback(null, true);
          } else {
            logger.warn('⚠️ CORS blocked invalid custom domain: ${origin}');
            return callback(new Error(`Invalid custom domain: ${origin}`));
          }
        }
        
        // Block unauthorized origins
        logger.warn('⚠️ CORS blocked unauthorized origin: ${origin}');
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
        'Authorization', 'Cache-Control', 'Pragma', 'X-Tenant-ID',
        'X-Device-Fingerprint', 'X-API-Key'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      optionsSuccessStatus: 200 // For legacy browser support
    }));
  }

  /**
   * Setup monitoring middleware
   */
  private setupMonitoringMiddleware(): void {
    // Sentry monitoring
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express({ app: this.app }),
          new Tracing.Integrations.Mongo()
        ]
      });
      
      this.app.use(Sentry.Handlers.requestHandler());
      this.app.use(Sentry.Handlers.tracingHandler());
      logger.info('✅ Sentry monitoring initialized');
    }
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    logger.info('🛣️ Setting up routes...');

    // Health check routes
    this.setupHealthRoutes();

    // API routes
    this.setupApiRoutes();

    // Static file serving
    this.setupStaticRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn('⚠️ Route not found: ${req.method} ${req.originalUrl}');
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
        
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          services: {
            mongodb: mongoStatus,
            memory: {
              used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
              total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
            }
          }
        });
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
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
    });
  }

  /**
   * Setup API routes
   */
  private setupApiRoutes(): void {
    // Import route modules
    const authRoutes = require('../../routes/auth.routes');
    const userRoutes = require('../../routes/user.routes');
    const manufacturerRoutes = require('../../routes/manufacturer.routes');
    const productRoutes = require('../../routes/products.routes');
    const brandSettingsRoutes = require('../../routes/brandSettings.routes');
    const votesRoutes = require('../../routes/votes.routes');
    const nftsRoutes = require('../../routes/nfts.routes');
    const analyticsRoutes = require('../../routes/analytics.routes');
    const certificateRoutes = require('../../routes/certificate.routes');

    // Setup route middleware
    const { resolveTenant, requireTenantSetup, requireTenantPlan, tenantCorsMiddleware } = require('../../middleware/tenant.middleware');
    const { authenticate } = require('../../middleware/unifiedAuth.middleware');
    const { dynamicRateLimiter, strictRateLimiter } = require('../../middleware/rateLimiter.middleware');

    // Public routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/manufacturer', manufacturerRoutes);

    // Protected routes
    this.app.use('/api', authenticate, dynamicRateLimiter());

    // Tenant-specific routes
    this.app.use('/api/brand', resolveTenant, tenantCorsMiddleware);
    this.app.use('/api/tenant', resolveTenant, tenantCorsMiddleware);

    // Feature-specific routes
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/brand-settings', requireTenantSetup, brandSettingsRoutes);
    this.app.use('/api/votes', requireTenantPlan(['growth', 'premium', 'enterprise']), votesRoutes);
    this.app.use('/api/nfts', requireTenantPlan(['premium', 'enterprise']), nftsRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/certificates', requireTenantSetup, certificateRoutes);
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
      express.static(path.resolve(__dirname, '../../', UPLOAD_DIR), {
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
    // Sentry error handler
    if (process.env.SENTRY_DSN) {
      this.app.use(Sentry.Handlers.errorHandler({
        shouldHandleError: (error: any) => {
          return Number(error.status) >= 500;
        }
      }));
    }

    // Global error handler
    const { errorHandler } = require('../../middleware/error.middleware');
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
   * Validate origin format
   */
  private isValidOriginFormat(origin: string): boolean {
    try {
      const url = new URL(origin);
      return ['http:', 'https:'].includes(url.protocol) && 
             url.hostname.length > 0 && 
             url.hostname.length <= 253;
    } catch {
      return false;
    }
  }

  /**
   * Validate localhost origin
   */
  private isValidLocalhostOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);
      const allowedHosts = ['localhost', '127.0.0.1', '::1'];
      const allowedPorts = ['3000', '3001', '4000', '5000', '8000', '8080'];
      
      return allowedHosts.includes(url.hostname) && 
             (url.port === '' || allowedPorts.includes(url.port));
    } catch {
      return false;
    }
  }

  /**
   * Validate custom domain
   */
  private isValidCustomDomain(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname.toLowerCase();
      
      const blockedPatterns = [
        /^[0-9]/, /\.\./, /[^a-z0-9.-]/, /^-/, /-$/, /^\./, /\.$/
      ];
      
      for (const pattern of blockedPatterns) {
        if (pattern.test(hostname)) {
          return false;
        }
      }
      
      if (!hostname.includes('.')) {
        return false;
      }
      
      const labels = hostname.split('.');
      for (const label of labels) {
        if (label.length === 0 || label.length > 63) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

}
