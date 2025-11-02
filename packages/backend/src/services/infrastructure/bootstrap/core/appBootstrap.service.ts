/**
 * Application Bootstrap Service
 * 
 * Handles the initialization and configuration of the Express application
 * with proper dependency injection and service registration.
 */

import express, { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { logger } from '../../logging'; 
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import path from 'path';

import { configService } from '../../config/core/config.service';
import { container, SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { monitoringService } from '../../../external/monitoring.service';
import { securityScanService } from '../../../external/security-scan.service';
import { circuitBreakerManager } from '../../../external/circuit-breaker.service';

import {
  // Core middleware
  loggingMiddleware,
  productionLoggingMiddleware,
  developmentLoggingMiddleware,
  errorHandler,
  
  // Security middleware
  productionCorsMiddleware,
  developmentCorsMiddleware,
  webhookMiddleware,
  
  // Performance middleware
  metricsMiddleware,
  performanceMiddleware,
  cacheMiddleware,
  trackManufacturerAction,
  trackBrandConnection,
  
  // Auth middleware
  authenticate,
  requireManufacturer,
  requireBrandAccess,
  requireVerifiedManufacturer,
  
  // Tenant middleware
  resolveTenant,
  requireTenantSetup,
  requireTenantPlan,
  tenantCorsMiddleware,
  
  // Rate limiting
  dynamicRateLimiter,
  strictRateLimiter,
  apiRateLimiter,
  warmupPlanCache,
  clearPlanCache,
  
  // Upload middleware
  uploadMiddleware,
  cleanupOnError,
  validateUploadOrigin
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
    logger.info('ðŸš€ Initializing Ordira Platform...');

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

    logger.info('âœ… Application initialization completed');
    return this.app;
  }

  /**
   * Register services in the DI container
   */
  private async registerServices(): Promise<void> {
    logger.info('ðŸ“‹ Registering services in DI container...');

    // Register configuration service
    container.registerInstance(SERVICE_TOKENS.CONFIG_SERVICE, configService);

    // Register external services
    const { cacheService } = await import('../../../external/cache.service');
    const { databaseService } = await import('../../../external/database.service');
    const { performanceService } = await import('../../../external/performance.service');
    const { S3Service } = await import('../../../external/s3.service');

    container.registerInstance(SERVICE_TOKENS.CACHE_SERVICE, cacheService);
    container.registerInstance(SERVICE_TOKENS.DATABASE_SERVICE, databaseService);
    container.registerInstance(SERVICE_TOKENS.PERFORMANCE_SERVICE, performanceService);
    container.registerInstance(SERVICE_TOKENS.S3_SERVICE, new S3Service());

    // Register business services
    const { authService } = await import('../../../auth/index');
    const { securityService } = await import('../../../business/security.service');
    const { tenantService } = await import('../../../business/tenant.service');
    const { UtilsService } = await import('../../shared/core/utils.service');

    container.registerInstance(SERVICE_TOKENS.AUTH_SERVICE, authService);
    container.registerInstance(SERVICE_TOKENS.SECURITY_SERVICE, securityService);
    container.registerInstance(SERVICE_TOKENS.TENANT_SERVICE, tenantService);
    container.registerInstance(SERVICE_TOKENS.UTILS_SERVICE, new UtilsService());

    // Register models
    const { User } = await import('../../../../models/deprecated/user.model');
    const { Business } = await import('../../../../models/deprecated/business.model');
    const { Manufacturer } = await import('../../../../models/manufacturer/manufacturer.model');
    const { BrandSettings } = await import('../../../../models/brands/brandSettings.model');
    const { VotingRecord } = await import('../../../../models/voting/votingRecord.model');
    const { Certificate } = await import('../../../../models/certificates/certificate.model');
    const { SecurityEventModel } = await import('../../../../models/deprecated/securityEvent.model');
    const { ActiveSessionModel } = await import('../../../../models/deprecated/activeSession.model');
    const { BlacklistedTokenModel } = await import('../../../../models/deprecated/blacklistedToken.model');

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
    } = await import('../../../supplyChain');

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

    logger.info('âœ… Services registered in DI container');
  }

  /**
   * Configure Express application settings
   */
  private configureExpress(): void {
    logger.info('âš™ï¸ Configuring Express application...');

    // Trust proxy for accurate IP addresses behind load balancers
    this.app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

    // Set view engine if needed
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../../../../views'));

    logger.info('âœ… Express application configured');
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    logger.info('ðŸ”§ Setting up middleware...');

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

    logger.info('âœ… Middleware setup completed');
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

    // Use modular logging middleware for request/response tracking
    const environment = process.env.NODE_ENV || 'development';
    
    if (environment === 'production') {
      this.app.use(productionLoggingMiddleware);
    } else {
      this.app.use(developmentLoggingMiddleware);
    }
    
    // Add Prometheus metrics tracking
    this.app.use(metricsMiddleware);
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
    // Use modular CORS middleware with environment-specific configuration
    const environment = process.env.NODE_ENV || 'development';
    
    if (environment === 'production') {
      this.app.use(productionCorsMiddleware);
    } else {
      this.app.use(developmentCorsMiddleware);
    }
    
    logger.info('âœ… CORS middleware configured');
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
      logger.info('âœ… Sentry monitoring initialized');
    }
  }

  /**
   * Setup routes
   */
  private async setupRoutes(): Promise<void> {
    logger.info('ðŸ›£ï¸ Setting up routes...');

    // Health check routes
    this.setupHealthRoutes();

    // API routes (now async)
    await this.setupApiRoutes();

    // Static file serving
    this.setupStaticRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      logger.warn(`âš ï¸ Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    logger.info('âœ… Routes setup completed');
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
   * Setup API routes
   */
  private async setupApiRoutes(): Promise<void> {
    logger.info('📦 Loading route modules...');

    // Import Express Router for combining modular routes
    const { Router } = await import('express');
    
    // Import all new modular route modules
    const [
      // Core routes
      { default: authRoutes },
      // User routes (modular)
      userRoutesModule,
      // Manufacturer routes (modular)
      manufacturerRoutesModule,
      // Product routes (modular)
      productRoutesModule,
      // Brand routes (modular)
      brandRoutesModule,
      // Vote routes (modular)
      voteRoutesModule,
      // Analytics routes (modular)
      analyticsRoutesModule,
      // Certificate routes (modular)
      certificateRoutesModule,
      // Integration routes (modular)
      integrationRoutesModule,
      // Domain routes (modular)
      domainRoutesModule,
      // Subscription/Billing routes (modular)
      subscriptionRoutesModule,
      // Notification routes (modular)
      notificationRoutesModule,
      // Security routes (modular)
      securityRoutesModule,
      // Supply Chain routes (modular)
      supplyChainRoutesModule,
      // Media routes (modular)
      mediaRoutesModule,
      // NFT routes (modular)
      nftRoutesModule
    ] = await Promise.all([
      // Core routes
      import('../../../../routes/core/auth.routes'),
      // Feature routes
      import('../../../../routes/features/users'),
      import('../../../../routes/features/manufacturers'),
      import('../../../../routes/features/products'),
      import('../../../../routes/features/brands'),
      import('../../../../routes/features/votes'),
      import('../../../../routes/features/analytics'),
      import('../../../../routes/features/certificates'),
      import('../../../../routes/integrations'),
      import('../../../../routes/features/domains'),
      import('../../../../routes/features/subscriptions'),
      import('../../../../routes/features/notifications'),
      import('../../../../routes/features/security'),
      import('../../../../routes/features/supplyChain'),
      // Media routes
      import('../../../../routes/features/media'),
      // NFT routes
      import('../../../../routes/features/nft')
    ]);

    // Combine modular routes into unified routers
    const userRoutes = Router();
    userRoutes.use('/', userRoutesModule.usersAuthRoutes);
    userRoutes.use('/', userRoutesModule.usersProfileRoutes);
    userRoutes.use('/', userRoutesModule.usersDataRoutes);
    userRoutes.use('/', userRoutesModule.usersSearchRoutes);
    userRoutes.use('/', userRoutesModule.usersAnalyticsRoutes);
    userRoutes.use('/', userRoutesModule.usersCacheRoutes);
    userRoutes.use('/', userRoutesModule.usersValidationRoutes);

    const manufacturerRoutes = Router();
    manufacturerRoutes.use('/', manufacturerRoutesModule.manufacturerDataRoutes);
    manufacturerRoutes.use('/account', manufacturerRoutesModule.manufacturerAccountRoutes);
    manufacturerRoutes.use('/profile', manufacturerRoutesModule.manufacturerProfileRoutes);
    manufacturerRoutes.use('/media', manufacturerRoutesModule.manufacturerMediaRoutes);
    manufacturerRoutes.use('/search', manufacturerRoutesModule.manufacturerSearchRoutes);
    manufacturerRoutes.use('/verification', manufacturerRoutesModule.manufacturerVerificationRoutes);
    manufacturerRoutes.use('/supply-chain', manufacturerRoutesModule.manufacturerSupplyChainRoutes);
    manufacturerRoutes.use('/comparison', manufacturerRoutesModule.manufacturerComparisonRoutes);
    manufacturerRoutes.use('/score', manufacturerRoutesModule.manufacturerScoreRoutes);
    manufacturerRoutes.use('/helpers', manufacturerRoutesModule.manufacturerHelpersRoutes);

    const productRoutes = Router();
    productRoutes.use('/', productRoutesModule.productsDataRoutes);
    productRoutes.use('/account', productRoutesModule.productsAccountRoutes);
    productRoutes.use('/analytics', productRoutesModule.productsAnalyticsRoutes);
    productRoutes.use('/aggregation', productRoutesModule.productsAggregationRoutes);
    productRoutes.use('/search', productRoutesModule.productsSearchRoutes);
    productRoutes.use('/validation', productRoutesModule.productsValidationRoutes);

    const brandSettingsRoutes = brandRoutesModule.brandSettingsRoutes;
    const brandProfilesRoutes = brandRoutesModule.brandProfileRoutes;
    const brandAccountRoutes = brandRoutesModule.brandAccountRoutes;

    const votesRoutes = Router();
    votesRoutes.use('/', voteRoutesModule.votesDataRoutes);
    votesRoutes.use('/contract', voteRoutesModule.votesContractRoutes);
    votesRoutes.use('/stats', voteRoutesModule.votesStatsRoutes);
    votesRoutes.use('/analytics', voteRoutesModule.votesAnalyticsRoutes);
    votesRoutes.use('/dashboard', voteRoutesModule.votesDashboardRoutes);
    votesRoutes.use('/proposals', voteRoutesModule.votesProposalsRoutes);
    votesRoutes.use('/proposals/management', voteRoutesModule.votesProposalManagementRoutes);
    votesRoutes.use('/deployment', voteRoutesModule.votesDeploymentRoutes);

    const analyticsRoutes = Router();
    analyticsRoutes.use('/platform', analyticsRoutesModule.analyticsPlatformDataRoutes);
    analyticsRoutes.use('/reporting', analyticsRoutesModule.analyticsReportingRoutes);
    analyticsRoutes.use('/dashboard', analyticsRoutesModule.analyticsDashboardRoutes);
    analyticsRoutes.use('/insights', analyticsRoutesModule.analyticsInsightsRoutes);
    analyticsRoutes.use('/reports', analyticsRoutesModule.analyticsReportGenerationRoutes);
    analyticsRoutes.use('/health', analyticsRoutesModule.analyticsSystemHealthRoutes);

    const certificateRoutes = Router();
    certificateRoutes.use('/', certificateRoutesModule.certificateDataRoutes);
    certificateRoutes.use('/account', certificateRoutesModule.certificateAccountRoutes);
    certificateRoutes.use('/minting', certificateRoutesModule.certificateMintingRoutes);
    certificateRoutes.use('/batch', certificateRoutesModule.certificateBatchRoutes);
    certificateRoutes.use('/helpers', certificateRoutesModule.certificateHelpersRoutes);
    certificateRoutes.use('/validation', certificateRoutesModule.certificateValidationRoutes);

    const integrationsRouter = Router();
    // Ecommerce integrations
    const ecommerceRouter = Router();
    ecommerceRouter.use('/data', integrationRoutesModule.ecommerceIntegrationDataRoutes);
    ecommerceRouter.use('/oauth', integrationRoutesModule.ecommerceOAuthRoutes);
    ecommerceRouter.use('/operations', integrationRoutesModule.ecommerceOperationsRoutes);
    ecommerceRouter.use('/webhooks', integrationRoutesModule.ecommerceWebhooksRoutes);
    ecommerceRouter.use('/health', integrationRoutesModule.ecommerceHealthRoutes);
    ecommerceRouter.use('/providers', integrationRoutesModule.ecommerceProvidersRoutes);
    ecommerceRouter.use('/shopify', integrationRoutesModule.shopifyRoutes);
    ecommerceRouter.use('/wix', integrationRoutesModule.wixRoutes);
    ecommerceRouter.use('/woocommerce', integrationRoutesModule.woocommerceRoutes);
    integrationsRouter.use('/ecommerce', ecommerceRouter);
    // Blockchain integrations
    integrationsRouter.use('/blockchain', integrationRoutesModule.blockchainIntegrationRoutes);
    // Domain integrations
    integrationsRouter.use('/domains', integrationRoutesModule.domainIntegrationRoutes);

    const domainMappingRoutes = Router();
    domainMappingRoutes.use('/registry', domainRoutesModule.domainRegistryRoutes);
    domainMappingRoutes.use('/verification', domainRoutesModule.domainVerificationRoutes);
    domainMappingRoutes.use('/dns', domainRoutesModule.domainDnsRoutes);
    domainMappingRoutes.use('/health', domainRoutesModule.domainHealthRoutes);
    domainMappingRoutes.use('/certificate', domainRoutesModule.domainCertificateLifecycleRoutes);
    domainMappingRoutes.use('/provisioner', domainRoutesModule.domainCertificateProvisionerRoutes);
    domainMappingRoutes.use('/storage', domainRoutesModule.domainStorageRoutes);
    domainMappingRoutes.use('/analytics', domainRoutesModule.domainAnalyticsRoutes);

    const billingRoutes = Router();
    billingRoutes.use('/data', subscriptionRoutesModule.subscriptionsDataRoutes);
    billingRoutes.use('/lifecycle', subscriptionRoutesModule.subscriptionsLifecycleRoutes);
    billingRoutes.use('/billing', subscriptionRoutesModule.subscriptionsBillingRoutes);
    billingRoutes.use('/usage', subscriptionRoutesModule.subscriptionsUsageRoutes);
    billingRoutes.use('/analytics', subscriptionRoutesModule.subscriptionsAnalyticsRoutes);
    billingRoutes.use('/plans', subscriptionRoutesModule.subscriptionsPlansRoutes);
    billingRoutes.use('/discounts', subscriptionRoutesModule.subscriptionsDiscountsRoutes);

    const notificationRoutes = Router();
    notificationRoutes.use('/', notificationRoutesModule.notificationsInboxRoutes);
    notificationRoutes.use('/preferences', notificationRoutesModule.notificationsPreferencesRoutes);
    notificationRoutes.use('/template', notificationRoutesModule.notificationsTemplateRoutes);
    notificationRoutes.use('/outbound', notificationRoutesModule.notificationsOutboundRoutes);
    notificationRoutes.use('/delivery', notificationRoutesModule.notificationsDeliveryRoutes);
    notificationRoutes.use('/batching', notificationRoutesModule.notificationsBatchingRoutes);
    notificationRoutes.use('/triggers', notificationRoutesModule.notificationsTriggersRoutes);
    notificationRoutes.use('/analytics', notificationRoutesModule.notificationsAnalyticsRoutes);
    notificationRoutes.use('/maintenance', notificationRoutesModule.notificationsMaintenanceRoutes);

    const apiKeyRoutes = securityRoutesModule.securityTokensRoutes; // API keys are part of security tokens

    const manufacturerProfilesRoutes = manufacturerRoutesModule.manufacturerProfileRoutes;
    const manufacturerAccountRoutes = manufacturerRoutesModule.manufacturerAccountRoutes;

    const supplyChainRoutes = Router();
    supplyChainRoutes.use('/deployment', supplyChainRoutesModule.supplyChainDeploymentRoutes);
    supplyChainRoutes.use('/association', supplyChainRoutesModule.supplyChainAssociationRoutes);
    supplyChainRoutes.use('/contract/read', supplyChainRoutesModule.supplyChainContractReadRoutes);
    supplyChainRoutes.use('/contract/write', supplyChainRoutesModule.supplyChainContractWriteRoutes);
    supplyChainRoutes.use('/qr-code', supplyChainRoutesModule.supplyChainQrCodeRoutes);
    supplyChainRoutes.use('/dashboard', supplyChainRoutesModule.supplyChainDashboardRoutes);
    supplyChainRoutes.use('/analytics', supplyChainRoutesModule.supplyChainAnalyticsRoutes);
    supplyChainRoutes.use('/product-lifecycle', supplyChainRoutesModule.supplyChainProductLifecycleRoutes);

    // Media routes - combine all media feature routes
    const mediaRoutes = Router();
    mediaRoutes.use('/', mediaRoutesModule.mediaDataRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaUploadRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaSearchRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaAnalyticsRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaDeletionRoutes);

    // NFT routes - combine all NFT feature routes
    const nftsRoutes = Router();
    nftsRoutes.use('/', nftRoutesModule.nftDataRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftDeploymentRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftMintingRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftTransferRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftAnalyticsRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftBurningRoutes);

    logger.info('✅ Route modules loaded');

    // Enhanced rate limiting for authentication routes
    this.app.use('/api/auth/login', strictRateLimiter());
    this.app.use('/api/auth/register', strictRateLimiter());
    this.app.use('/api/auth/forgot-password', strictRateLimiter());
    this.app.use('/api/auth', dynamicRateLimiter());

    // Plan cache warmup for authenticated users
    this.app.use(warmupPlanCache());

    // Public authentication routes
    this.app.use('/api/auth', authRoutes);
    
    // Public user routes with upload origin validation
    this.app.use('/api/users', 
      validateUploadOrigin,
      userRoutes
    );

    // Enhanced manufacturer routes with upload origin validation
    this.app.use('/api/manufacturer', 
      validateUploadOrigin,
      manufacturerRoutes
    );

    // Tenant resolution middleware for brand context
    this.app.use('/api/brand', resolveTenant, tenantCorsMiddleware);
    this.app.use('/api/tenant', resolveTenant, tenantCorsMiddleware);

    // Protected API routes with authentication and rate limiting
    this.app.use('/api', 
      authenticate, 
      dynamicRateLimiter(),
      cleanupOnError
    );

    // Product management
    this.app.use('/api/products', productRoutes);

    // Enhanced brand settings with plan-based features
    this.app.use('/api/brand-settings',
      requireTenantSetup,
      brandSettingsRoutes
    );

    // Voting system with comprehensive governance validation
    this.app.use('/api/votes',
      requireTenantPlan(['growth', 'premium', 'enterprise']),
      votesRoutes
    );

    // NFT functionality with premium plan requirement
    this.app.use('/api/nfts',
      requireTenantPlan(['premium', 'enterprise']),
      nftsRoutes
    );

    // Analytics with metrics tracking and caching
    this.app.use('/api/analytics', 
      cacheMiddleware(300), // 5 minute cache
      trackManufacturerAction('view_analytics'),
      analyticsRoutes
    );

    // Certificate management
    this.app.use('/api/certificates',
      requireTenantSetup,
      certificateRoutes
    );

    // Enhanced brand profile management
    this.app.use('/api/brands', 
      authenticate, 
      requireTenantSetup,
      brandProfilesRoutes
    );

    // Manufacturer profiles with verification requirements and caching
    this.app.use('/api/manufacturers', 
      cacheMiddleware(600), // 10 minute cache for profiles
      authenticate,
      requireManufacturer,
      manufacturerProfilesRoutes
    );

    // Brand account management
    this.app.use('/api/brand/account',
      authenticate,
      requireTenantSetup,
      brandAccountRoutes
    );

    // Manufacturer account management
    this.app.use('/api/manufacturer/account',
      authenticate,
      requireManufacturer,
      manufacturerAccountRoutes
    );

    // API key management with enterprise features
    this.app.use('/api/brand/api-keys', 
      authenticate,
      requireTenantPlan(['premium', 'enterprise']),
      apiKeyRoutes
    );

    // Enhanced notification system
    this.app.use('/api/notifications', 
      dynamicRateLimiter(),
      notificationRoutes
    );

    // Domain mapping with custom domain support
    this.app.use('/api/domain-mappings',
      authenticate,
      requireTenantPlan(['premium', 'enterprise']),
      domainMappingRoutes
    );

    // Enhanced integrations with plan-based access
    this.app.use('/api/integrations',
      requireTenantPlan(['growth', 'premium', 'enterprise']),
      integrationsRouter
    );

    // Billing and subscription management
    this.app.use('/api/billing',
      authenticate,
      billingRoutes
    );

    // Supply chain management for manufacturers
    this.app.use('/api/supply-chain',
      authenticate,
      requireManufacturer,
      supplyChainRoutes
    );

    // Media routes
    this.app.use('/api/media',
      authenticate,
      mediaRoutes
    );

    // Performance monitoring endpoint
    this.app.get('/api/performance', async (req, res) => {
      try {
        const { performanceService } = await import('../../../external/performance.service');
        const { cacheService } = await import('../../../external/cache.service');
        const { databaseService } = await import('../../../external/database.service');
        
        const health = await performanceService.getSystemHealth();
        const summary = performanceService.getPerformanceSummary();
        const cacheStats = await cacheService.getStats();
        const dbStats = await databaseService.getStats();
        
        res.json({
          status: health.status,
          timestamp: new Date().toISOString(),
          performance: summary,
          system: health,
          cache: cacheStats,
          database: dbStats,
          recommendations: await performanceService.optimizePerformance()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get performance metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Manufacturer connection tracking endpoints
    this.app.post('/api/connections/track',
      authenticate,
      trackBrandConnection('created'),
      (req, res) => {
        res.status(200).json({ message: 'Connection tracked' });
      }
    );

    // Cache management endpoints (admin only)
    this.app.post('/api/admin/cache/clear',
      authenticate,
      requireTenantPlan(['enterprise']),
      (req, res) => {
        const { type, identifier } = req.body;
        
        try {
          switch (type) {
            case 'plan':
              clearPlanCache(identifier);
              break;
            default:
              return res.status(400).json({ error: 'Invalid cache type. Only "plan" is supported.' });
          }
          
          res.status(200).json({ 
            message: `${type} cache cleared`,
            identifier 
          });
        } catch (error) {
          res.status(500).json({ error: 'Cache clear failed' });
        }
      }
    );

    // API routes with enhanced rate limiting
    this.app.use('/api/v1', 
      apiRateLimiter(),
      (req, res) => {
        res.status(200).json({
          message: 'Enhanced Manufacturer Platform API v1',
          version: '1.0.0',
          endpoints: {
            auth: '/api/auth',
            manufacturer: '/api/manufacturer',
            brand: '/api/brand',
            products: '/api/products',
            nfts: '/api/nfts',
            votes: '/api/votes',
            analytics: '/api/analytics',
            supplyChain: '/api/supply-chain',
            performance: '/api/performance',
            health: '/health'
          }
        });
      }
    );

    logger.info('✅ API routes setup completed');
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
    // Sentry error handler
    if (process.env.SENTRY_DSN) {
      this.app.use(Sentry.Handlers.errorHandler({
        shouldHandleError: (error: any) => {
          return Number(error.status) >= 500;
        }
      }));
    }

    // Global error handler (imported from modular middleware)
    this.app.use(errorHandler);
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    logger.info('ðŸ“Š Starting monitoring services...');

    // Start system metrics collection
    setInterval(() => {
      monitoringService.recordSystemMetrics();
    }, 30000); // Every 30 seconds

    // Start circuit breaker metrics collection
    setInterval(() => {
      const stats = circuitBreakerManager.getAllStats();
      monitoringService.recordCircuitBreakerMetrics(stats);
    }, 60000); // Every minute

    logger.info('âœ… Monitoring services started');
  }

}



