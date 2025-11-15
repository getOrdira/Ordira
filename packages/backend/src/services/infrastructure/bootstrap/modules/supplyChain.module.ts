/**
 * Supply Chain Feature Module
 * 
 * Handles supply chain routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import {
  authenticate,
  requireManufacturer
} from '../../../../middleware';
import { logger } from '../../logging';

export class SupplyChainModule extends BaseFeatureModule {
  readonly name = 'supplyChain';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY,
      SERVICE_TOKENS.SUPPLY_CHAIN_DEPLOYMENT_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_ASSOCIATION_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_READ_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_QR_CODE_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_DASHBOARD_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_ANALYTICS_SERVICE,
      SERVICE_TOKENS.SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import supply chain route modules
    const supplyChainRoutesModule = await import('../../../../routes/features/supplyChain');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const supplyChainRoutes = Router();
    supplyChainRoutes.use('/deployment', supplyChainRoutesModule.supplyChainDeploymentRoutes);
    supplyChainRoutes.use('/association', supplyChainRoutesModule.supplyChainAssociationRoutes);
    supplyChainRoutes.use('/contract/read', supplyChainRoutesModule.supplyChainContractReadRoutes);
    supplyChainRoutes.use('/contract/write', supplyChainRoutesModule.supplyChainContractWriteRoutes);
    supplyChainRoutes.use('/qr-code', supplyChainRoutesModule.supplyChainQrCodeRoutes);
    supplyChainRoutes.use('/dashboard', supplyChainRoutesModule.supplyChainDashboardRoutes);
    supplyChainRoutes.use('/analytics', supplyChainRoutesModule.supplyChainAnalyticsRoutes);
    supplyChainRoutes.use('/product-lifecycle', supplyChainRoutesModule.supplyChainProductLifecycleRoutes);

    // Supply chain management for manufacturers
    app.use('/api/supply-chain',
      authenticate,
      requireManufacturer,
      supplyChainRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

