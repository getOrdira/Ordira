// src/lib/api/features/brands/index.ts
// Brands API barrel export

/**
 * Brands API
 * 
 * Barrel export for all brand-related API modules
 * 
 * Note: This is a placeholder. Additional brand API modules will be added:
 * - brandAccount.api.ts
 * - brandSettings.api.ts
 * - brandCustomerAccess.api.ts
 * - brandDiscovery.api.ts
 * - brandIntegrations.api.ts
 * - brandVerification.api.ts
 * - brandWallet.api.ts
 * - brandCompleteness.api.ts
 * - brandRecommendation.api.ts
 */
export * from './brandProfile.api';

// Convenience export
export { brandProfileApi as brandsApi } from './brandProfile.api';

