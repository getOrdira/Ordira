/**
 * Connections Feature Module
 * 
 * Handles brand-manufacturer connection routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { logger } from '../../logging';

export class ConnectionsModule extends BaseFeatureModule {
  readonly name = 'connections';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.AUTH_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import connection route modules
    const connectionsRoutesModule = await import('../../../../routes/features/connections');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    // Note: Routes already have authentication via RouteConfigs.authenticated
    const connectionsRoutes = Router();
    connectionsRoutes.use('/invitations', connectionsRoutesModule.connectionsInvitationsRoutes);
    connectionsRoutes.use('/analytics', connectionsRoutesModule.connectionsAnalyticsRoutes);
    connectionsRoutes.use('/collaboration', connectionsRoutesModule.connectionsCollaborationRoutes);
    connectionsRoutes.use('/permissions', connectionsRoutesModule.connectionsPermissionsRoutes);
    connectionsRoutes.use('/recommendations', connectionsRoutesModule.connectionsRecommendationsRoutes);

    // Connections routes - authentication handled by route builders
    app.use('/api/connections', connectionsRoutes);

    logger.info(`✅ ${this.name} module routes registered`);
    logger.info(`   - Invitations: /api/connections/invitations (authenticated)`);
    logger.info(`   - Analytics: /api/connections/analytics (authenticated)`);
    logger.info(`   - Collaboration: /api/connections/collaboration (authenticated)`);
    logger.info(`   - Permissions: /api/connections/permissions (authenticated)`);
    logger.info(`   - Recommendations: /api/connections/recommendations (authenticated)`);
  }
}

