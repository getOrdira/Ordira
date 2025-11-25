/**
 * NFT Feature Module
 * 
 * Handles NFT routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { requirePlanFeature } from '../../../../middleware/auth/unifiedAuth.middleware';
import { logger } from '../../logging';

export class NftModule extends BaseFeatureModule {
  readonly name = 'nft';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.CERTIFICATE_MODEL
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import NFT route modules
    const nftRoutesModule = await import('../../../../routes/features/nft');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const nftsRoutes = Router();
    nftsRoutes.use('/', nftRoutesModule.nftDataRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftDeploymentRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftMintingRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftTransferRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftAnalyticsRoutes);
    nftsRoutes.use('/', nftRoutesModule.nftBurningRoutes);

    // NFT functionality - requires Web3 feature (Growth+)
    app.use('/api/nfts',
      requirePlanFeature('hasWeb3'),
      nftsRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}



