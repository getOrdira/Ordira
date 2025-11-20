/**
 * Authentication Feature Module
 * 
 * Handles authentication routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  strictRateLimiter,
  dynamicRateLimiter
} from '../../../../middleware';
import { logger } from '../../logging';

export class AuthModule extends BaseFeatureModule {
  readonly name = 'auth';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.AUTH_SERVICE,
      SERVICE_TOKENS.CACHE_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import auth routes
    const { default: authRoutes } = await import('../../../../routes/core/auth.routes');
    const { default: businessAuthRoutes } = await import('../../../../routes/core/businessAuth.routes');
    const { default: manufacturerAuthRoutes } = await import('../../../../routes/core/manufacturerAuth.routes');

    // Enhanced rate limiting for authentication routes
    app.use('/api/auth/login', strictRateLimiter());
    app.use('/api/auth/register', strictRateLimiter());
    app.use('/api/auth/forgot-password', strictRateLimiter());
    app.use('/api/auth', dynamicRateLimiter());

    // Public authentication routes - User auth (frontend users)
    app.use('/api/auth', authRoutes);

    // Business authentication routes
    app.use('/api/auth/business', businessAuthRoutes);

    // Manufacturer authentication routes
    app.use('/api/auth/manufacturer', manufacturerAuthRoutes);

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

