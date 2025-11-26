/**
 * Domains Feature Module
 * 
 * Handles domain mapping routes and middleware registration.
 * 
 * Note: Routes use BaseRouteBuilder with RouteConfigs.authenticated,
 * which automatically applies authentication middleware.
 * However, we also need to apply authentication before requirePlanFeature
 * since it checks for req.business which is set by authenticate middleware.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { authenticate, requirePlanFeature } from '../../../../middleware/auth/unifiedAuth.middleware';
import { logger } from '../../logging';

export class DomainsModule extends BaseFeatureModule {
  readonly name = 'domains';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import domain route modules
    const domainRoutesModule = await import('../../../../routes/features/domains');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    // Note: Routes already have authentication via RouteConfigs.authenticated
    const domainMappingRoutes = Router();
    domainMappingRoutes.use('/registry', domainRoutesModule.domainRegistryRoutes);
    domainMappingRoutes.use('/verification', domainRoutesModule.domainVerificationRoutes);
    domainMappingRoutes.use('/dns', domainRoutesModule.domainDnsRoutes);
    domainMappingRoutes.use('/health', domainRoutesModule.domainHealthRoutes);
    domainMappingRoutes.use('/certificate', domainRoutesModule.domainCertificateLifecycleRoutes);
    domainMappingRoutes.use('/provisioner', domainRoutesModule.domainCertificateProvisionerRoutes);
    domainMappingRoutes.use('/storage', domainRoutesModule.domainStorageRoutes);
    domainMappingRoutes.use('/analytics', domainRoutesModule.domainAnalyticsRoutes);

    // Domain mapping - requires authentication first, then plan feature check (Growth+)
    // Note: authenticate must come before requirePlanFeature since it sets req.business
    app.use('/api/domain-mappings',
      authenticate,
      requirePlanFeature('customDomains'),
      domainMappingRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}



