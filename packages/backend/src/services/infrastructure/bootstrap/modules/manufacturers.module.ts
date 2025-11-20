/**
 * Manufacturers Feature Module
 * 
 * Handles manufacturer routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  validateUploadOrigin,
  authenticate,
  requireManufacturer,
  cacheMiddleware
} from '../../../../middleware';
import { logger } from '../../logging';

export class ManufacturersModule extends BaseFeatureModule {
  readonly name = 'manufacturers';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.AUTH_SERVICE,
      SERVICE_TOKENS.MANUFACTURER_MODEL,
      SERVICE_TOKENS.CACHE_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import manufacturer route modules
    const manufacturerRoutesModule = await import('../../../../routes/features/manufacturers');
    const { Router } = await import('express');

    // Combine modular routes into unified router
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

    // Note: Manufacturer authentication routes are now handled by AuthModule
    // at /api/auth/manufacturer/* to maintain consistency with business auth routes

    // Enhanced manufacturer routes with upload origin validation
    app.use('/api/manufacturer', 
      validateUploadOrigin,
      manufacturerRoutes
    );

    // Manufacturer profiles with verification requirements and caching
    app.use('/api/manufacturers', 
      cacheMiddleware(600), // 10 minute cache for profiles
      authenticate,
      requireManufacturer,
      manufacturerRoutesModule.manufacturerProfileRoutes
    );

    // Manufacturer account management
    app.use('/api/manufacturer/account',
      authenticate,
      requireManufacturer,
      manufacturerRoutesModule.manufacturerAccountRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

