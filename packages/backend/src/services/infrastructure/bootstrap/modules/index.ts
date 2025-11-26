/**
 * Feature Modules Index
 * 
 * Exports all feature modules and the module registry for easy import.
 */

export { IFeatureModule, ModuleRegistrationOptions } from './types';
export { BaseFeatureModule } from './base.module';
export { ModuleRegistry, moduleRegistry } from './moduleRegistry.service';

// Export all feature modules
export { AuthModule } from './auth.module';
export { UsersModule } from './users.module';
export { ManufacturersModule } from './manufacturers.module';
export { BrandsModule } from './brands.module';
export { SupplyChainModule } from './supplyChain.module';
export { AnalyticsModule } from './analytics.module';
export { CertificatesModule } from './certificates.module';
export { IntegrationsModule } from './integrations.module';
export { ProductsModule } from './products.module';
export { VotesModule } from './votes.module';
export { SubscriptionsModule } from './subscriptions.module';
export { NotificationsModule } from './notifications.module';
export { SecurityModule } from './security.module';
export { DomainsModule } from './domains.module';
export { MediaModule } from './media.module';
export { NftModule } from './nft.module';
export { PlatformModule } from './platform.module';
