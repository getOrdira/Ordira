/**
 * Analytics Feature Module
 * 
 * Handles analytics routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  cacheMiddleware,
  trackManufacturerAction
} from '../../../../middleware';
import { logger } from '../../logging';

export class AnalyticsModule extends BaseFeatureModule {
  readonly name = 'analytics';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.CACHE_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import analytics route modules
    const analyticsRoutesModule = await import('../../../../routes/features/analytics');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const analyticsRoutes = Router();
    analyticsRoutes.use('/platform', analyticsRoutesModule.analyticsPlatformDataRoutes);
    analyticsRoutes.use('/reporting', analyticsRoutesModule.analyticsReportingRoutes);
    analyticsRoutes.use('/dashboard', analyticsRoutesModule.analyticsDashboardRoutes);
    analyticsRoutes.use('/insights', analyticsRoutesModule.analyticsInsightsRoutes);
    analyticsRoutes.use('/reports', analyticsRoutesModule.analyticsReportGenerationRoutes);
    analyticsRoutes.use('/health', analyticsRoutesModule.analyticsSystemHealthRoutes);

    // Analytics with metrics tracking and caching
    app.use('/api/analytics', 
      cacheMiddleware(300), // 5 minute cache
      trackManufacturerAction('view_analytics'),
      analyticsRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

