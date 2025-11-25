/**
 * Domains Feature Module
 * 
 * Handles domain mapping routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { requirePlanFeature } from '../../../../middleware/auth/unifiedAuth.middleware';
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
    const domainMappingRoutes = Router();
    domainMappingRoutes.use('/registry', domainRoutesModule.domainRegistryRoutes);
    domainMappingRoutes.use('/verification', domainRoutesModule.domainVerificationRoutes);
    domainMappingRoutes.use('/dns', domainRoutesModule.domainDnsRoutes);
    domainMappingRoutes.use('/health', domainRoutesModule.domainHealthRoutes);
    domainMappingRoutes.use('/certificate', domainRoutesModule.domainCertificateLifecycleRoutes);
    domainMappingRoutes.use('/provisioner', domainRoutesModule.domainCertificateProvisionerRoutes);
    domainMappingRoutes.use('/storage', domainRoutesModule.domainStorageRoutes);
    domainMappingRoutes.use('/analytics', domainRoutesModule.domainAnalyticsRoutes);

    // Domain mapping - requires custom domains feature (Growth+)
    app.use('/api/domain-mappings',
      requirePlanFeature('customDomains'),
      domainMappingRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}



