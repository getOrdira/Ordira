/**
 * Symbol-based Service Tokens
 * 
 * Provides compile-time safe service tokens using TypeScript symbols
 * for better type safety and IDE support.
 */

// Import reflect-metadata at the top level
import 'reflect-metadata';

/**
 * Service token symbols for type-safe dependency injection
 */
export const SERVICE_TOKENS = {
  // Configuration
  CONFIG_SERVICE: Symbol.for('ConfigService'),
  
  // Infrastructure services
  CACHE_SERVICE: Symbol.for('CacheService'),
  DATABASE_SERVICE: Symbol.for('DatabaseService'),
  PERFORMANCE_SERVICE: Symbol.for('PerformanceService'),
  S3_SERVICE: Symbol.for('S3Service'),
  
  // Business services
  AUTH_SERVICE: Symbol.for('AuthService'),
  SECURITY_SERVICE: Symbol.for('SecurityService'),
  TENANT_SERVICE: Symbol.for('TenantService'),
  UTILS_SERVICE: Symbol.for('UtilsService'),

  // Supply Chain modular services
  SUPPLY_CHAIN_REGISTRY: Symbol.for('SupplyChainServicesRegistry'),
  SUPPLY_CHAIN_DEPLOYMENT_SERVICE: Symbol.for('SupplyChainDeploymentService'),
  SUPPLY_CHAIN_ASSOCIATION_SERVICE: Symbol.for('SupplyChainAssociationService'),
  SUPPLY_CHAIN_CONTRACT_READ_SERVICE: Symbol.for('SupplyChainContractReadService'),
  SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE: Symbol.for('SupplyChainContractWriteService'),
  SUPPLY_CHAIN_QR_CODE_SERVICE: Symbol.for('SupplyChainQrCodeService'),
  SUPPLY_CHAIN_DASHBOARD_SERVICE: Symbol.for('SupplyChainDashboardService'),
  SUPPLY_CHAIN_ANALYTICS_SERVICE: Symbol.for('SupplyChainAnalyticsService'),
  SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE: Symbol.for('SupplyChainProductLifecycleService'),
  SUPPLY_CHAIN_VALIDATION_SERVICE: Symbol.for('SupplyChainValidationService'),
  SUPPLY_CHAIN_MAPPERS: Symbol.for('SupplyChainMappers'),
  SUPPLY_CHAIN_LOG_SERVICE: Symbol.for('SupplyChainLogParsingService'),

  // Models (for dependency injection)
  USER_MODEL: Symbol.for('UserModel'),
  BUSINESS_MODEL: Symbol.for('BusinessModel'),
  MANUFACTURER_MODEL: Symbol.for('ManufacturerModel'),
  PRODUCT_MODEL: Symbol.for('ProductModel'),
  BRAND_SETTINGS_MODEL: Symbol.for('BrandSettingsModel'),
  VOTING_RECORD_MODEL: Symbol.for('VotingRecordModel'),
  CERTIFICATE_MODEL: Symbol.for('CertificateModel'),
  MEDIA_MODEL: Symbol.for('MediaModel'),
  SECURITY_EVENT_MODEL: Symbol.for('SecurityEventModel'),
  ACTIVE_SESSION_MODEL: Symbol.for('ActiveSessionModel'),
  BLACKLISTED_TOKEN_MODEL: Symbol.for('BlacklistedTokenModel'),
} as const;

/**
 * Type for service tokens
 */
export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

/**
 * Helper to create typed service tokens
 */
export function createServiceToken<T>(name: string): symbol {
  return Symbol.for(name);
}

