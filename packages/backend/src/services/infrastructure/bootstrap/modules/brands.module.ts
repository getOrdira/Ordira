/**
 * Brands Feature Module
 * 
 * Handles brand/tenant routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  resolveTenant,
  tenantCorsMiddleware,
  requireTenantSetup,
  requireTenantPlan,
  authenticate
} from '../../../../middleware';
import { logger } from '../../logging';

export class BrandsModule extends BaseFeatureModule {
  readonly name = 'brands';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.TENANT_SERVICE,
      SERVICE_TOKENS.BRAND_SETTINGS_MODEL,
      SERVICE_TOKENS.AUTH_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import brand route modules
    const brandRoutesModule = await import('../../../../routes/features/brands');

    // Tenant resolution middleware for brand context
    app.use('/api/brand', resolveTenant, tenantCorsMiddleware);
    app.use('/api/tenant', resolveTenant, tenantCorsMiddleware);

    // Enhanced brand settings with plan-based features
    app.use('/api/brand-settings',
      requireTenantSetup,
      brandRoutesModule.brandSettingsRoutes
    );

    // Enhanced brand profile management
    app.use('/api/brands', 
      authenticate, 
      requireTenantSetup,
      brandRoutesModule.brandProfileRoutes
    );

    // Brand account management
    app.use('/api/brand/account',
      authenticate,
      requireTenantSetup,
      brandRoutesModule.brandAccountRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

