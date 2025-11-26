/**
 * Platform Feature Module
 * 
 * Handles voting platform routes and middleware registration.
 * Supports dual-mode voting (off-chain and on-chain blockchain voting).
 * 
 * Note: Routes use BaseRouteBuilder with RouteConfigs.authenticated,
 * which automatically applies authentication middleware.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { logger } from '../../logging';

export class PlatformModule extends BaseFeatureModule {
  readonly name = 'platform';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import platform route modules
    const platformRoutesModule = await import('../../../../routes/features/platform');
    const { Router } = await import('express');

    // Combine modular routes into unified router for management
    // Note: Routes already have authentication via RouteConfigs.authenticated
    const platformManagementRoutes = Router();
    platformManagementRoutes.use('/', platformRoutesModule.platformManagementRoutes);
    platformManagementRoutes.use('/', platformRoutesModule.questionManagementRoutes);

    // Customer voting routes (public-facing)
    const customerVotingRoutes = Router();
    customerVotingRoutes.use('/', platformRoutesModule.customerVotingRoutes);

    // Platform management routes (authentication handled by route builders)
    app.use('/api/voting-platforms', platformManagementRoutes);

    // Customer voting routes - public access (rate limited by route builders)
    app.use('/api/vote', customerVotingRoutes);

    logger.info(`✅ ${this.name} module routes registered`);
    logger.info(`   - Management: /api/voting-platforms (authenticated)`);
    logger.info(`   - Customer: /api/vote (public)`);
  }
}

