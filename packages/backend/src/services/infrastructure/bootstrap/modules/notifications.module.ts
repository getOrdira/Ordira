/**
 * Notifications Feature Module
 * 
 * Handles notification routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  dynamicRateLimiter,
  authenticate
} from '../../../../middleware';
import { logger } from '../../logging';

export class NotificationsModule extends BaseFeatureModule {
  readonly name = 'notifications';

  getDependencies(): ServiceToken[] {
    return [];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import notification route modules
    const notificationRoutesModule = await import('../../../../routes/features/notifications');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    // IMPORTANT: Mount specific path routes BEFORE inbox routes
    // because inbox has /:id which would catch paths like /preferences
    const notificationRoutes = Router();
    
    // Specific sub-routes first (before the catch-all /:id in inbox)
    notificationRoutes.use('/preferences', notificationRoutesModule.notificationsPreferencesRoutes);
    notificationRoutes.use('/template', notificationRoutesModule.notificationsTemplateRoutes);
    notificationRoutes.use('/outbound', notificationRoutesModule.notificationsOutboundRoutes);
    notificationRoutes.use('/delivery', notificationRoutesModule.notificationsDeliveryRoutes);
    notificationRoutes.use('/batching', notificationRoutesModule.notificationsBatchingRoutes);
    notificationRoutes.use('/triggers', notificationRoutesModule.notificationsTriggersRoutes);
    notificationRoutes.use('/analytics', notificationRoutesModule.notificationsAnalyticsRoutes);
    notificationRoutes.use('/maintenance', notificationRoutesModule.notificationsMaintenanceRoutes);
    
    // Inbox routes last (has /:id which is a catch-all pattern)
    notificationRoutes.use('/', notificationRoutesModule.notificationsInboxRoutes);

    // Enhanced notification system with authentication
    app.use('/api/notifications', 
      authenticate,
      dynamicRateLimiter(),
      notificationRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

