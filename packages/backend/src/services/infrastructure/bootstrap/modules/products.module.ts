/**
 * Products Feature Module
 * 
 * Handles product routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { authenticate } from '../../../../middleware';
import { logger } from '../../logging';

export class ProductsModule extends BaseFeatureModule {
  readonly name = 'products';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.PRODUCT_MODEL
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import product route modules
    const productRoutesModule = await import('../../../../routes/features/products');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const productRoutes = Router();
    productRoutes.use('/', productRoutesModule.productsDataRoutes);
    productRoutes.use('/account', productRoutesModule.productsAccountRoutes);
    productRoutes.use('/analytics', productRoutesModule.productsAnalyticsRoutes);
    productRoutes.use('/aggregation', productRoutesModule.productsAggregationRoutes);
    productRoutes.use('/search', productRoutesModule.productsSearchRoutes);
    productRoutes.use('/validation', productRoutesModule.productsValidationRoutes);

    // Product management with authentication
    app.use('/api/products', 
      authenticate,
      productRoutes
    );

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

