/**
 * Subscriptions Feature Module
 * 
 * Handles subscription and billing routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  authenticate
} from '../../../../middleware';
import { logger } from '../../logging';

export class SubscriptionsModule extends BaseFeatureModule {
  readonly name = 'subscriptions';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import subscription route modules
    const subscriptionRoutesModule = await import('../../../../routes/features/subscriptions');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const billingRoutes = Router();
    billingRoutes.use('/data', subscriptionRoutesModule.subscriptionsDataRoutes);
    billingRoutes.use('/lifecycle', subscriptionRoutesModule.subscriptionsLifecycleRoutes);
    billingRoutes.use('/billing', subscriptionRoutesModule.subscriptionsBillingRoutes);
    billingRoutes.use('/usage', subscriptionRoutesModule.subscriptionsUsageRoutes);
    billingRoutes.use('/analytics', subscriptionRoutesModule.subscriptionsAnalyticsRoutes);
    billingRoutes.use('/plans', subscriptionRoutesModule.subscriptionsPlansRoutes);
    billingRoutes.use('/discounts', subscriptionRoutesModule.subscriptionsDiscountsRoutes);

    // Billing and subscription management
    app.use('/api/billing',
      authenticate,
      billingRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

