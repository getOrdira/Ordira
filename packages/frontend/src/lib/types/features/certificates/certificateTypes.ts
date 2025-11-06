/**
 * Certificate Types
 * 
 * Re-exports backend certificate types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Re-export from certificates core services
export type {
  CertificateListOptions,
  CertificateListResult,
  CertificateStats,
  CertificateUsage,
  TransferUsage,
  OwnershipStatus,
  TransferHealth
} from '@backend/services/certificates/core';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Certificate status - frontend-specific type
 */
export type CertificateStatus = 
  | 'minted'
  | 'pending_transfer'
  | 'transferred_to_brand'
  | 'transfer_failed'
  | 'revoked'
  | 'pending'
  | 'delivered';

/**
 * Certificate display type with enhanced UI fields
 */
export interface CertificateDisplay {
  _id: string;
  business: string;
  product: string;
  recipient: string;
  tokenId: string;
  txHash: string;
  contractAddress?: string;
  status: CertificateStatus;
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    expirationDate?: Date;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  _ui?: {
    formattedStatus?: string;
    statusBadge?: 'success' | 'warning' | 'error' | 'info';
    formattedExpirationDate?: string;
    daysUntilExpiration?: number;
    isExpired?: boolean;
    verificationUrl?: string;
    shareUrl?: string;
  };
}

/**
 * Certificate creation form data
 */
export interface CertificateFormData {
  productId: string;
  recipientEmail: string;
  recipientWallet?: string;
  customMessage?: string;
  metadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    expirationDate?: Date;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  web3Options?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
  };
}

/**
 * Batch certificate creation form data
 */
export interface BatchCertificateFormData {
  productId: string;
  recipients: Array<{
    email: string;
    wallet?: string;
    customMessage?: string;
  }>;
  metadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
  };
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
  };
}

