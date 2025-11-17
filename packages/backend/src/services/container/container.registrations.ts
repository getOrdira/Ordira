/**
 * Service Registration Modules
 * 
 * Organizes service registrations by domain to improve maintainability
 * and reduce the size of the main container file.
 */

import { authService } from '../auth/index';
import { UserDataService } from '../users/core/userData.service';
import { MediaDataService } from '../media/core/mediaData.service';
import { BrandAccountService } from '../brands';
import { BillingManagementService as BillingService } from '../subscriptions/features/billingManagement.service';
import { NftService } from '../blockchain/nft.service';
import { SupplyChainService } from '../blockchain/supplyChain.service';
import { SupplyChainQrCodeService as QrCodeService } from '../supplyChain/features/qrCode.service';
import { SecurityAuditService } from '../security/securityAudit.service';
import {
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
import {
  EcommerceOrderProcessingService,
  EcommerceProductSyncService,
  EcommerceWebhookOrchestratorService,
  EcommerceConnectionHealthService,
  EcommerceAnalyticsService,
  ecommerceServices,
  ecommerceProviders
} from '../integrations/ecommerce';
import type { EcommerceProvider, ProviderFeatureAdapters } from '../integrations/ecommerce';
import {
  StripeGatewayService,
  TokenDiscountService
} from '../subscriptions';
import {
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
import {
  streamingServices,
  streamingService
} from '../infrastructure/streaming';
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
import {
  domainRegistryService,
  domainValidationService,
  domainVerificationService,
  domainDnsService,
  domainCertificateLifecycleService,
  domainHealthService,
  domainAnalyticsService,
  domainCacheService
} from '../domains';
import { NotificationsServices as notificationsModule } from '../notifications';
import { notificationsService } from '../notifications/notifications.service';
import { InvitationsService, invitationsService } from '../connections';
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

type EcommerceAdapterRegistry = Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;

/**
 * Helper function to register multiple services at once
 */
function registerServices(container: Map<string, any>, services: Record<string, any>): void {
  Object.entries(services).forEach(([key, value]) => {
    container.set(key, value);
  });
}

/**
 * Build ecommerce adapter registry
 */
function buildEcommerceAdapterRegistry(): EcommerceAdapterRegistry {
  return Object.entries(ecommerceProviders).reduce<EcommerceAdapterRegistry>(
    (registry, [provider, providerConfig]) => {
      if (providerConfig.adapters) {
        registry[provider as EcommerceProvider] = providerConfig.adapters;
      }
      return registry;
    },
    {}
  );
}

/**
 * Register all services in the container
 */
export function registerAllServices(container: Map<string, any>): void {
  // Core Services
  registerServices(container, {
    authService,
    userService: new UserDataService(),
    userServices,
    userAuthService,
    userProfileService,
    userSearchService,
    userAnalyticsService,
    userDataService,
    userCacheService,
    userProfileFormatterService,
    userValidationService
  });

  // Tenant Services
  registerServices(container, {
    tenantServices,
    tenantDataService,
    tenantResolutionService,
    tenantManagementService,
    tenantAnalyticsService,
    tenantCacheService,
    tenantDomainValidationService
  });

  // Product Services
  registerServices(container, {
    productDataService,
    productAccountService,
    productSearchService,
    productAnalyticsService,
    productAggregationService,
    productCacheService,
    productValidationService
  });

  // Brand Services
  registerServices(container, {
    brandProfileCoreService,
    brandSettingsCoreService,
    brandAccountCoreService,
    verificationService: new VerificationService(),
    brandAnalyticsService: new BrandAnalyticsService(),
    walletService: new WalletService(),
    integrationsService: new IntegrationsService(),
    discoveryService: new DiscoveryService(),
    planValidationService: new PlanValidationService(),
    domainValidationService: new DomainValidationService(),
    brandValidationService: new BrandValidationService(),
    brandHelpersService: new BrandHelpersService(),
    completenessCalculatorService: new CompletenessCalculatorService(),
    recommendationEngineService: new RecommendationEngineService(),
    customerAccessService
  });

  // Manufacturer Services
  registerServices(container, {
    manufacturerDataCoreService,
    manufacturerAccountCoreService,
    manufacturerProfileCoreService,
    manufacturerVerificationService: verificationService,
    manufacturerSupplyChainService: supplyChainService,
    manufacturerAnalyticsService: analyticsService,
    manufacturerSearchService,
    manufacturerMediaService,
    manufacturerScoreCalculatorService: scoreCalculatorService,
    manufacturerHelpersService,
    manufacturerComparisonEngineService: comparisonEngineService,
    manufacturerFileValidationService: fileValidationService,
    manufacturerValidationService,
    manufacturerPlanValidationService: planValidationService
  });

  // Analytics Services
  registerServices(container, {
    platformAnalyticsDataService,
    reportingDataService,
    dashboardAggregationService,
    platformInsightsService,
    reportGenerationService,
    systemHealthService,
    analyticsValidationService
  });

  // Voting Services
  registerServices(container, {
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
  });

  // API Key Services
  registerServices(container, {
    apiKeyServices,
    apiKeyDataService,
    apiKeyUsageService,
    apiKeyManagementService,
    apiKeyValidationService
  });

  // Certificate Services
  registerServices(container, {
    certificateDataService,
    certificateAccountService,
    certificateMintingService: mintingService,
    certificateTransferService: transferService,
    certificateBatchService: batchService,
    certificateDeliveryService: deliveryService,
    certificateAnalyticsService,
    certificateHelpersService,
    certificateMetadataService: metadataGeneratorService,
    certificateImageService: imageGeneratorService,
    certificateValidationService,
    certificatePlanValidationService,
    certificateRecipientValidationService: recipientValidationService
  });

  // Security Services
  registerServices(container, {
    securityServices,
    securityEventDataService: infrastructureSecurityEventDataService,
    securitySessionDataService: infrastructureSecuritySessionDataService,
    securityTokenBlacklistDataService: infrastructureTokenBlacklistDataService,
    securityScanDataService: infrastructureSecurityScanDataService,
    securityEventLoggerService: infrastructureSecurityEventLoggerService,
    securitySessionManagementService: infrastructureSecuritySessionManagementService,
    securityTokenRevocationService: infrastructureSecurityTokenRevocationService,
    securityAnalyticsService: infrastructureSecurityAnalyticsService,
    securityScanningService: infrastructureSecurityScanningService,
    securityValidationService: infrastructureSecurityValidationService,
    securityScanValidationService: infrastructureSecurityScanValidationService
  });

  // Streaming Services
  registerServices(container, {
    streamingService,
    streamingServices
  });

  // Resilience Services
  registerServices(container, {
    slidingWindowRateLimiter,
    slidingWindowConfigs,
    slidingWindowMiddleware
  });

  // Database Services
  registerServices(container, {
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
  });

  // Business Services
  registerServices(container, {
    mediaService: new MediaDataService(),
    brandAccountService: new BrandAccountService(),
    notificationsServices: notificationsModule,
    invitationService: invitationsService
  });

  // Ecommerce Services
  const ecommerceAdapterRegistry = buildEcommerceAdapterRegistry();
  const ecommerceOrderProcessing = new EcommerceOrderProcessingService({
    adapters: ecommerceAdapterRegistry
  });
  const ecommerceProductSync = new EcommerceProductSyncService({
    adapters: ecommerceAdapterRegistry
  });
  const ecommerceWebhookOrchestrator = new EcommerceWebhookOrchestratorService({
    adapters: ecommerceAdapterRegistry
  });
  const ecommerceConnectionHealth = new EcommerceConnectionHealthService(ecommerceAdapterRegistry);
  const ecommerceAnalytics = new EcommerceAnalyticsService(
    { adapters: ecommerceAdapterRegistry },
    ecommerceConnectionHealth
  );

  registerServices(container, {
    ecommerceServicesRegistry: ecommerceServices,
    ecommerceProvidersRegistry: ecommerceProviders,
    ecommerceAdapterRegistry,
    ecommerceIntegrationDataService: ecommerceServices.core.data,
    ecommerceOAuthService: ecommerceServices.core.oauth,
    ecommerceHttpClientFactoryService: ecommerceServices.core.httpClientFactory,
    ecommerceWebhookRegistryService: ecommerceServices.core.webhookRegistry,
    ecommerceCertificateDispatchService: ecommerceServices.core.certificateDispatch,
    ecommerceUtilities: ecommerceServices.utils,
    ecommerceOrderProcessingService: ecommerceOrderProcessing,
    ecommerceProductSyncService: ecommerceProductSync,
    ecommerceWebhookOrchestratorService: ecommerceWebhookOrchestrator,
    ecommerceConnectionHealthService: ecommerceConnectionHealth,
    ecommerceAnalyticsService: ecommerceAnalytics
  });

  // Subscription Services
  registerServices(container, {
    subscriptionServices,
    subscriptionDataService: subscriptionServices.data,
    subscriptionLifecycleService: subscriptionServices.lifecycle,
    subscriptionUsageLimitsService: subscriptionServices.usageLimits,
    subscriptionAnalyticsService: subscriptionServices.analytics,
    subscriptionTierManagementService: subscriptionServices.tierManagement,
    subscriptionPlanValidationService: subscriptionServices.validation,
    subscriptionBillingService: subscriptionServices.billing
  });

  // Usage Services
  registerServices(container, {
    usageServices,
    usageLimitsService,
    usageUpdatesService,
    usagePlanService,
    usageDataService,
    usageCacheService,
    usageForecastService,
    usageValidationService
  });

  // Domain Services
  registerServices(container, {
    domainRegistryService,
    domainValidationService,
    domainVerificationService,
    domainDnsService,
    domainCertificateLifecycleService,
    domainHealthService,
    domainAnalyticsService,
    domainCacheService
  });

  // Supply Chain Services
  registerServices(container, {
    supplyChainService: SupplyChainService.getInstance(),
    qrCodeService: SupplyChainQrCodeService.getInstance(),
    securityAuditService: SecurityAuditService.getInstance(),
    supplyChainServicesRegistry: SupplyChainServicesRegistry.getInstance(),
    supplyChainDeploymentService: DeploymentService.getInstance(),
    supplyChainAssociationService: AssociationService.getInstance(),
    supplyChainContractReadService: ContractReadService.getInstance(),
    supplyChainContractWriteService: ContractWriteService.getInstance(),
    supplyChainQrCodeService: SupplyChainQrCodeService.getInstance(),
    supplyChainDashboardService: SupplyChainDashboardService.getInstance(),
    supplyChainAnalyticsService: SupplyChainAnalyticsService.getInstance(),
    supplyChainProductLifecycleService: ProductLifecycleService.getInstance(),
    supplyChainValidationService: SupplyChainValidationService.getInstance(),
    supplyChainMappers: SupplyChainMappers.getInstance(),
    supplyChainLogParsingService: LogParsingService.getInstance()
  });

  // Blockchain Services
  registerServices(container, {
    nftService: new NftService()
  });

  // External Services
  registerServices(container, {
    billingService: new BillingService(),
    notificationsService,
    stripeService: new StripeGatewayService(),
    tokenDiscountService: new TokenDiscountService()
  });

  // Infrastructure Services
  registerServices(container, {
    configService,
    monitoringService,
    performanceService,
    memoryMonitorService,
    circuitBreakerManager: observabilityServices.circuitBreakerManager,
    observabilityServices,
    cacheConnectionService,
    cacheStoreService,
    redisClusterService,
    enhancedCacheService,
    cacheValidationService,
    cacheServices,
    circuitBreakerRegistry,
    jobQueueAdapter,
    backgroundTaskProcessorService,
    retryPolicyService,
    queueDashboardService,
    resilienceServices
  });
}

