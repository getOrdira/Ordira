/**
 * Tenant Types
 * 
 * Re-exports backend tenant types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
export type {
  TenantResolutionResult,
  TenantValidationResult,
  TenantCacheEntry,
  TenantListFilters,
  TenantListResult,
  TenantAnalyticsOverview
} from '@backend/services/tenants/utils/types';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Tenant display type with enhanced UI fields
 */
export interface TenantDisplay {
  id: string;
  businessName: string;
  subdomain: string;
  customDomain?: string;
  plan?: string;
  isActive: boolean;
  hasCustomDomain: boolean;
  _ui?: {
    formattedPlan?: string;
    planBadge?: 'foundation' | 'growth' | 'premium' | 'enterprise';
    statusBadge?: 'active' | 'inactive' | 'suspended';
    domainStatusBadge?: 'active' | 'pending' | 'error';
    formattedCreatedAt?: string;
    relativeTime?: string;
  };
}

