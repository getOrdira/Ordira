// src/lib/types/factory-settings.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Factory type types
 * Based on backend IFactorySettings model type field
 */
export type FactoryType = 'nft' | 'voting';

/**
 * Factory settings interface
 * Based on backend IFactorySettings model
 */
export interface FactorySettings {
  _id: string;
  type: FactoryType;
  address: string;
  networkName: string;
  chainId: number;
  deployedAt: Date;
  deployedBy: string; // Relayer wallet address
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory settings creation request
 * For creating new factory settings
 */
export interface CreateFactorySettingsRequest {
  type: FactoryType;
  address: string;
  networkName: string;
  chainId: number;
  deployedBy: string;
  isActive?: boolean;
}

/**
 * Factory settings update request
 * For updating existing factory settings
 */
export interface UpdateFactorySettingsRequest {
  address?: string;
  networkName?: string;
  chainId?: number;
  isActive?: boolean;
}

/**
 * Factory settings list response
 * For paginated factory settings lists
 */
export interface FactorySettingsListResponse extends PaginatedResponse<FactorySettings> {
  factories: FactorySettings[];
  analytics: {
    totalFactories: number;
    activeFactories: number;
    nftFactories: number;
    votingFactories: number;
    networks: Array<{
      networkName: string;
      count: number;
    }>;
  };
}

/**
 * Factory settings detail response
 * For detailed factory settings information
 */
export interface FactorySettingsDetailResponse {
  factory: FactorySettings;
  network: {
    name: string;
    chainId: number;
    explorerUrl?: string;
    rpcUrl?: string;
  };
  deployment: {
    deployedAt: Date;
    deployedBy: string;
    deploymentTxHash?: string;
    gasUsed?: string;
  };
  status: {
    isActive: boolean;
    lastChecked?: Date;
    healthStatus: 'healthy' | 'warning' | 'error';
    errorMessage?: string;
  };
  usage: {
    totalContracts: number;
    activeContracts: number;
    lastDeployment?: Date;
  };
}

/**
 * Factory settings analytics response
 * For factory settings analytics and reporting
 */
export interface FactorySettingsAnalyticsResponse {
  overview: {
    totalFactories: number;
    activeFactories: number;
    nftFactories: number;
    votingFactories: number;
    totalNetworks: number;
    averageDeployments: number;
  };
  typeDistribution: Array<{
    type: FactoryType;
    count: number;
    percentage: number;
    activeCount: number;
  }>;
  networkDistribution: Array<{
    networkName: string;
    chainId: number;
    count: number;
    percentage: number;
    activeCount: number;
  }>;
  deploymentStats: Array<{
    factory: FactorySettings;
    deployments: number;
    lastDeployment?: Date;
    successRate: number;
  }>;
  monthlyStats: Array<{
    month: string;
    factoriesAdded: number;
    deployments: number;
    activeFactories: number;
  }>;
}

/**
 * Factory settings search response
 * For factory settings search results
 */
export interface FactorySettingsSearchResponse extends PaginatedResponse<FactorySettings> {
  factories: FactorySettings[];
  filters: {
    types: FactoryType[];
    networks: string[];
    chainIds: number[];
    isActive: boolean[];
    dateRange: {
      from: Date;
      to: Date;
    };
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Factory settings health check response
 * For factory settings health monitoring
 */
export interface FactorySettingsHealthCheckResponse {
  factory: FactorySettings;
  healthStatus: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    timestamp: Date;
  }>;
  networkStatus: {
    isConnected: boolean;
    latency?: number;
    lastBlock?: number;
    error?: string;
  };
  contractStatus: {
    isDeployed: boolean;
    isVerified: boolean;
    abiAvailable: boolean;
    error?: string;
  };
  lastChecked: Date;
  nextCheck: Date;
}

/**
 * Factory settings deployment request
 * For deploying new factory contracts
 */
export interface DeployFactoryRequest {
  type: FactoryType;
  networkName: string;
  chainId: number;
  deployerAddress: string;
  gasLimit?: number;
  gasPrice?: string;
  constructorArgs?: any[];
}

/**
 * Factory settings deployment response
 * For factory deployment results
 */
export interface DeployFactoryResponse {
  success: boolean;
  factory: FactorySettings;
  deployment: {
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    gasPrice: string;
    deployedAt: Date;
  };
  contract: {
    address: string;
    abi: any[];
    bytecode: string;
  };
  verification: {
    isVerified: boolean;
    verificationTxHash?: string;
    error?: string;
  };
}

/**
 * Factory settings verification request
 * For verifying factory contracts
 */
export interface VerifyFactoryRequest {
  factoryId: string;
  verificationData: {
    sourceCode: string;
    contractName: string;
    compilerVersion: string;
    optimizationUsed: boolean;
    runs?: number;
    constructorArguments?: string;
  };
}

/**
 * Factory settings verification response
 * For factory verification results
 */
export interface VerifyFactoryResponse {
  success: boolean;
  factory: FactorySettings;
  verification: {
    isVerified: boolean;
    verificationTxHash?: string;
    verifiedAt?: Date;
    error?: string;
  };
  explorerUrl?: string;
}

/**
 * Factory settings settings interface
 * For factory settings management settings
 */
export interface FactorySettingsConfig {
  deployment: {
    defaultGasLimit: number;
    maxGasPrice: string;
    gasPriceMultiplier: number;
    retryAttempts: number;
    retryDelay: number; // in seconds
  };
  verification: {
    autoVerify: boolean;
    verificationDelay: number; // in seconds
    maxRetries: number;
    supportedNetworks: string[];
  };
  monitoring: {
    healthCheckInterval: number; // in minutes
    alertOnFailure: boolean;
    alertThreshold: number; // consecutive failures
  };
  security: {
    requireDeployerVerification: boolean;
    allowedDeployers: string[];
    maxFactoriesPerType: number;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Factory type validation schema
 */
export const factoryTypeSchema = Joi.string()
  .valid('nft', 'voting')
  .required()
  .messages({
    'any.only': 'Factory type must be one of: nft, voting'
  });

/**
 * Ethereum address validation schema
 */
export const ethereumAddressSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .messages({
    'string.pattern.base': 'Address must be a valid Ethereum address'
  });

/**
 * Create factory settings request validation schema
 */
export const createFactorySettingsRequestSchema = Joi.object({
  type: factoryTypeSchema.required(),
  address: ethereumAddressSchema.required(),
  networkName: Joi.string().min(1).max(50).required(),
  chainId: Joi.number().min(1).max(999999999).required(),
  deployedBy: ethereumAddressSchema.required(),
  isActive: Joi.boolean().default(true)
});

/**
 * Update factory settings request validation schema
 */
export const updateFactorySettingsRequestSchema = Joi.object({
  address: ethereumAddressSchema.optional(),
  networkName: Joi.string().min(1).max(50).optional(),
  chainId: Joi.number().min(1).max(999999999).optional(),
  isActive: Joi.boolean().optional()
});

/**
 * Factory settings query validation schema
 */
export const factorySettingsQuerySchema = Joi.object({
  type: factoryTypeSchema.optional(),
  networkName: Joi.string().optional(),
  chainId: Joi.number().optional(),
  isActive: Joi.boolean().optional(),
  deployedBy: ethereumAddressSchema.optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'deployedAt', 'type', 'networkName').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Deploy factory request validation schema
 */
export const deployFactoryRequestSchema = Joi.object({
  type: factoryTypeSchema.required(),
  networkName: Joi.string().min(1).max(50).required(),
  chainId: Joi.number().min(1).max(999999999).required(),
  deployerAddress: ethereumAddressSchema.required(),
  gasLimit: Joi.number().min(21000).max(10000000).optional(),
  gasPrice: Joi.string().optional(),
  constructorArgs: Joi.array().optional()
});

/**
 * Verify factory request validation schema
 */
export const verifyFactoryRequestSchema = Joi.object({
  factoryId: commonSchemas.mongoId.required(),
  verificationData: Joi.object({
    sourceCode: Joi.string().required(),
    contractName: Joi.string().required(),
    compilerVersion: Joi.string().required(),
    optimizationUsed: Joi.boolean().required(),
    runs: Joi.number().min(0).max(1000000).optional(),
    constructorArguments: Joi.string().optional()
  }).required()
});

/**
 * Factory settings config validation schema
 */
export const factorySettingsConfigSchema = Joi.object({
  deployment: Joi.object({
    defaultGasLimit: Joi.number().min(21000).max(10000000).default(500000),
    maxGasPrice: Joi.string().default('100000000000'), // 100 gwei
    gasPriceMultiplier: Joi.number().min(1).max(10).default(1.2),
    retryAttempts: Joi.number().min(0).max(10).default(3),
    retryDelay: Joi.number().min(1).max(300).default(30)
  }).required(),
  verification: Joi.object({
    autoVerify: Joi.boolean().default(true),
    verificationDelay: Joi.number().min(0).max(3600).default(60),
    maxRetries: Joi.number().min(0).max(10).default(3),
    supportedNetworks: Joi.array().items(Joi.string()).required()
  }).required(),
  monitoring: Joi.object({
    healthCheckInterval: Joi.number().min(1).max(1440).default(60),
    alertOnFailure: Joi.boolean().default(true),
    alertThreshold: Joi.number().min(1).max(10).default(3)
  }).required(),
  security: Joi.object({
    requireDeployerVerification: Joi.boolean().default(true),
    allowedDeployers: Joi.array().items(ethereumAddressSchema).optional(),
    maxFactoriesPerType: Joi.number().min(1).max(100).default(10)
  }).required()
});

/**
 * Export all factory settings validation schemas
 */
export const factorySettingsValidationSchemas = {
  factoryType: factoryTypeSchema,
  ethereumAddress: ethereumAddressSchema,
  createFactorySettingsRequest: createFactorySettingsRequestSchema,
  updateFactorySettingsRequest: updateFactorySettingsRequestSchema,
  factorySettingsQuery: factorySettingsQuerySchema,
  deployFactoryRequest: deployFactoryRequestSchema,
  verifyFactoryRequest: verifyFactoryRequestSchema,
  factorySettingsConfig: factorySettingsConfigSchema
};
