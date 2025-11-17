/**
 * Service Getter Functions
 * 
 * Provides type-safe getter functions for all registered services.
 * These functions maintain backward compatibility with existing controllers.
 */

import { getContainer } from './container.service';
import type { UserDataService } from '../users/core/userData.service';  
import type { MediaDataService } from '../media/core/mediaData.service';
import type { BrandAccountService } from '../brands';
import type { BillingManagementService as BillingService } from '../subscriptions/features/billingManagement.service';
import type { NftService } from '../blockchain/nft.service';
import type { SupplyChainService } from '../blockchain/supplyChain.service';
import type { SupplyChainQrCodeService as QrCodeService } from '../supplyChain/features/qrCode.service';
import type { SecurityAuditService } from '../security/securityAudit.service';
import type { UsageDataService } from '../usage/core/usageData.service';
import type {
  VerificationService,
  AnalyticsService as BrandAnalyticsService,
  WalletService,
  IntegrationsService,
  DiscoveryService,
  PlanValidationService,
  DomainValidationService,
  BrandValidationService,
  BrandHelpersService,
  CompletenessCalculatorService,
  RecommendationEngineService
} from '../brands';
import type {
  EcommerceOrderProcessingService,
  EcommerceProductSyncService,
  EcommerceWebhookOrchestratorService,
  EcommerceConnectionHealthService,
  EcommerceAnalyticsService
} from '../integrations/ecommerce';
import type {
  StripeGatewayService,
  TokenDiscountService,
  SubscriptionDataService,
  SubscriptionLifecycleService,
  SubscriptionUsageLimitsService,
  SubscriptionAnalyticsService,
  SubscriptionTierManagementService,
  SubscriptionPlanValidationService,
  BillingManagementService
} from '../subscriptions';
import type {
  SupplyChainServicesRegistry,
  DeploymentService,
  AssociationService,
  ContractReadService,
  ContractWriteService,
  SupplyChainQrCodeService,
  SupplyChainDashboardService,
  SupplyChainAnalyticsService,
  ProductLifecycleService,
  SupplyChainValidationService,
  SupplyChainMappers,
  LogParsingService
} from '../supplyChain';

// Import service types for type safety
import { authService } from '../auth/index';
import {
  tenantServices,
  tenantDataService,
  tenantResolutionService,
  tenantManagementService,
  tenantAnalyticsService,
  tenantCacheService,
  tenantDomainValidationService
} from '../tenants';
import {
  userServices,
  userAuthService,
  userProfileService,
  userSearchService,
  userAnalyticsService,
  userDataService,
  userCacheService,
  userProfileFormatterService,
  userValidationService
} from '../users';
import {
  productDataService,
  productAccountService,
  productSearchService,
  productAnalyticsService,
  productAggregationService,
  productCacheService,
  productValidationService
} from '../products';
import {
  platformAnalyticsDataService,
  reportingDataService,
  dashboardAggregationService,
  platformInsightsService,
  reportGenerationService,
  systemHealthService,
  analyticsValidationService
} from '../analytics';
import {
  votesServices,
  votingDataService,
  votingContractService,
  votingStatsService,
  votingAnalyticsService,
  votingDashboardService,
  votingProposalsService,
  votingProposalManagementService,
  votingContractDeploymentService,
  votingValidationService
} from '../votes';
import {
  apiKeyServices,
  apiKeyDataService,
  apiKeyUsageService,
  apiKeyManagementService,
  apiKeyValidationService
} from '../apiKey';
import {
  certificateDataService,
  certificateAccountService,
  mintingService,
  transferService,
  batchService,
  deliveryService,
  certificateAnalyticsService,
  certificateHelpersService,
  metadataGeneratorService,
  imageGeneratorService,
  certificateValidationService,
  planValidationService as certificatePlanValidationService,
  recipientValidationService
} from '../certificates';
import { NotificationsServices as notificationsModule } from '../notifications';
import { notificationsService } from '../notifications/notifications.service';
import {
  subscriptionServices
} from '../subscriptions';
import {
  usageServices,
  usageLimitsService,
  usageUpdatesService,
  usagePlanService,
  usageDataService,
  usageCacheService,
  usageForecastService,
  usageValidationService
} from '../usage';
import {
  brandProfileCoreService,
  brandSettingsCoreService,
  brandAccountCoreService,
  customerAccessService
} from '../brands';
import {
  manufacturerDataCoreService,
  manufacturerAccountCoreService,
  manufacturerProfileCoreService,
  verificationService,
  supplyChainService,
  analyticsService,
  manufacturerSearchService,
  manufacturerMediaService,
  scoreCalculatorService,
  manufacturerHelpersService,
  comparisonEngineService,
  fileValidationService,
  manufacturerValidationService,
  planValidationService
} from '../manufacturers';
import {
  ecommerceServices,
  ecommerceProviders
} from '../integrations/ecommerce';
import type { EcommerceProvider, ProviderFeatureAdapters } from '../integrations/ecommerce';
import {
  securityServices,
  securityEventDataService as infrastructureSecurityEventDataService,
  sessionDataService as infrastructureSecuritySessionDataService,
  tokenBlacklistDataService as infrastructureTokenBlacklistDataService,
  securityScanDataService as infrastructureSecurityScanDataService,
  securityEventLoggerService as infrastructureSecurityEventLoggerService,
  sessionManagementService as infrastructureSecuritySessionManagementService,
  tokenRevocationService as infrastructureSecurityTokenRevocationService,
  securityAnalyticsService as infrastructureSecurityAnalyticsService,
  securityScanningService as infrastructureSecurityScanningService,
  securityValidationService as infrastructureSecurityValidationService,
  securityScanValidationService as infrastructureSecurityScanValidationService
} from '../infrastructure/security';
import {
  streamingServices,
  streamingService
} from '../infrastructure/streaming';
import {
  readReplicaService,
  executeAnalyticsQuery,
  executeReportingQuery,
  executeReadOnlyQuery,
  enhancedDatabaseService,
  connectionManager,
  maintenanceRunner,
  databaseService,
  databaseOptimizationService,
  queryOptimizationService,
  aggregationOptimizationService,
  databaseValidationService,
  databasePlatformConfigService,
  databaseOpsPlaybook,
  schemaDriftDetectorService,
  atlasBestPracticesService,
  filterGuardService,
  paginationService,
  databaseServices
} from '../infrastructure/database';
import {
  slidingWindowRateLimiter,
  slidingWindowConfigs,
  slidingWindowMiddleware,
  circuitBreakerRegistry,
  jobQueueAdapter,
  backgroundTaskProcessorService,
  retryPolicyService,
  queueDashboardService,
  resilienceServices
} from '../infrastructure/resilience';
import { configService } from '../infrastructure/config';
import {
  monitoringService,
  performanceService,
  memoryMonitorService,
  observabilityServices
} from '../infrastructure/observability';
import {
  cacheConnectionService,
  cacheStoreService,
  redisClusterService,
  enhancedCacheService,
  cacheValidationService,
  cacheServices
} from '../infrastructure/cache';

type EcommerceAdapterRegistry = Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;

// Core Services
export const getAuthService = () => getContainer().get<typeof authService>('authService');
export const getUserService = () => getContainer().get<UserDataService>('userService');
export const getUserServices = () => getContainer().get<typeof userServices>('userServices');
export const getUserAuthService = () => getContainer().get<typeof userAuthService>('userAuthService');
export const getUserProfileService = () => getContainer().get<typeof userProfileService>('userProfileService');
export const getUserSearchService = () => getContainer().get<typeof userSearchService>('userSearchService');
export const getUserAnalyticsService = () => getContainer().get<typeof userAnalyticsService>('userAnalyticsService');
export const getUserDataService = () => getContainer().get<typeof userDataService>('userDataService');
export const getUserCacheService = () => getContainer().get<typeof userCacheService>('userCacheService');
export const getUserFormatterService = () => getContainer().get<typeof userProfileFormatterService>('userProfileFormatterService');
export const getUserValidationService = () => getContainer().get<typeof userValidationService>('userValidationService');

// Tenant Services
export const getTenantServices = () => getContainer().get<typeof tenantServices>('tenantServices');
export const getTenantDataService = () => getContainer().get<typeof tenantDataService>('tenantDataService');
export const getTenantResolutionService = () => getContainer().get<typeof tenantResolutionService>('tenantResolutionService');
export const getTenantManagementService = () => getContainer().get<typeof tenantManagementService>('tenantManagementService');
export const getTenantAnalyticsService = () => getContainer().get<typeof tenantAnalyticsService>('tenantAnalyticsService');
export const getTenantCacheService = () => getContainer().get<typeof tenantCacheService>('tenantCacheService');
export const getTenantValidationService = () => getContainer().get<typeof tenantDomainValidationService>('tenantDomainValidationService');

// Product Services
export const getProductDataService = () => getContainer().get<typeof productDataService>('productDataService');
export const getProductAccountService = () => getContainer().get<typeof productAccountService>('productAccountService');
export const getProductSearchService = () => getContainer().get<typeof productSearchService>('productSearchService');
export const getProductAnalyticsService = () => getContainer().get<typeof productAnalyticsService>('productAnalyticsService');
export const getProductAggregationService = () => getContainer().get<typeof productAggregationService>('productAggregationService');
export const getProductCacheService = () => getContainer().get<typeof productCacheService>('productCacheService');
export const getProductValidationService = () => getContainer().get<typeof productValidationService>('productValidationService');

// Analytics Services
export const getPlatformAnalyticsDataService = () => getContainer().get<typeof platformAnalyticsDataService>('platformAnalyticsDataService');
export const getReportingDataService = () => getContainer().get<typeof reportingDataService>('reportingDataService');
export const getDashboardAggregationService = () => getContainer().get<typeof dashboardAggregationService>('dashboardAggregationService');
export const getPlatformInsightsService = () => getContainer().get<typeof platformInsightsService>('platformInsightsService');
export const getReportGenerationService = () => getContainer().get<typeof reportGenerationService>('reportGenerationService');
export const getSystemHealthService = () => getContainer().get<typeof systemHealthService>('systemHealthService');
export const getAnalyticsValidationService = () => getContainer().get<typeof analyticsValidationService>('analyticsValidationService');

// Ecommerce Services
export const getEcommerceServicesRegistry = () => getContainer().get<typeof ecommerceServices>('ecommerceServicesRegistry');
export const getEcommerceProvidersRegistry = () => getContainer().get<typeof ecommerceProviders>('ecommerceProvidersRegistry');
export const getEcommerceAdapterRegistry = () => getContainer().get<EcommerceAdapterRegistry>('ecommerceAdapterRegistry');
export const getEcommerceIntegrationDataService = () => getContainer().get<typeof ecommerceServices.core.data>('ecommerceIntegrationDataService');
export const getEcommerceOAuthService = () => getContainer().get<typeof ecommerceServices.core.oauth>('ecommerceOAuthService');
export const getEcommerceHttpClientFactoryService = () => getContainer().get<typeof ecommerceServices.core.httpClientFactory>('ecommerceHttpClientFactoryService');
export const getEcommerceWebhookRegistryService = () => getContainer().get<typeof ecommerceServices.core.webhookRegistry>('ecommerceWebhookRegistryService');
export const getEcommerceCertificateDispatchService = () => getContainer().get<typeof ecommerceServices.core.certificateDispatch>('ecommerceCertificateDispatchService');
export const getEcommerceUtilities = () => getContainer().get<typeof ecommerceServices.utils>('ecommerceUtilities');
export const getEcommerceOrderProcessingService = () => getContainer().get<EcommerceOrderProcessingService>('ecommerceOrderProcessingService');
export const getEcommerceProductSyncService = () => getContainer().get<EcommerceProductSyncService>('ecommerceProductSyncService');
export const getEcommerceWebhookOrchestratorService = () => getContainer().get<EcommerceWebhookOrchestratorService>('ecommerceWebhookOrchestratorService');
export const getEcommerceConnectionHealthService = () => getContainer().get<EcommerceConnectionHealthService>('ecommerceConnectionHealthService');
export const getEcommerceAnalyticsService = () => getContainer().get<EcommerceAnalyticsService>('ecommerceAnalyticsService');

// Business Services
export const getMediaService = () => getContainer().get<MediaDataService>('mediaService');
export const getBrandAccountService = () => getContainer().get<BrandAccountService>('brandAccountService');
export const getBillingService = () => getContainer().get<BillingService>('billingService');
export const getNotificationsService = () => getContainer().get<typeof notificationsService>('notificationsService');
export const getNotificationsServices = () => getContainer().get<typeof notificationsModule>('notificationsServices');
export const getStripeService = () => getContainer().get<StripeGatewayService>('stripeService');
export const getTokenDiscountService = () => getContainer().get<TokenDiscountService>('tokenDiscountService');
export const getNftService = () => getContainer().get<NftService>('nftService');

// Domain Services
export const getDomainRegistryService = () => getContainer().get('domainRegistryService');
export const getDomainValidationService = () => getContainer().get('domainValidationService');
export const getDomainVerificationService = () => getContainer().get('domainVerificationService');
export const getDomainDnsService = () => getContainer().get('domainDnsService');
export const getDomainCertificateLifecycleService = () => getContainer().get('domainCertificateLifecycleService');
export const getDomainHealthService = () => getContainer().get('domainHealthService');
export const getDomainAnalyticsService = () => getContainer().get('domainAnalyticsService');
export const getDomainCacheService = () => getContainer().get('domainCacheService');
export const getDomainServices = () => ({
  registry: getDomainRegistryService(),
  validation: getDomainValidationService(),
  verification: getDomainVerificationService(),
  dns: getDomainDnsService(),
  certificateLifecycle: getDomainCertificateLifecycleService(),
  health: getDomainHealthService(),
  analytics: getDomainAnalyticsService(),
  cache: getDomainCacheService()
});

// Subscription Services
export const getSubscriptionServices = () => getContainer().get<typeof subscriptionServices>('subscriptionServices');
export const getSubscriptionDataService = () => getContainer().get<SubscriptionDataService>('subscriptionDataService');
export const getSubscriptionLifecycleService = () => getContainer().get<SubscriptionLifecycleService>('subscriptionLifecycleService');
export const getSubscriptionUsageLimitsService = () => getContainer().get<SubscriptionUsageLimitsService>('subscriptionUsageLimitsService');
export const getSubscriptionAnalyticsService = () => getContainer().get<SubscriptionAnalyticsService>('subscriptionAnalyticsService');
export const getSubscriptionTierManagementService = () => getContainer().get<SubscriptionTierManagementService>('subscriptionTierManagementService');
export const getSubscriptionPlanValidationService = () => getContainer().get<SubscriptionPlanValidationService>('subscriptionPlanValidationService');
export const getSubscriptionBillingService = () => getContainer().get<BillingManagementService>('subscriptionBillingService');

// Usage Services
export const getUsageServicesRegistry = () => getContainer().get<typeof usageServices>('usageServices');
export const getUsageLimitsService = () => getContainer().get<typeof usageLimitsService>('usageLimitsService');
export const getUsageUpdatesService = () => getContainer().get<typeof usageUpdatesService>('usageUpdatesService');
export const getUsagePlanService = () => getContainer().get<typeof usagePlanService>('usagePlanService');
export const getUsageDataService = () => getContainer().get<typeof usageDataService>('usageDataService');
export const getUsageCacheService = () => getContainer().get<typeof usageCacheService>('usageCacheService');
export const getUsageForecastService = () => getContainer().get<typeof usageForecastService>('usageForecastService');
export const getUsageValidationService = () => getContainer().get<typeof usageValidationService>('usageValidationService');

// Supply Chain Services
export const getSupplyChainService = () => getContainer().get<SupplyChainService>('supplyChainService');
export const getQrCodeService = () => getContainer().get<QrCodeService>('qrCodeService');
export const getSecurityAuditService = () => getContainer().get<SecurityAuditService>('securityAuditService');
export const getSupplyChainServicesRegistry = () => getContainer().get<SupplyChainServicesRegistry>('supplyChainServicesRegistry');
export const getSupplyChainDeploymentService = () => getContainer().get<DeploymentService>('supplyChainDeploymentService');
export const getSupplyChainAssociationService = () => getContainer().get<AssociationService>('supplyChainAssociationService');
export const getSupplyChainContractReadService = () => getContainer().get<ContractReadService>('supplyChainContractReadService');
export const getSupplyChainContractWriteService = () => getContainer().get<ContractWriteService>('supplyChainContractWriteService');
export const getSupplyChainQrCodeService = () => getContainer().get<SupplyChainQrCodeService>('supplyChainQrCodeService');
export const getSupplyChainDashboardService = () => getContainer().get<SupplyChainDashboardService>('supplyChainDashboardService');
export const getSupplyChainAnalyticsService = () => getContainer().get<SupplyChainAnalyticsService>('supplyChainAnalyticsService');
export const getSupplyChainProductLifecycleService = () => getContainer().get<ProductLifecycleService>('supplyChainProductLifecycleService');
export const getSupplyChainValidationService = () => getContainer().get<SupplyChainValidationService>('supplyChainValidationService');
export const getSupplyChainMappers = () => getContainer().get<SupplyChainMappers>('supplyChainMappers');
export const getSupplyChainLogParsingService = () => getContainer().get<LogParsingService>('supplyChainLogParsingService');
export const getSupplyChainServices = () => ({
  registry: getSupplyChainServicesRegistry(),
  core: {
    deployment: getSupplyChainDeploymentService(),
    association: getSupplyChainAssociationService(),
    contractRead: getSupplyChainContractReadService(),
    contractWrite: getSupplyChainContractWriteService()
  },
  features: {
    qrCode: getSupplyChainQrCodeService(),
    dashboard: getSupplyChainDashboardService(),
    analytics: getSupplyChainAnalyticsService(),
    productLifecycle: getSupplyChainProductLifecycleService()
  },
  utilities: {
    validation: getSupplyChainValidationService(),
    mappers: getSupplyChainMappers(),
    logParsing: getSupplyChainLogParsingService()
  }
});

// Brand Services
export const getBrandProfileCoreService = () => getContainer().get<typeof brandProfileCoreService>('brandProfileCoreService');
export const getBrandSettingsCoreService = () => getContainer().get<typeof brandSettingsCoreService>('brandSettingsCoreService');
export const getBrandAccountCoreService = () => getContainer().get<typeof brandAccountCoreService>('brandAccountCoreService');
export const getVerificationService = () => getContainer().get<VerificationService>('verificationService');
export const getBrandAnalyticsService = () => getContainer().get<BrandAnalyticsService>('brandAnalyticsService');
export const getWalletService = () => getContainer().get<WalletService>('walletService');
export const getIntegrationsService = () => getContainer().get<IntegrationsService>('integrationsService');
export const getDiscoveryService = () => getContainer().get<DiscoveryService>('discoveryService');
export const getPlanValidationService = () => getContainer().get<PlanValidationService>('planValidationService');
export const getBrandValidationService = () => getContainer().get<BrandValidationService>('brandValidationService');
export const getBrandHelpersService = () => getContainer().get<BrandHelpersService>('brandHelpersService');
export const getCompletenessCalculatorService = () => getContainer().get<CompletenessCalculatorService>('completenessCalculatorService');
export const getRecommendationEngineService = () => getContainer().get<RecommendationEngineService>('recommendationEngineService');
export const getCustomerAccessService = () => getContainer().get<typeof customerAccessService>('customerAccessService');

// Manufacturer Services
export const getManufacturerDataCoreService = () => getContainer().get<typeof manufacturerDataCoreService>('manufacturerDataCoreService');
export const getManufacturerAccountCoreService = () => getContainer().get<typeof manufacturerAccountCoreService>('manufacturerAccountCoreService');
export const getManufacturerProfileCoreService = () => getContainer().get<typeof manufacturerProfileCoreService>('manufacturerProfileCoreService');
export const getManufacturerVerificationService = () => getContainer().get<typeof verificationService>('manufacturerVerificationService');
export const getManufacturerSupplyChainService = () => getContainer().get<typeof supplyChainService>('manufacturerSupplyChainService');
export const getManufacturerAnalyticsService = () => getContainer().get<typeof analyticsService>('manufacturerAnalyticsService');
export const getManufacturerSearchService = () => getContainer().get<typeof manufacturerSearchService>('manufacturerSearchService');
export const getManufacturerMediaService = () => getContainer().get<typeof manufacturerMediaService>('manufacturerMediaService');
export const getManufacturerScoreCalculatorService = () => getContainer().get<typeof scoreCalculatorService>('manufacturerScoreCalculatorService');
export const getManufacturerHelpersService = () => getContainer().get<typeof manufacturerHelpersService>('manufacturerHelpersService');
export const getManufacturerComparisonEngineService = () => getContainer().get<typeof comparisonEngineService>('manufacturerComparisonEngineService');
export const getManufacturerFileValidationService = () => getContainer().get<typeof fileValidationService>('manufacturerFileValidationService');
export const getManufacturerValidationService = () => getContainer().get<typeof manufacturerValidationService>('manufacturerValidationService');
export const getManufacturerPlanValidationService = () => getContainer().get<typeof planValidationService>('manufacturerPlanValidationService');

// Certificate Services
export const getCertificateDataService = () => getContainer().get<typeof certificateDataService>('certificateDataService');
export const getCertificateAccountService = () => getContainer().get<typeof certificateAccountService>('certificateAccountService');
export const getCertificateMintingService = () => getContainer().get<typeof mintingService>('certificateMintingService');
export const getCertificateTransferService = () => getContainer().get<typeof transferService>('certificateTransferService');
export const getCertificateBatchService = () => getContainer().get<typeof batchService>('certificateBatchService');
export const getCertificateDeliveryService = () => getContainer().get<typeof deliveryService>('certificateDeliveryService');
export const getCertificateAnalyticsService = () => getContainer().get<typeof certificateAnalyticsService>('certificateAnalyticsService');
export const getCertificateHelpersService = () => getContainer().get<typeof certificateHelpersService>('certificateHelpersService');
export const getCertificateMetadataService = () => getContainer().get<typeof metadataGeneratorService>('certificateMetadataService');
export const getCertificateImageService = () => getContainer().get<typeof imageGeneratorService>('certificateImageService');
export const getCertificateValidationService = () => getContainer().get<typeof certificateValidationService>('certificateValidationService');
export const getCertificatePlanValidationService = () => getContainer().get<typeof certificatePlanValidationService>('certificatePlanValidationService');
export const getCertificateRecipientValidationService = () => getContainer().get<typeof recipientValidationService>('certificateRecipientValidationService');

// Voting Services
export const getVotesServices = () => getContainer().get<typeof votesServices>('votesServices');
export const getVotingDataService = () => getContainer().get<typeof votingDataService>('votingDataService');
export const getVotingContractService = () => getContainer().get<typeof votingContractService>('votingContractService');
export const getVotingStatsService = () => getContainer().get<typeof votingStatsService>('votingStatsService');
export const getVotingAnalyticsService = () => getContainer().get<typeof votingAnalyticsService>('votingAnalyticsService');
export const getVotingDashboardService = () => getContainer().get<typeof votingDashboardService>('votingDashboardService');
export const getVotingProposalsService = () => getContainer().get<typeof votingProposalsService>('votingProposalsService');
export const getVotingProposalManagementService = () => getContainer().get<typeof votingProposalManagementService>('votingProposalManagementService');
export const getVotingContractDeploymentService = () => getContainer().get<typeof votingContractDeploymentService>('votingContractDeploymentService');
export const getVotingValidationService = () => getContainer().get<typeof votingValidationService>('votingValidationService');

// API Key Services
export const getApiKeyServices = () => getContainer().get<typeof apiKeyServices>('apiKeyServices');
export const getApiKeyDataService = () => getContainer().get<typeof apiKeyDataService>('apiKeyDataService');
export const getApiKeyUsageService = () => getContainer().get<typeof apiKeyUsageService>('apiKeyUsageService');
export const getApiKeyManagementService = () => getContainer().get<typeof apiKeyManagementService>('apiKeyManagementService');
export const getApiKeyValidationService = () => getContainer().get<typeof apiKeyValidationService>('apiKeyValidationService');

// Security Services
export const getSecurityServices = () => getContainer().get<typeof securityServices>('securityServices');
export const getSecurityEventDataService = () => getContainer().get<typeof infrastructureSecurityEventDataService>('securityEventDataService');
export const getSecuritySessionDataService = () => getContainer().get<typeof infrastructureSecuritySessionDataService>('securitySessionDataService');
export const getSecurityTokenBlacklistDataService = () => getContainer().get<typeof infrastructureTokenBlacklistDataService>('securityTokenBlacklistDataService');
export const getSecurityScanDataService = () => getContainer().get<typeof infrastructureSecurityScanDataService>('securityScanDataService');
export const getSecurityEventLoggerService = () => getContainer().get<typeof infrastructureSecurityEventLoggerService>('securityEventLoggerService');
export const getSecuritySessionManagementService = () => getContainer().get<typeof infrastructureSecuritySessionManagementService>('securitySessionManagementService');
export const getSecurityTokenRevocationService = () => getContainer().get<typeof infrastructureSecurityTokenRevocationService>('securityTokenRevocationService');
export const getSecurityAnalyticsService = () => getContainer().get<typeof infrastructureSecurityAnalyticsService>('securityAnalyticsService');
export const getSecurityScanningService = () => getContainer().get<typeof infrastructureSecurityScanningService>('securityScanningService');
export const getSecurityValidationService = () => getContainer().get<typeof infrastructureSecurityValidationService>('securityValidationService');
export const getSecurityScanValidationService = () => getContainer().get<typeof infrastructureSecurityScanValidationService>('securityScanValidationService');

// Infrastructure Services
export const getStreamingService = () => getContainer().get<typeof streamingService>('streamingService');
export const getStreamingServices = () => getContainer().get<typeof streamingServices>('streamingServices');
export const getSlidingWindowRateLimiter = () => getContainer().get<typeof slidingWindowRateLimiter>('slidingWindowRateLimiter');
export const getSlidingWindowConfigs = () => getContainer().get<typeof slidingWindowConfigs>('slidingWindowConfigs');
export const getSlidingWindowMiddleware = () => getContainer().get<typeof slidingWindowMiddleware>('slidingWindowMiddleware');
export const getConfigService = () => getContainer().get<typeof configService>('configService');
export const getMonitoringService = () => getContainer().get<typeof monitoringService>('monitoringService');
export const getPerformanceService = () => getContainer().get<typeof performanceService>('performanceService');
export const getMemoryMonitorService = () => getContainer().get<typeof memoryMonitorService>('memoryMonitorService');
export const getCircuitBreakerManager = () => getContainer().get<typeof observabilityServices.circuitBreakerManager>('circuitBreakerManager');
export const getObservabilityServices = () => getContainer().get<typeof observabilityServices>('observabilityServices');
export const getCacheConnectionService = () => getContainer().get<typeof cacheConnectionService>('cacheConnectionService');
export const getCacheStoreService = () => getContainer().get<typeof cacheStoreService>('cacheStoreService');
export const getRedisClusterService = () => getContainer().get<typeof redisClusterService>('redisClusterService');
export const getEnhancedCacheService = () => getContainer().get<typeof enhancedCacheService>('enhancedCacheService');
export const getCacheValidationService = () => getContainer().get<typeof cacheValidationService>('cacheValidationService');
export const getCacheServices = () => getContainer().get<typeof cacheServices>('cacheServices');
export const getEnhancedDatabaseService = () => getContainer().get<typeof enhancedDatabaseService>('enhancedDatabaseService');
export const getConnectionManager = () => getContainer().get<typeof connectionManager>('connectionManager');
export const getMaintenanceRunner = () => getContainer().get<typeof maintenanceRunner>('maintenanceRunner');
export const getDatabaseOptimizationService = () => getContainer().get<typeof databaseOptimizationService>('databaseOptimizationService');
export const getQueryOptimizationService = () => getContainer().get<typeof queryOptimizationService>('queryOptimizationService');
export const getAggregationOptimizationService = () => getContainer().get<typeof aggregationOptimizationService>('aggregationOptimizationService');
export const getDatabaseValidationService = () => getContainer().get<typeof databaseValidationService>('databaseValidationService');
export const getDatabasePlatformConfigService = () => getContainer().get<typeof databasePlatformConfigService>('databasePlatformConfigService');
export const getDatabaseOpsPlaybook = () => getContainer().get<typeof databaseOpsPlaybook>('databaseOpsPlaybook');
export const getSchemaDriftDetectorService = () => getContainer().get<typeof schemaDriftDetectorService>('schemaDriftDetectorService');
export const getAtlasBestPracticesService = () => getContainer().get<typeof atlasBestPracticesService>('atlasBestPracticesService');
export const getFilterGuardService = () => getContainer().get<typeof filterGuardService>('filterGuardService');
export const getPaginationService = () => getContainer().get<typeof paginationService>('paginationService');
export const getDatabaseServices = () => getContainer().get<typeof databaseServices>('databaseServices');
export const getReadReplicaService = () => getContainer().get<typeof readReplicaService>('readReplicaService');
export const getExecuteAnalyticsQuery = () => getContainer().get<typeof executeAnalyticsQuery>('executeAnalyticsQuery');
export const getExecuteReportingQuery = () => getContainer().get<typeof executeReportingQuery>('executeReportingQuery');
export const getExecuteReadOnlyQuery = () => getContainer().get<typeof executeReadOnlyQuery>('executeReadOnlyQuery');
export const getCircuitBreakerRegistry = () => getContainer().get<typeof circuitBreakerRegistry>('circuitBreakerRegistry');
export const getJobQueueAdapter = () => getContainer().get<typeof jobQueueAdapter>('jobQueueAdapter');
export const getBackgroundTaskProcessorService = () => getContainer().get<typeof backgroundTaskProcessorService>('backgroundTaskProcessorService');
export const getRetryPolicyService = () => getContainer().get<typeof retryPolicyService>('retryPolicyService');
export const getQueueDashboardService = () => getContainer().get<typeof queueDashboardService>('queueDashboardService');
export const getResilienceServices = () => getContainer().get<typeof resilienceServices>('resilienceServices');

// Helper functions for grouped services
export const getAnalyticsServices = () => ({
  platformData: getPlatformAnalyticsDataService(),
  reporting: getReportingDataService(),
  dashboard: getDashboardAggregationService(),
  insights: getPlatformInsightsService(),
  reportGeneration: getReportGenerationService(),
  systemHealth: getSystemHealthService(),
  validation: getAnalyticsValidationService()
});

export const getSecurityScanServices = () => ({
  eventData: getSecurityEventDataService(),
  sessionData: getSecuritySessionDataService(),
  tokenBlacklistData: getSecurityTokenBlacklistDataService(),
  scanData: getSecurityScanDataService(),
  eventLogger: getSecurityEventLoggerService(),
  sessionManagement: getSecuritySessionManagementService(),
  tokenRevocation: getSecurityTokenRevocationService(),
  analytics: getSecurityAnalyticsService(),
  scanning: getSecurityScanningService(),
  validation: getSecurityValidationService(),
  scanValidation: getSecurityScanValidationService()
});

export const getEcommerceServices = () => ({
  registry: getEcommerceServicesRegistry(),
  providers: getEcommerceProvidersRegistry(),
  adapters: getEcommerceAdapterRegistry(),
  core: {
    data: getEcommerceIntegrationDataService(),
    oauth: getEcommerceOAuthService(),
    httpClientFactory: getEcommerceHttpClientFactoryService(),
    webhookRegistry: getEcommerceWebhookRegistryService(),
    certificateDispatch: getEcommerceCertificateDispatchService()
  },
  features: {
    orderProcessing: getEcommerceOrderProcessingService(),
    productSync: getEcommerceProductSyncService(),
    webhookOrchestrator: getEcommerceWebhookOrchestratorService(),
    connectionHealth: getEcommerceConnectionHealthService(),
    analytics: getEcommerceAnalyticsService()
  },
  utils: getEcommerceUtilities()
});

export const getBrandsServices = () => ({
  profile: getBrandProfileCoreService(),
  settings: getBrandSettingsCoreService(),
  account: getBrandAccountCoreService(),
  verification: getVerificationService(),
  analytics: getBrandAnalyticsService(),
  wallet: getWalletService(),
  integrations: getIntegrationsService(),
  discovery: getDiscoveryService(),
  planValidation: getPlanValidationService(),
  domainValidation: getDomainValidationService(),
  brandValidation: getBrandValidationService(),
  helpers: getBrandHelpersService(),
  completeness: getCompletenessCalculatorService(),
  recommendations: getRecommendationEngineService(),
  customerAccess: getCustomerAccessService()
});

export const getManufacturersServices = () => ({
  data: getManufacturerDataCoreService(),
  account: getManufacturerAccountCoreService(),
  profile: getManufacturerProfileCoreService(),
  verification: getManufacturerVerificationService(),
  supplyChain: getManufacturerSupplyChainService(),
  analytics: getManufacturerAnalyticsService(),
  search: getManufacturerSearchService(),
  media: getManufacturerMediaService(),
  scoreCalculator: getManufacturerScoreCalculatorService(),
  helpers: getManufacturerHelpersService(),
  comparisonEngine: getManufacturerComparisonEngineService(),
  fileValidation: getManufacturerFileValidationService(),
  validation: getManufacturerValidationService(),
  planValidation: getManufacturerPlanValidationService()
});

export const getCertificatesServices = () => ({
  data: getCertificateDataService(),
  account: getCertificateAccountService(),
  minting: getCertificateMintingService(),
  transfer: getCertificateTransferService(),
  batch: getCertificateBatchService(),
  delivery: getCertificateDeliveryService(),
  analytics: getCertificateAnalyticsService(),
  helpers: getCertificateHelpersService(),
  metadata: getCertificateMetadataService(),
  images: getCertificateImageService(),
  certificate: getCertificateValidationService(),
  plan: getCertificatePlanValidationService(),
  recipient: getCertificateRecipientValidationService()
});

export const getProductsServices = () => ({
  data: getProductDataService(),
  account: getProductAccountService(),
  search: getProductSearchService(),
  analytics: getProductAnalyticsService(),
  aggregation: getProductAggregationService(),
  cache: getProductCacheService(),
  validation: getProductValidationService()
});

export const getVotingServices = () => ({
  data: getVotingDataService(),
  contract: getVotingContractService(),
  stats: getVotingStatsService(),
  analytics: getVotingAnalyticsService(),
  dashboard: getVotingDashboardService(),
  proposals: getVotingProposalsService(),
  proposalManagement: getVotingProposalManagementService(),
  contractDeployment: getVotingContractDeploymentService(),
  validation: getVotingValidationService()
});

export const getApiKeyServicesGroup = () => ({
  data: getApiKeyDataService(),
  usage: getApiKeyUsageService(),
  management: getApiKeyManagementService(),
  validation: getApiKeyValidationService()
});

export const getServices = () => ({
  auth: getAuthService(),
  user: getUserService(),
  userModules: getUserServices(),
  tenantModules: getTenantServices(),
  productData: getProductDataService(),
  productAccount: getProductAccountService(),
  productSearch: getProductSearchService(),
  productAnalytics: getProductAnalyticsService(),
  productAggregation: getProductAggregationService(),
  productCache: getProductCacheService(),
  productValidation: getProductValidationService(),
  brandProfile: getBrandProfileCoreService(),
  brandSettings: getBrandSettingsCoreService(),
  brandAccount: getBrandAccountCoreService(),
  verification: getVerificationService(),
  brandAnalytics: getBrandAnalyticsService(),
  wallet: getWalletService(),
  integrations: getIntegrationsService(),
  discovery: getDiscoveryService(),
  planValidation: getPlanValidationService(),
  domainValidation: getDomainValidationService(),
  brandValidation: getBrandValidationService(),
  brandHelpers: getBrandHelpersService(),
  completeness: getCompletenessCalculatorService(),
  recommendations: getRecommendationEngineService(),
  manufacturerData: getManufacturerDataCoreService(),
  manufacturerAccount: getManufacturerAccountCoreService(),
  manufacturerProfile: getManufacturerProfileCoreService(),
  manufacturerVerification: getManufacturerVerificationService(),
  manufacturerSupplyChain: getManufacturerSupplyChainService(),
  manufacturerAnalytics: getManufacturerAnalyticsService(),
  manufacturerSearch: getManufacturerSearchService(),
  manufacturerMedia: getManufacturerMediaService(),
  manufacturerScoreCalculator: getManufacturerScoreCalculatorService(),
  manufacturerHelpers: getManufacturerHelpersService(),
  manufacturerComparisonEngine: getManufacturerComparisonEngineService(),
  manufacturerFileValidation: getManufacturerFileValidationService(),
  manufacturerValidation: getManufacturerValidationService(),
  manufacturerPlanValidation: getManufacturerPlanValidationService(),
  certificateData: getCertificateDataService(),
  certificateAccount: getCertificateAccountService(),
  certificateMinting: getCertificateMintingService(),
  certificateTransfer: getCertificateTransferService(),
  certificateBatch: getCertificateBatchService(),
  certificateDelivery: getCertificateDeliveryService(),
  certificateAnalytics: getCertificateAnalyticsService(),
  certificateHelpers: getCertificateHelpersService(),
  certificateMetadata: getCertificateMetadataService(),
  certificateImage: getCertificateImageService(),
  certificateValidation: getCertificateValidationService(),
  certificatePlanValidation: getCertificatePlanValidationService(),
  certificateRecipientValidation: getCertificateRecipientValidationService(),
  usageRegistry: getUsageServicesRegistry(),
  usageLimits: getUsageLimitsService(),
  usageUpdates: getUsageUpdatesService(),
  usagePlan: getUsagePlanService(),
  usageData: getUsageDataService(),
  usageCache: getUsageCacheService(),
  usageForecast: getUsageForecastService(),
  usageValidation: getUsageValidationService(),
  streaming: getStreamingService(),
  streamingModule: getStreamingServices(),
  config: getConfigService(),
  monitoring: getMonitoringService(),
  performance: getPerformanceService(),
  memoryMonitor: getMemoryMonitorService(),
  circuitBreakerManager: getCircuitBreakerManager(),
  observability: getObservabilityServices(),
  cacheConnection: getCacheConnectionService(),
  cacheStore: getCacheStoreService(),
  redisCluster: getRedisClusterService(),
  enhancedCache: getEnhancedCacheService(),
  cacheValidation: getCacheValidationService(),
  cacheServices: getCacheServices(),
  enhancedDatabase: getEnhancedDatabaseService(),
  connectionManager: getConnectionManager(),
  maintenanceRunner: getMaintenanceRunner(),
  databaseOptimization: getDatabaseOptimizationService(),
  queryOptimization: getQueryOptimizationService(),
  aggregationOptimization: getAggregationOptimizationService(),
  databaseValidation: getDatabaseValidationService(),
  databasePlatformConfig: getDatabasePlatformConfigService(),
  databaseOpsPlaybook: getDatabaseOpsPlaybook(),
  schemaDriftDetector: getSchemaDriftDetectorService(),
  atlasBestPractices: getAtlasBestPracticesService(),
  filterGuard: getFilterGuardService(),
  pagination: getPaginationService(),
  databaseServices: getDatabaseServices(),
  readReplica: getReadReplicaService(),
  executeAnalyticsQuery: getExecuteAnalyticsQuery(),
  executeReportingQuery: getExecuteReportingQuery(),
  executeReadOnlyQuery: getExecuteReadOnlyQuery(),
  slidingWindowRateLimiter: getSlidingWindowRateLimiter(),
  slidingWindowConfigs: getSlidingWindowConfigs(),
  slidingWindowMiddleware: getSlidingWindowMiddleware(),
  circuitBreakerRegistry: getCircuitBreakerRegistry(),
  jobQueueAdapter: getJobQueueAdapter(),
  backgroundTaskProcessor: getBackgroundTaskProcessorService(),
  retryPolicy: getRetryPolicyService(),
  queueDashboard: getQueueDashboardService(),
  resilienceServices: getResilienceServices(),
  ecommerce: getEcommerceServices(),
  supplyChainModules: getSupplyChainServices(),
  apiKey: getApiKeyServicesGroup().data,
  media: getMediaService(),
  brandAccountLegacy: getBrandAccountService(),
  subscriptionBilling: getSubscriptionBillingService(),
  billing: getBillingService(),
  notifications: getNotificationsServices(),
  stripe: getStripeService(),
  tokenDiscount: getTokenDiscountService(),
  nft: getNftService(),
  domains: getDomainServices(),
  supplyChain: getSupplyChainService(),
  usageTracking: getUsageDataService(),
  analytics: getAnalyticsServices(),
  manufacturer: getManufacturersServices()
});

