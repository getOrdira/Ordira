/**
 * Security Feature Module
 * 
 * Handles security-related routes and middleware registration.
 */

import { Application } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  authenticate,
  requireTenantPlan
} from '../../../../middleware';
import { logger } from '../../logging';

export class SecurityModule extends BaseFeatureModule {
  readonly name = 'security';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.SECURITY_SERVICE,
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import security route modules
    const securityRoutesModule = await import('../../../../routes/features/security');

    // API key management with enterprise features
    app.use('/api/brand/api-keys', 
      authenticate,
      requireTenantPlan(['premium', 'enterprise']),
      securityRoutesModule.securityTokensRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

