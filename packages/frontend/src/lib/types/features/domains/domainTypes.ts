/**
 * Domain Types
 * 
 * Re-exports backend domain types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
export type {
  DomainMappingRecord,
  CreateDomainMappingInput,
  UpdateDomainMappingInput,
  AnalyticsUpdate
} from '@backend/services/domains/core/domainStorage.service';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Domain mapping display type with enhanced UI fields
 */
export interface DomainMappingDisplay {
  _id: string;
  business: string;
  hostname: string;
  domain: string;
  status: 'pending_verification' | 'active' | 'error' | 'deleting';
  certificateType: 'letsencrypt' | 'custom';
  forceHttps: boolean;
  autoRenewal: boolean;
  isActive: boolean;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file' | 'email';
  sslEnabled: boolean;
  sslStatus: 'unknown' | 'active' | 'expired' | 'expiring_soon' | 'error';
  planLevel: 'foundation' | 'growth' | 'premium' | 'enterprise';
  _ui?: {
    formattedStatus?: string;
    statusBadge?: 'success' | 'warning' | 'error' | 'info';
    sslStatusBadge?: 'success' | 'warning' | 'error';
    formattedExpiryDate?: string;
    daysUntilExpiry?: number;
    isExpiringSoon?: boolean;
    verificationInstructions?: string[];
    dnsRecordsFormatted?: Array<{
      type: string;
      name: string;
      value: string;
      ttl?: number;
    }>;
  };
}

/**
 * Domain mapping form data
 */
export interface DomainMappingFormData {
  domain: string;
  certificateType?: 'letsencrypt' | 'custom';
  forceHttps?: boolean;
  autoRenewal?: boolean;
  verificationMethod?: 'dns' | 'file' | 'email';
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    isVerifying?: boolean;
  };
}

