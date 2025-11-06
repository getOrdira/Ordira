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
export { brandProfileApi } from './brandProfile.api';
export { brandAccountApi } from './brandAccount.api';
export { brandSettingsApi } from './brandSettings.api';
export { brandCustomerAccessApi } from './brandCustomerAccess.api';
export { brandDiscoveryApi } from './brandDiscovery.api';
export { brandIntegrationsApi } from './brandIntegrations.api';
export { brandVerificationApi } from './brandVerification.api';
export { brandWalletApi } from './brandWallet.api';
export { brandCompletenessApi } from './brandCompleteness.api';
export { brandRecommendationApi } from './brandRecommendation.api';

// Aggregated convenience export
export const brandsApi = {
  profile: brandProfileApi,
  account: brandAccountApi,
  settings: brandSettingsApi,
  customerAccess: brandCustomerAccessApi,
  discovery: brandDiscoveryApi,
  integrations: brandIntegrationsApi,
  verification: brandVerificationApi,
  wallet: brandWalletApi,
  completeness: brandCompletenessApi,
  recommendation: brandRecommendationApi,
} as const;

