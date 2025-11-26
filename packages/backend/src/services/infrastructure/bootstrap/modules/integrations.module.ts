/**
 * Integrations Feature Module
 * 
 * Handles third-party integration routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { requireBusinessPlan } from '../../../../middleware/auth/unifiedAuth.middleware';
import { logger } from '../../logging';

export class IntegrationsModule extends BaseFeatureModule {
  readonly name = 'integrations';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import integration route modules
    const integrationRoutesModule = await import('../../../../routes/integrations');
    const { Router } = await import('express');

    // Ecommerce integrations
    const ecommerceRouter = Router();
    ecommerceRouter.use('/data', integrationRoutesModule.ecommerceIntegrationDataRoutes);
    ecommerceRouter.use('/oauth', integrationRoutesModule.ecommerceOAuthRoutes);
    ecommerceRouter.use('/operations', integrationRoutesModule.ecommerceOperationsRoutes);
    ecommerceRouter.use('/webhooks', integrationRoutesModule.ecommerceWebhooksRoutes);
    ecommerceRouter.use('/health', integrationRoutesModule.ecommerceHealthRoutes);
    ecommerceRouter.use('/providers', integrationRoutesModule.ecommerceProvidersRoutes);
    ecommerceRouter.use('/shopify', integrationRoutesModule.shopifyRoutes);
    ecommerceRouter.use('/wix', integrationRoutesModule.wixRoutes);
    ecommerceRouter.use('/woocommerce', integrationRoutesModule.woocommerceRoutes);

    // Main integrations router
    const integrationsRouter = Router();
    integrationsRouter.use('/ecommerce', ecommerceRouter);
    integrationsRouter.use('/blockchain', integrationRoutesModule.blockchainIntegrationRoutes);
    integrationsRouter.use('/domains', integrationRoutesModule.domainIntegrationRoutes);

    // Integrations - requires Growth plan or higher
    app.use('/api/integrations',
      requireBusinessPlan(['growth', 'premium', 'enterprise']),
      integrationsRouter
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

