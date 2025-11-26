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
  tenantCorsMiddleware
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

    // ============================================
    // CUSTOMER STOREFRONT ROUTES (Tenant-based)
    // Accessed via custom domain: mybrand.com/api/brand/*
    // ============================================
    app.use('/api/brand', resolveTenant, tenantCorsMiddleware);
    app.use('/api/tenant', resolveTenant, tenantCorsMiddleware);

    // ============================================
    // BUSINESS MANAGEMENT ROUTES (JWT-based)
    // Accessed via API: api.ordira.com/api/brands/*
    // Routes already have authenticated config
    // ============================================

    // Brand settings management (JWT authentication in routes)
    app.use('/api/brand-settings',
      brandRoutesModule.brandSettingsRoutes
    );

    // Brand profile management (JWT authentication in routes)
    app.use('/api/brands',
      brandRoutesModule.brandProfileRoutes
    );

    // Brand account management (JWT authentication in routes)
    app.use('/api/brand/account',
      brandRoutesModule.brandAccountRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

