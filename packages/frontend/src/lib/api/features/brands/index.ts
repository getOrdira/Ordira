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
import { brandProfileApi } from './brandProfile.api';
import { brandAccountApi } from './brandAccount.api';
import { brandSettingsApi } from './brandSettings.api';
import { brandCustomerAccessApi } from './brandCustomerAccess.api';
import { brandDiscoveryApi } from './brandDiscovery.api';
import { brandIntegrationsApi } from './brandIntegrations.api';
import { brandVerificationApi } from './brandVerification.api';
import { brandWalletApi } from './brandWallet.api';
import { brandCompletenessApi } from './brandCompleteness.api';
import { brandRecommendationApi } from './brandRecommendation.api';

export {
  brandProfileApi,
  brandAccountApi,
  brandSettingsApi,
  brandCustomerAccessApi,
  brandDiscoveryApi,
  brandIntegrationsApi,
  brandVerificationApi,
  brandWalletApi,
  brandCompletenessApi,
  brandRecommendationApi
};

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


