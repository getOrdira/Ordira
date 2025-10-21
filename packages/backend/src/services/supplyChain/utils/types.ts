// src/services/supplyChain/utils/types.ts

// ===== ENUMS =====

export enum SupplyChainEventType {
  SOURCED = 'sourced',
  MANUFACTURED = 'manufactured',
  QUALITY_CHECKED = 'quality_checked',
  PACKAGED = 'packaged',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered'
}

export enum SupplyChainStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DEPRECATED = 'deprecated'
}

export enum ContractType {
  SUPPLY_CHAIN = 'supplychain',
  VOTING = 'voting',
  NFT = 'nft'
}

export enum QrCodeType {
  SUPPLY_CHAIN_TRACKING = 'supply_chain_tracking',
  CERTIFICATE_VERIFICATION = 'certificate_verification',
  VOTING = 'voting'
}

// ===== INTERFACES =====

export interface ISupplyChainEndpoint {
  id: number;
  name: string;
  eventType: SupplyChainEventType;
  location: string;
  isActive: boolean;
  eventCount: number;
  createdAt: number;
}

export interface ISupplyChainProduct {
  id: number;
  productId: string;
  name: string;
  description?: string;
  totalEvents: number;
  createdAt: number;
  isActive: boolean;
}

export interface ISupplyChainEvent {
  id: number;
  eventType: string;
  productId: string;
  location: string;
  details: string;
  timestamp: number;
  loggedBy: string;
  isValid: boolean;
}

export interface IContractStats {
  totalEvents: number;
  totalProducts: number;
  totalEndpoints: number;
  businessId: string;
  manufacturerName: string;
}

export interface ISupplyChainDeployment {
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  deploymentCost: string;
  businessId: string;
  manufacturerName: string;
}

export interface IEndpointData {
  name: string;
  eventType: SupplyChainEventType;
  location: string;
}

export interface IProductData {
  productId: string;
  name: string;
  description: string;
}

export interface IEventData {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details: string;
}

// ===== DTOs =====

export interface ICreateEndpointDTO {
  name: string;
  eventType: SupplyChainEventType;
  location: string;
}

export interface ICreateProductDTO {
  productId: string;
  name: string;
  description?: string;
}

export interface ILogEventDTO {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details?: string;
}

export interface IDeployContractDTO {
  businessId: string;
  manufacturerName: string;
  gasLimit?: bigint;
  gasPrice?: string;
  value?: string;
}

// ===== QR CODE TYPES =====

export interface IQrCodeOptions {
  size?: number;
  format?: 'png' | 'svg' | 'pdf';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  logo?: {
    url: string;
    size: number;
  };
}

export interface IQrCodeResult {
  data: string; // Base64 encoded image or SVG string
  format: string;
  size: number;
  errorCorrectionLevel: string;
}

export interface ISupplyChainQrCodeData {
  type: QrCodeType.SUPPLY_CHAIN_TRACKING;
  productId: string;
  productName: string;
  manufacturerId: string;
  timestamp: string;
  trackingUrl: string;
}

export interface ICertificateQrCodeData {
  type: QrCodeType.CERTIFICATE_VERIFICATION;
  certificateId: string;
  tokenId: string;
  contractAddress: string;
  verificationUrl: string;
  timestamp: string;
}

export interface IVotingQrCodeData {
  type: QrCodeType.VOTING;
  proposalId: string;
  voterEmail: string;
  votingUrl: string;
  timestamp: string;
}

export type IQrCodeData = ISupplyChainQrCodeData | ICertificateQrCodeData | IVotingQrCodeData;

// ===== RESPONSE TYPES =====

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IPaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface IDeploymentResult {
  deployment: ISupplyChainDeployment;
  success: boolean;
  error?: string;
}

export interface IEndpointResult {
  endpointId: number;
  txHash: string;
  success: boolean;
  error?: string;
}

export interface IProductResult {
  productId: number;
  txHash: string;
  success: boolean;
  error?: string;
}

export interface IEventResult {
  eventId: number;
  txHash: string;
  success: boolean;
  error?: string;
}

// ===== BLOCKCHAIN TYPES =====

export interface ITransactionReceipt {
  blockNumber: number;
  gasUsed: string;
  logs: ITransactionLog[];
  status: 'success' | 'failed';
  transactionHash: string;
}

export interface ITransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface IContractCall {
  contractAddress: string;
  method: string;
  args: any[];
  options?: {
    gasLimit?: bigint;
    gasPrice?: string;
    value?: string;
  };
}

// ===== ANALYTICS TYPES =====

export interface ISupplyChainAnalytics {
  totalProducts: number;
  totalEvents: number;
  totalEndpoints: number;
  eventsByType: Record<SupplyChainEventType, number>;
  eventsByLocation: Record<string, number>;
  eventsByTimeframe: {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
  productLifecycleStats: {
    averageTimeToDelivery: number;
    completionRate: number;
    bottleneckLocations: string[];
  };
}

export interface IDashboardData {
  overview: {
    totalProducts: number;
    totalEvents: number;
    activeEndpoints: number;
    lastEventTime: Date;
  };
  recentActivity: ISupplyChainEvent[];
  topProducts: Array<{
    productId: string;
    name: string;
    eventCount: number;
  }>;
  analytics: ISupplyChainAnalytics;
}

// ===== VALIDATION TYPES =====

export interface IValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IDeploymentValidation {
  businessId: string;
  manufacturerName: string;
}

export interface IEndpointValidation {
  name: string;
  eventType: SupplyChainEventType;
  location: string;
}

export interface IProductValidation {
  productId: string;
  name: string;
  description?: string;
}

export interface IEventValidation {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details?: string;
}

// ===== CONFIGURATION TYPES =====

export interface ISupplyChainConfig {
  factoryAddress: string;
  networkId: string;
  gasLimit: bigint;
  deploymentCost: string;
  maxRetries: number;
  retryDelay: number;
}

export interface IQrCodeConfig {
  defaultSize: number;
  defaultFormat: 'png' | 'svg' | 'pdf';
  defaultErrorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  maxDataLength: number;
  logoSize: number;
}

// ===== ERROR TYPES =====

export interface ISupplyChainError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface IBlockchainError extends ISupplyChainError {
  transactionHash?: string;
  gasUsed?: string;
  blockNumber?: number;
}

// ===== UTILITY TYPES =====

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type SupplyChainEntity = ISupplyChainEndpoint | ISupplyChainProduct | ISupplyChainEvent;
export type SupplyChainOperation = 'create' | 'read' | 'update' | 'delete';
export type SupplyChainResource = 'endpoint' | 'product' | 'event' | 'contract';

export interface IOperationContext {
  businessId: string;
  contractAddress: string;
  userId?: string;
  timestamp: Date;
  operation: SupplyChainOperation;
  resource: SupplyChainResource;
}
