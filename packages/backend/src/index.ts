// src/index.ts

// 0️⃣ Load local .env early for development
import 'dotenv/config';

// 1️⃣ Fetch GCP secrets and validate all required environment variables
import { loadSecrets } from './config/secrets';
import { validateEnv } from './config/validateEnv';

// 2️⃣ Core dependencies with enhanced monitoring
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

// 3️⃣ Enhanced middleware imports
import { resolveTenant, requireTenantSetup, requireTenantPlan, tenantCorsMiddleware } from './middleware/tenant.middleware';
import { authenticate } from './middleware/auth.middleware';
import { authenticateManufacturer, requireBrandAccess, requireVerifiedManufacturer } from './middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter, apiRateLimiter, warmupPlanCache, clearPlanCache } from './middleware/rateLimiter.middleware';
import { metricsMiddleware, metricsHandler, trackManufacturerAction, trackBrandConnection } from './middleware/metrics.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from './middleware/upload.middleware';
import { errorHandler } from './middleware/error.middleware';
import { validateBody, validateQuery, validateParams } from './middleware/validation.middleware';

// 4️⃣ Route imports with enhanced organization
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import manufacturerRoutes from './routes/manufacturer.routes';
import mediaRoutes from './routes/media.routes';
import productRoutes from './routes/products.routes';
import brandSettingsRoutes from './routes/brandSettings.routes';
import votesRoutes from './routes/votes.routes';
import nftsRoutes from './routes/nfts.routes';
import analyticsRoutes from './routes/analytics.routes';
import certificateRoutes from './routes/certificate.routes';
import integrationsRouter from './routes/integrations.routes';
import brandProfilesRoutes from './routes/brandProfile.routes';
import manufacturerProfilesRoutes from './routes/manufacturerProfile.routes';
import brandAccountRoutes from './routes/brandAccount.routes';
import manufacturerAccountRoutes from './routes/manufacturerAccount.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import notificationRoutes from './routes/notification.routes';
import domainMappingRoutes from './routes/domainMapping.routes';
import billingRoutes from './routes/billing.routes';

// 5️⃣ Enhanced cache and utility imports
import { startDomainCachePolling, isAllowedCustomDomain } from './cache/domainCache';

// 6️⃣ Validation schemas for route-specific validation
import { authValidationSchemas } from './validation/auth.validation';
import { manufacturerAccountValidationSchemas } from './validation/manufacturerAccount.validation';
import { brandAccountValidationSchemas } from './validation/brandAccount.validation';
import { brandSettingsValidationSchemas } from './validation/brandSettings.validation';
import { productValidationSchemas } from './validation/product.validation';
import { nftValidationSchemas } from './validation/nfts.validation';
import { votesValidationSchemas } from './validation/votes.validation';

// 7️⃣ Type definitions for enhanced request handling
interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

interface ErrorWithStatus extends Error {
  status?: string | number;
}

// Self-invoking async function to bootstrap the application
(async () => {
  try {
    console.log('🚀 Starting enhanced manufacturer platform...');

    // Load and validate environment configuration
    await loadSecrets();
    validateEnv();
    console.log('✅ Environment configuration loaded and validated');

    // Enhanced MongoDB connection with updated options
    await mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
      // Removed deprecated bufferMaxEntries option
    });
    console.log('✅ Connected to MongoDB with enhanced configuration');

    // Start domain cache polling for dynamic CORS and tenant resolution
    startDomainCachePolling();
    console.log('✅ Domain cache polling started');

    // Initialize Express app with enhanced configuration
    const app = express();

    // Trust proxy for accurate IP addresses behind load balancers
    app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

    // Enhanced security configuration
    app.use(helmet({
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

    // Sentry monitoring with enhanced configuration
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express({ app }),
          new Tracing.Integrations.Mongo()
        ]
      });
      
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
      console.log('✅ Sentry monitoring initialized');
    }

    // Performance and security middleware
    app.use(compression());
    app.use(mongoSanitize());

    // Enhanced CORS policy with tenant-aware origin validation
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests without origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow configured frontend URL
        if (origin === process.env.FRONTEND_URL) return callback(null, true);
        
        // Allow localhost for development
        if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
          return callback(null, true);
        }
        
        // Check against cached custom domains
        if (isAllowedCustomDomain(origin)) return callback(null, true);
        
        // Block unauthorized origins
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
        'Authorization', 'Cache-Control', 'Pragma', 'X-Tenant-ID'
      ],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));

    // Enhanced metrics endpoint with authentication in production
    app.get('/metrics', 
      process.env.NODE_ENV === 'production' ? authenticate : (req, res, next) => next(),
      metricsHandler
    );

    // Health check endpoint with detailed status
    app.get('/health', async (req, res) => {
      try {
        // Check MongoDB connection
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Check memory usage
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

    // Let's Encrypt ACME challenge support
    app.use('/.well-known/acme-challenge', 
      express.static(path.join(process.cwd(), '.well-known', 'acme-challenge'))
    );

    // Enhanced body parsing with size limits and proper typing
    app.use(express.json({ 
      limit: '10mb',
      verify: (req: RequestWithRawBody, res, buf) => {
        // Store raw body for webhook signature verification
        if (req.url?.includes('/webhook')) {
          req.rawBody = buf;
        }
      }
    }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Raw body handling for specific webhook endpoints
    const webhookPaths = [
      '/api/integrations/shopify/webhook',
      '/api/integrations/woocommerce/webhook',
      '/api/integrations/wix/webhook',
      '/api/billing/webhook'
    ];
    
    webhookPaths.forEach(path => {
      app.use(path, express.raw({ type: 'application/json', limit: '1mb' }));
    });

    // Global metrics middleware
    app.use(metricsMiddleware);

    // Plan cache warmup for authenticated users
    app.use(warmupPlanCache());

    // Enhanced rate limiting for authentication routes
    app.use('/api/auth/login', strictRateLimiter());
    app.use('/api/auth/register', strictRateLimiter());
    app.use('/api/auth/forgot-password', strictRateLimiter());
    app.use('/api/auth', dynamicRateLimiter());

    // Public authentication routes with enhanced validation
    app.use('/api/auth', authRoutes);
    app.use('/api/users', 
      validateUploadOrigin,
      userRoutes
    );

    // Enhanced manufacturer routes with comprehensive validation
    app.use('/api/manufacturer', 
      validateUploadOrigin,
      manufacturerRoutes
    );

    // Tenant resolution middleware for brand context
    app.use('/api/brand', resolveTenant, tenantCorsMiddleware);
    app.use('/api/tenant', resolveTenant, tenantCorsMiddleware);

    // Protected API routes with authentication and rate limiting
    app.use('/api', 
      authenticate, 
      dynamicRateLimiter(),
      cleanupOnError
    );

    // Product management with enhanced validation
    app.use('/api/products', 
      validateBody(productValidationSchemas.createProduct),
      productRoutes
    );

    // Enhanced brand settings with plan-based features
    app.use('/api/brand-settings',
      requireTenantSetup,
      brandSettingsRoutes
    );

    // Voting system with comprehensive governance validation
    app.use('/api/votes',
      requireTenantPlan(['growth', 'premium', 'enterprise']),
      votesRoutes
    );

    // NFT functionality with premium plan requirement
    app.use('/api/nfts',
      requireTenantPlan(['premium', 'enterprise']),
      nftsRoutes
    );

    // Analytics with metrics tracking
    app.use('/api/analytics', 
      trackManufacturerAction('view_analytics'),
      analyticsRoutes
    );

    // Certificate management
    app.use('/api/certificates',
      requireTenantSetup,
      certificateRoutes
    );

    // Enhanced brand profile management
    app.use('/api/brands', 
      authenticate, 
      requireTenantSetup,
      brandProfilesRoutes
    );

    // Manufacturer profiles with verification requirements
    app.use('/api/manufacturers', 
      authenticateManufacturer,
      manufacturerProfilesRoutes
    );

    // Brand account management with enhanced validation
    app.use('/api/brand/account',
      authenticate,
      requireTenantSetup,
      validateBody(brandAccountValidationSchemas.updateBrandAccount),
      brandAccountRoutes
    );

    // Manufacturer account management with comprehensive validation
    app.use('/api/manufacturer/account',
      authenticateManufacturer,
      validateBody(manufacturerAccountValidationSchemas.updateManufacturerAccount),
      manufacturerAccountRoutes
    );

    // API key management with enterprise features
    app.use('/api/brand/api-keys', 
      authenticate,
      requireTenantPlan(['premium', 'enterprise']),
      apiKeyRoutes
    );

    // Enhanced notification system
    app.use('/api/notifications', 
      dynamicRateLimiter(),
      notificationRoutes
    );

    // Domain mapping with custom domain support
    app.use('/api/domain-mappings',
      authenticate,
      requireTenantPlan(['premium', 'enterprise']),
      domainMappingRoutes
    );

    // Enhanced integrations with plan-based access
    app.use('/api/integrations',
      requireTenantPlan(['growth', 'premium', 'enterprise']),
      integrationsRouter
    );

    // Billing and subscription management
    app.use('/api/billing',
      authenticate,
      billingRoutes
    );

    // API routes with enhanced rate limiting
    app.use('/api/v1', 
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
            analytics: '/api/analytics'
          }
        });
      }
    );

    // Enhanced static file serving with caching
    const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
    app.use('/uploads', 
      express.static(path.resolve(__dirname, '../', UPLOAD_DIR), {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
          // Set appropriate MIME types
          if (path.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
          }
          // Add security headers for uploaded content
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
        }
      })
    );

    // Manufacturer connection tracking endpoints
    app.post('/api/connections/track',
      authenticate,
      trackBrandConnection('created'),
      (req, res) => {
        res.status(200).json({ message: 'Connection tracked' });
      }
    );

    // Cache management endpoints (admin only) - Fixed function name
    app.post('/api/admin/cache/clear',
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

    // Enhanced error handling with proper typing
    if (process.env.SENTRY_DSN) {
      app.use(Sentry.Handlers.errorHandler({
        shouldHandleError: (error: ErrorWithStatus) => {
          // Only send 500+ errors to Sentry - Fixed type conversion
          return Number(error.status) >= 500;
        }
      }));
    }

    // Global error handler with enhanced logging
    app.use(errorHandler);

    // 404 handler for unmatched routes
    app.use('*', (req, res) => {
      console.warn(`⚠️ Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Start the enhanced server
    const PORT = Number(process.env.PORT) || 4000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Ordira Platform Server Started!
┌────────────────────────────────────────────────────────────────────┐
│ 📡 Server:     http://0.0.0.0:${PORT}                                │
│ 🌐 Environment: ${process.env.NODE_ENV}                               │
│ 📊 Metrics:    http://0.0.0.0:${PORT}/metrics                       │
│ 💊 Health:     http://0.0.0.0:${PORT}/health                        │
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
      `);
    });

    // Server timeout configuration
    server.timeout = 120000; // 2 minutes
    server.keepAliveTimeout = 61000; // 61 seconds
    server.headersTimeout = 62000; // 62 seconds

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('📡 HTTP server closed');
        
        try {
          await mongoose.connection.close();
          console.log('📡 MongoDB connection closed');
        } catch (error) {
          console.error('⚠️ Error closing MongoDB:', error);
        }
        
        console.log('📡 Graceful shutdown complete');
        process.exit(0);
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
      }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('⚠️ Uncaught Exception:', error);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('⚠️ Failed to start server:', error);
    
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    
    process.exit(1);
  }
})();








