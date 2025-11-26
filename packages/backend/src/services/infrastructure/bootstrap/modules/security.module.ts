/**
 * Security Feature Module
 * 
 * Handles security-related routes and middleware registration.
 */

import { Application } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { requireBusinessPlan } from '../../../../middleware/auth/unifiedAuth.middleware';
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

    // API key management - requires Premium or Enterprise plan
    app.use('/api/brand/api-keys',
      requireBusinessPlan(['premium', 'enterprise']),
      securityRoutesModule.securityTokensRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

