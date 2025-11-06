/**
 * Supply Chain Types
 * 
 * Re-exports backend supply chain types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  SupplyChainEventType,
  SupplyChainStatus,
  ContractType,
  QrCodeType,
  ISupplyChainEndpoint,
  ISupplyChainProduct,
  ISupplyChainEvent,
  IContractStats,
  ISupplyChainDeployment,
  IEndpointData,
  IProductData,
  IEventData,
  ICreateEndpointDTO,
  ICreateProductDTO,
  ILogEventDTO,
  IDeployContractDTO,
  IQrCodeOptions,
  IQrCodeResult,
  ISupplyChainQrCodeData,
  ICertificateQrCodeData,
  IVotingQrCodeData,
  IQrCodeData,
  IQrCodeGenerationRequest,
  IQrCodeGenerationResult,
  ISupplyChainQrCodeRequest,
  ICertificateQrCodeRequest,
  IVotingQrCodeRequest,
  IApiResponse,
  IPaginatedResponse,
  IDeploymentResult,
  IEndpointResult,
  IProductResult,
  IEventResult,
  ITransactionReceipt,
  ITransactionLog,
  IContractCall,
  ISupplyChainAnalytics,
  IDashboardData,
  IValidationResult,
  IDeploymentValidation,
  IEndpointValidation,
  IProductValidation,
  IEventValidation,
  ISupplyChainConfig,
  IQrCodeConfig,
  ISupplyChainError,
  IBlockchainError,
  Optional,
  RequiredFields,
  PartialExcept,
  SupplyChainEntity,
  SupplyChainOperation,
  SupplyChainResource,
  IOperationContext
} from '@backend/services/supplyChain/utils/types';

// Re-export all backend types
export type {
  SupplyChainEventType,
  SupplyChainStatus,
  ContractType,
  QrCodeType,
  ISupplyChainEndpoint,
  ISupplyChainProduct,
  ISupplyChainEvent,
  IContractStats,
  ISupplyChainDeployment,
  IEndpointData,
  IProductData,
  IEventData,
  ICreateEndpointDTO,
  ICreateProductDTO,
  ILogEventDTO,
  IDeployContractDTO,
  IQrCodeOptions,
  IQrCodeResult,
  ISupplyChainQrCodeData,
  ICertificateQrCodeData,
  IVotingQrCodeData,
  IQrCodeData,
  IQrCodeGenerationRequest,
  IQrCodeGenerationResult,
  ISupplyChainQrCodeRequest,
  ICertificateQrCodeRequest,
  IVotingQrCodeRequest,
  IApiResponse,
  IPaginatedResponse,
  IDeploymentResult,
  IEndpointResult,
  IProductResult,
  IEventResult,
  ITransactionReceipt,
  ITransactionLog,
  IContractCall,
  ISupplyChainAnalytics,
  IDashboardData,
  IValidationResult,
  IDeploymentValidation,
  IEndpointValidation,
  IProductValidation,
  IEventValidation,
  ISupplyChainConfig,
  IQrCodeConfig,
  ISupplyChainError,
  IBlockchainError,
  Optional,
  RequiredFields,
  PartialExcept,
  SupplyChainEntity,
  SupplyChainOperation,
  SupplyChainResource,
  IOperationContext
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Supply chain event display type with enhanced UI fields
 */
export interface SupplyChainEventDisplay extends ISupplyChainEvent {
  _ui?: {
    formattedTimestamp?: string;
    relativeTime?: string;
    locationDetails?: {
      name: string;
      coordinates?: [number, number];
      address?: string;
    };
    eventTypeLabel?: string;
    statusBadge?: 'success' | 'warning' | 'error' | 'info';
  };
}

/**
 * Supply chain endpoint form data
 */
export interface SupplyChainEndpointFormData extends ICreateEndpointDTO {
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
  };
}

/**
 * Supply chain product form data
 */
export interface SupplyChainProductFormData extends ICreateProductDTO {
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    mediaFiles?: File[];
  };
}

/**
 * Supply chain event form data
 */
export interface SupplyChainEventFormData extends ILogEventDTO {
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    attachedFiles?: File[];
  };
}

/**
 * QR code generation form data
 */
export interface QrCodeGenerationFormData {
  type: QrCodeType;
  data: any;
  options?: IQrCodeOptions & {
    _ui?: {
      preview?: boolean;
      downloadFormat?: 'png' | 'svg' | 'pdf';
    };
  };
}

/**
 * Supply chain dashboard view options
 */
export interface SupplyChainDashboardViewOptions {
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'all';
  eventTypeFilter?: SupplyChainEventType[];
  locationFilter?: string[];
  productFilter?: string[];
  viewMode?: 'timeline' | 'map' | 'table';
}

