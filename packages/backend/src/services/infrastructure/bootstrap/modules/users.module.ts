/**
 * Users Feature Module
 * 
 * Handles user management routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  validateUploadOrigin,
  authenticate
} from '../../../../middleware';
import { logger } from '../../logging';

export class UsersModule extends BaseFeatureModule {
  readonly name = 'users';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.AUTH_SERVICE,
      SERVICE_TOKENS.USER_MODEL
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import user route modules
    const userRoutesModule = await import('../../../../routes/features/users');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const userRoutes = Router();
    userRoutes.use('/', userRoutesModule.usersAuthRoutes);
    userRoutes.use('/', userRoutesModule.usersProfileRoutes);
    userRoutes.use('/', userRoutesModule.usersDataRoutes);
    userRoutes.use('/', userRoutesModule.usersSearchRoutes);
    userRoutes.use('/', userRoutesModule.usersAnalyticsRoutes);
    userRoutes.use('/', userRoutesModule.usersCacheRoutes);
    userRoutes.use('/', userRoutesModule.usersValidationRoutes);

    // User routes with authentication and upload origin validation
    // Note: Some routes may be public (handled by route-level config), but most require auth
    app.use('/api/users', 
      authenticate,
      validateUploadOrigin,
      userRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

