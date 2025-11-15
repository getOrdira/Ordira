/**
 * Media Feature Module
 * 
 * Handles media routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  authenticate
} from '../../../../middleware';
import { logger } from '../../logging';

export class MediaModule extends BaseFeatureModule {
  readonly name = 'media';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.MEDIA_MODEL,
      SERVICE_TOKENS.S3_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import media route modules
    const mediaRoutesModule = await import('../../../../routes/features/media');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const mediaRoutes = Router();
    mediaRoutes.use('/', mediaRoutesModule.mediaDataRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaUploadRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaSearchRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaAnalyticsRoutes);
    mediaRoutes.use('/', mediaRoutesModule.mediaDeletionRoutes);

    // Media routes
    app.use('/api/media',
      authenticate,
      mediaRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

