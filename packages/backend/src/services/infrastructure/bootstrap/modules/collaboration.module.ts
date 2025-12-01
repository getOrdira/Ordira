/**
 * Collaboration Feature Module
 * 
 * Handles brand-manufacturer collaboration routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { logger } from '../../logging';

export class CollaborationModule extends BaseFeatureModule {
  readonly name = 'collaboration';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.AUTH_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import collaboration route modules
    const collaborationRoutesModule = await import('../../../../routes/features/collaboration');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    // Note: Routes already have authentication via RouteConfigs.authenticated
    const collaborationRoutes = Router();
    collaborationRoutes.use('/workspaces', collaborationRoutesModule.collaborationWorkspaceRoutes);
    collaborationRoutes.use('/files', collaborationRoutesModule.collaborationFileRoutes);
    collaborationRoutes.use('/updates', collaborationRoutesModule.collaborationProductionUpdateRoutes);
    collaborationRoutes.use('/tasks', collaborationRoutesModule.collaborationTaskRoutes);
    collaborationRoutes.use('/messaging', collaborationRoutesModule.collaborationMessagingRoutes);

    // Collaboration routes - authentication handled by route builders
    app.use('/api/collaboration', collaborationRoutes);

    logger.info(`✅ ${this.name} module routes registered`);
    logger.info(`   - Workspaces: /api/collaboration/workspaces (authenticated)`);
    logger.info(`   - Files: /api/collaboration/files (authenticated)`);
    logger.info(`   - Updates: /api/collaboration/updates (authenticated)`);
    logger.info(`   - Tasks: /api/collaboration/tasks (authenticated)`);
    logger.info(`   - Messaging: /api/collaboration/messaging (authenticated)`);
  }
}

