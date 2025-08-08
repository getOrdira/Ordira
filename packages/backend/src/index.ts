// src/index.ts

// 0️⃣ Load local .env early for dev
import 'dotenv/config';

// 1️⃣ Fetch GCP secrets and validate all required env vars
import { loadSecrets } from './config/secrets';
import { validateEnv } from './config/validateEnv';

// 2️⃣ Core dependencies
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import mongoose from 'mongoose';
import multer from 'multer';
import client from 'prom-client';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

// 3️⃣ Routes & middleware
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import manufacturerRoutes from './routes/manufacturer.routes';
import mediaRoutes from './routes/media.routes';
import productRoutes from './routes/products.routes';
import collectionRoutes from './routes/collections.routes';
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
import brandSettingsRouter from './routes/brandSettings.routes';

import { resolveTenant } from './middleware/tenant.middleware';
import { authenticate } from './middleware/auth.middleware';
import { authenticateManufacturer } from './middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter } from './middleware/rateLimiter.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { startDomainCachePolling, isAllowedCustomDomain } from './cache/domainCache';

// Self-invoking async to bootstrap
(async () => {
  // Load and validate environment
  await loadSecrets();
  validateEnv();

  // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

  // Start domain cache polling for dynamic CORS
  startDomainCachePolling();

  // Initialize Express app
  const app = express();

  // Prometheus metrics endpoint
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Sentry monitoring
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Security headers
  app.use(helmet());

  // Dynamic CORS policy with in-memory cache
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === process.env.FRONTEND_URL) return callback(null, true);
        if (isAllowedCustomDomain(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    })
  );

  app.use(
  '/.well-known/acme-challenge',
  express.static(path.join(process.cwd(), ' .well-known', 'acme-challenge'))
);

  // Rate limiters
  const authLimiter = rateLimit({ windowMs: 60_000, max: 5, message: 'Too many requests, try again later.' });
  app.use('/api/auth', authLimiter);
  app.use('/api/users', authLimiter);

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Webhook raw bodies
  const rawPaths = [
    '/api/integrations/shopify/webhook/orders/create',
    '/api/integrations/woocommerce/webhook/orders/create',
    '/api/integrations/wix/webhook/orders/create',
    '/api/billing/webhook'
  ];
  rawPaths.forEach(p => app.use(p, express.raw({ type: 'application/json' })));

  // Metrics middleware
  app.use(metricsMiddleware);

  // Public routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/manufacturer', manufacturerRoutes);

  // Tenant resolution for brand context
  app.use(resolveTenant);

  // Protect all other /api endpoints
  app.use('/api', authenticate, dynamicRateLimiter());

  // Feature routes
  app.use('/api/media', mediaRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/brand-settings', brandSettingsRoutes);
  app.use('/api/votes', votesRoutes);
  app.use('/api/nfts', nftsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/certificates', certificateRoutes);
  app.use('/api/brands', authenticate, brandProfilesRoutes);
  app.use('/api/manufacturers', authenticateManufacturer, manufacturerProfilesRoutes);
  app.use('/api/brand', brandAccountRoutes);
  app.use('/api/manufacturer', manufacturerAccountRoutes);
  app.use('/api/brand/api-keys', authenticate, apiKeyRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/domain-mappings', domainMappingRoutes);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/brand-settings', authenticate, brandSettingsRouter);

  // Static uploads
  const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.resolve(__dirname, '../', UPLOAD_DIR)));

  // Sentry error handler
  app.use(Sentry.Handlers.errorHandler());

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  // Start server
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT} (${process.env.NODE_ENV})`));
})();









