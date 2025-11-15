/**
 * Certificates Feature Module
 * 
 * Handles certificate routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  requireTenantSetup
} from '../../../../middleware';
import { logger } from '../../logging';

export class CertificatesModule extends BaseFeatureModule {
  readonly name = 'certificates';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.CERTIFICATE_MODEL,
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import certificate route modules
    const certificateRoutesModule = await import('../../../../routes/features/certificates');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const certificateRoutes = Router();
    certificateRoutes.use('/', certificateRoutesModule.certificateDataRoutes);
    certificateRoutes.use('/account', certificateRoutesModule.certificateAccountRoutes);
    certificateRoutes.use('/minting', certificateRoutesModule.certificateMintingRoutes);
    certificateRoutes.use('/batch', certificateRoutesModule.certificateBatchRoutes);
    certificateRoutes.use('/helpers', certificateRoutesModule.certificateHelpersRoutes);
    certificateRoutes.use('/validation', certificateRoutesModule.certificateValidationRoutes);

    // Certificate management
    app.use('/api/certificates',
      requireTenantSetup,
      certificateRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

