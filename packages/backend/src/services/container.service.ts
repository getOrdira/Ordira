// src/services/container.service.ts

import { authService } from './auth/index';
import { OptimizedUserService } from './business/user.service';
import {
  tenantServices,
  tenantDataService,
  tenantResolutionService,
  tenantManagementService,
  tenantAnalyticsService,
  tenantCacheService,
  tenantDomainValidationService
} from './tenants';
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
} from './users';
import { ApiKeyService } from './business/apiKey.service';
import {
  productDataService,
  productAccountService,
  productSearchService,
  productAnalyticsService,
  productAggregationService,
  productCacheService,
  productValidationService
} from './products';
import {
  platformAnalyticsDataService,
  reportingDataService,
  dashboardAggregationService,
  platformInsightsService,
  reportGenerationService,
  systemHealthService,
  analyticsValidationService,
  PlatformAnalyticsDataService,
  ReportingDataService,
  DashboardAggregationService,
  PlatformInsightsService,
  ReportGenerationService,
  SystemHealthService,
  AnalyticsValidationService
} from './analytics';
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
} from './votes';
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
} from './certificates';
import { MediaDataService } from './media/core/mediaData.service';
import { BillingService } from './external/billing.service';
import {
  ecommerceServices,
  ecommerceProviders,
  EcommerceOrderProcessingService,
  EcommerceProductSyncService,
  EcommerceWebhookOrchestratorService,
  EcommerceConnectionHealthService,
  EcommerceAnalyticsService
} from './integrations/ecommerce';
import type {
  EcommerceProvider,
  ProviderFeatureAdapters
} from './integrations/ecommerce';
import { notificationsService } from './notifications/notifications.service';
import { NftService } from './blockchain/nft.service';
import {
  domainRegistryService,
  domainValidationService,
  domainVerificationService,
  domainDnsService,
  domainCertificateLifecycleService,
  domainHealthService,
  domainAnalyticsService,
  domainCacheService
} from './domains';
import { NotificationsServices as notificationsModule } from './notifications';
import { PendingVoteService } from './business/pendingVote.service';
import { InvitationsService, invitationsService } from './connections';
import {
  subscriptionServices,
  SubscriptionDataService,
  SubscriptionLifecycleService,
  SubscriptionUsageLimitsService,
  SubscriptionAnalyticsService,
  SubscriptionTierManagementService,
  SubscriptionPlanValidationService,
  BillingManagementService,
  StripeGatewayService,
  TokenDiscountService
} from './subscriptions';
import { SupplyChainService } from './blockchain/supplyChain.service';
import { QrCodeService } from './external/qrCode.service';
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
} from './supplyChain';
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
} from './infrastructure/security';
import {
  streamingServices,
  streamingService
} from './infrastructure/streaming';
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
} from './infrastructure/database';
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
} from './infrastructure/resilience';
import { SecurityAuditService } from './security/securityAudit.service';
import { UsageTrackingService } from './business/usageTracking.service';

// Infrastructure Core Services
import { configService } from './infrastructure/config';
import {
  monitoringService,
  performanceService,
  memoryMonitorService,
  observabilityServices
} from './infrastructure/observability';
import {
  cacheConnectionService,
  cacheStoreService,
  redisClusterService,
  enhancedCacheService,
  cacheValidationService,
  cacheServices
} from './infrastructure/cache';
import {
  usageServices,
  usageLimitsService,
  usageUpdatesService,
  usagePlanService,
  usageDataService,
  usageCacheService,
  usageForecastService,
  usageValidationService
} from './usage';
import { 
  BrandServices,
  brandProfileCoreService,
  brandSettingsCoreService,
  brandAccountCoreService,
  BrandAccountService,
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
  RecommendationEngineService,
  CustomerAccessService,
  customerAccessService
} from './brands';

// New modular manufacturers services
import { 
  ManufacturerServices,
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
} from './manufacturers';

type EcommerceAdapterRegistry = Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;

/**
 * Dependency Injection Container
 * Centralizes service instantiation and provides singleton instances
 * to prevent tight coupling and improve testability
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  private buildEcommerceAdapterRegistry(): EcommerceAdapterRegistry {
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
   * Get singleton instance of the container
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize all services as singletons
   */
  private initializeServices(): void {
    // Core Services
    this.services.set('authService', authService);
    this.services.set('userService', new OptimizedUserService());
    this.services.set('userServices', userServices);
    this.services.set('userAuthService', userAuthService);
    this.services.set('userProfileService', userProfileService);
    this.services.set('userSearchService', userSearchService);
    this.services.set('userAnalyticsService', userAnalyticsService);
    this.services.set('userDataService', userDataService);
    this.services.set('userCacheService', userCacheService);
    this.services.set('userProfileFormatterService', userProfileFormatterService);
    this.services.set('userValidationService', userValidationService);

    // New Modular Tenants Services
    this.services.set('tenantServices', tenantServices);
    this.services.set('tenantDataService', tenantDataService);
    this.services.set('tenantResolutionService', tenantResolutionService);
    this.services.set('tenantManagementService', tenantManagementService);
    this.services.set('tenantAnalyticsService', tenantAnalyticsService);
    this.services.set('tenantCacheService', tenantCacheService);
    this.services.set('tenantDomainValidationService', tenantDomainValidationService);

    // New Modular Products Services
    this.services.set('productDataService', productDataService);
    this.services.set('productAccountService', productAccountService);
    
    // Products Feature Services
    this.services.set('productSearchService', productSearchService);
    this.services.set('productAnalyticsService', productAnalyticsService);
    this.services.set('productAggregationService', productAggregationService);
    
    // Products Utility Services
    this.services.set('productCacheService', productCacheService);
    
    // Products Validation Services
    this.services.set('productValidationService', productValidationService);

    // New Modular Brands Services
    this.services.set('brandProfileCoreService', brandProfileCoreService);
    this.services.set('brandSettingsCoreService', brandSettingsCoreService);
    this.services.set('brandAccountCoreService', brandAccountCoreService);
    
    // Brands Feature Services
    this.services.set('verificationService', new VerificationService());
    this.services.set('brandAnalyticsService', new BrandAnalyticsService());
    this.services.set('walletService', new WalletService());
    this.services.set('integrationsService', new IntegrationsService());
    this.services.set('discoveryService', new DiscoveryService());
    
    // Brands Validation Services
    this.services.set('planValidationService', new PlanValidationService());
    this.services.set('domainValidationService', new DomainValidationService());
    this.services.set('brandValidationService', new BrandValidationService());
    
    // Brands Utility Services
    this.services.set('brandHelpersService', new BrandHelpersService());
    this.services.set('completenessCalculatorService', new CompletenessCalculatorService());
    this.services.set('recommendationEngineService', new RecommendationEngineService());
    
    // Brand Feature Services
    this.services.set('customerAccessService', customerAccessService);

    // New Modular Manufacturers Services
    this.services.set('manufacturerDataCoreService', manufacturerDataCoreService);
    this.services.set('manufacturerAccountCoreService', manufacturerAccountCoreService);
    this.services.set('manufacturerProfileCoreService', manufacturerProfileCoreService);
    
    // Manufacturers Feature Services
    this.services.set('manufacturerVerificationService', verificationService);
    this.services.set('manufacturerSupplyChainService', supplyChainService);
    this.services.set('manufacturerAnalyticsService', analyticsService);
    this.services.set('manufacturerSearchService', manufacturerSearchService);
    this.services.set('manufacturerMediaService', manufacturerMediaService);
    
    // Manufacturers Utility Services
    this.services.set('manufacturerScoreCalculatorService', scoreCalculatorService);
    this.services.set('manufacturerHelpersService', manufacturerHelpersService);
    this.services.set('manufacturerComparisonEngineService', comparisonEngineService);
    
    // Manufacturers Validation Services
    this.services.set('manufacturerFileValidationService', fileValidationService);
    this.services.set('manufacturerValidationService', manufacturerValidationService);
    this.services.set('manufacturerPlanValidationService', planValidationService);
    
    this.services.set('apiKeyService', new ApiKeyService());
    
    // New Modular Analytics Services
    this.services.set('platformAnalyticsDataService', platformAnalyticsDataService);
    this.services.set('reportingDataService', reportingDataService);
    this.services.set('dashboardAggregationService', dashboardAggregationService);
    this.services.set('platformInsightsService', platformInsightsService);
    this.services.set('reportGenerationService', reportGenerationService);
    this.services.set('systemHealthService', systemHealthService);
    this.services.set('analyticsValidationService', analyticsValidationService);
    
    // New Modular Voting Services
    this.services.set('votesServices', votesServices);
    this.services.set('votingDataService', votingDataService);
    this.services.set('votingContractService', votingContractService);
    this.services.set('votingStatsService', votingStatsService);
    this.services.set('votingAnalyticsService', votingAnalyticsService);
    this.services.set('votingDashboardService', votingDashboardService);
    this.services.set('votingProposalsService', votingProposalsService);
    this.services.set('votingProposalManagementService', votingProposalManagementService);
    this.services.set('votingContractDeploymentService', votingContractDeploymentService);
    this.services.set('votingValidationService', votingValidationService);
    
    // New Modular Certificates Services
    this.services.set('certificateDataService', certificateDataService);
    this.services.set('certificateAccountService', certificateAccountService);
    
    // Certificates Feature Services
    this.services.set('certificateMintingService', mintingService);
    this.services.set('certificateTransferService', transferService);
    this.services.set('certificateBatchService', batchService);
    this.services.set('certificateDeliveryService', deliveryService);
    this.services.set('certificateAnalyticsService', certificateAnalyticsService);
    
    // Certificates Utility Services
    this.services.set('certificateHelpersService', certificateHelpersService);
    this.services.set('certificateMetadataService', metadataGeneratorService);
    this.services.set('certificateImageService', imageGeneratorService);
    
    // Certificates Validation Services
    this.services.set('certificateValidationService', certificateValidationService);
    this.services.set('certificatePlanValidationService', certificatePlanValidationService);
    this.services.set('certificateRecipientValidationService', recipientValidationService);
    
    // New Modular Security Services
    this.services.set('securityServices', securityServices);
    this.services.set('securityEventDataService', infrastructureSecurityEventDataService);
    this.services.set('securitySessionDataService', infrastructureSecuritySessionDataService);
    this.services.set('securityTokenBlacklistDataService', infrastructureTokenBlacklistDataService);
    this.services.set('securityScanDataService', infrastructureSecurityScanDataService);
    this.services.set('securityEventLoggerService', infrastructureSecurityEventLoggerService);
    this.services.set('securitySessionManagementService', infrastructureSecuritySessionManagementService);
    this.services.set('securityTokenRevocationService', infrastructureSecurityTokenRevocationService);
    this.services.set('securityAnalyticsService', infrastructureSecurityAnalyticsService);
    this.services.set('securityScanningService', infrastructureSecurityScanningService);
    this.services.set('securityValidationService', infrastructureSecurityValidationService);
    this.services.set('securityScanValidationService', infrastructureSecurityScanValidationService);

    // Infrastructure Streaming Services
    this.services.set('streamingService', streamingService);
    this.services.set('streamingServices', streamingServices);

    // Infrastructure Resilience Services
    this.services.set('slidingWindowRateLimiter', slidingWindowRateLimiter);
    this.services.set('slidingWindowConfigs', slidingWindowConfigs);
    this.services.set('slidingWindowMiddleware', slidingWindowMiddleware);

    // Infrastructure Database Services
    this.services.set('readReplicaService', readReplicaService);
    this.services.set('executeAnalyticsQuery', executeAnalyticsQuery);
    this.services.set('executeReportingQuery', executeReportingQuery);
    this.services.set('executeReadOnlyQuery', executeReadOnlyQuery);

    this.services.set('mediaService', new MediaDataService());
    this.services.set('brandAccountService', new BrandAccountService());
    this.services.set('pendingVoteService', new PendingVoteService());
    this.services.set('notificationsServices', notificationsModule);
    this.services.set('invitationService', invitationsService);

    // Ecommerce Integration Services
    const ecommerceAdapterRegistry = this.buildEcommerceAdapterRegistry();
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

    this.services.set('ecommerceServicesRegistry', ecommerceServices);
    this.services.set('ecommerceProvidersRegistry', ecommerceProviders);
    this.services.set('ecommerceAdapterRegistry', ecommerceAdapterRegistry);
    this.services.set('ecommerceIntegrationDataService', ecommerceServices.core.data);
    this.services.set('ecommerceOAuthService', ecommerceServices.core.oauth);
    this.services.set('ecommerceHttpClientFactoryService', ecommerceServices.core.httpClientFactory);
    this.services.set('ecommerceWebhookRegistryService', ecommerceServices.core.webhookRegistry);
    this.services.set('ecommerceCertificateDispatchService', ecommerceServices.core.certificateDispatch);
    this.services.set('ecommerceUtilities', ecommerceServices.utils);
    this.services.set('ecommerceOrderProcessingService', ecommerceOrderProcessing);
    this.services.set('ecommerceProductSyncService', ecommerceProductSync);
    this.services.set('ecommerceWebhookOrchestratorService', ecommerceWebhookOrchestrator);
    this.services.set('ecommerceConnectionHealthService', ecommerceConnectionHealth);
    this.services.set('ecommerceAnalyticsService', ecommerceAnalytics);
    
    // New subscriptions services
    this.services.set('subscriptionServices', subscriptionServices);
    this.services.set('subscriptionDataService', subscriptionServices.data);
    this.services.set('subscriptionLifecycleService', subscriptionServices.lifecycle);
    this.services.set('subscriptionUsageLimitsService', subscriptionServices.usageLimits);
    this.services.set('subscriptionAnalyticsService', subscriptionServices.analytics);
    this.services.set('subscriptionTierManagementService', subscriptionServices.tierManagement);
    this.services.set('subscriptionPlanValidationService', subscriptionServices.validation);
    this.services.set('subscriptionBillingService', subscriptionServices.billing);
    
    this.services.set('usageTrackingService', new UsageTrackingService());
    this.services.set('usageServices', usageServices);
    this.services.set('usageLimitsService', usageLimitsService);
    this.services.set('usageUpdatesService', usageUpdatesService);
    this.services.set('usagePlanService', usagePlanService);
    this.services.set('usageDataService', usageDataService);
    this.services.set('usageCacheService', usageCacheService);
    this.services.set('usageForecastService', usageForecastService);
    this.services.set('usageValidationService', usageValidationService);

    // Domain Services (Modular)
    this.services.set('domainRegistryService', domainRegistryService);
    this.services.set('domainValidationService', domainValidationService);
    this.services.set('domainVerificationService', domainVerificationService);
    this.services.set('domainDnsService', domainDnsService);
    this.services.set('domainCertificateLifecycleService', domainCertificateLifecycleService);
    this.services.set('domainHealthService', domainHealthService);
    this.services.set('domainAnalyticsService', domainAnalyticsService);
    this.services.set('domainCacheService', domainCacheService);
    this.services.set('supplyChainService', SupplyChainService.getInstance());
    this.services.set('qrCodeService', new QrCodeService());
    this.services.set('securityAuditService', SecurityAuditService.getInstance());

    // New Modular Supply Chain Services
    this.services.set('supplyChainServicesRegistry', SupplyChainServicesRegistry.getInstance());
    
    // Supply Chain Core Services
    this.services.set('supplyChainDeploymentService', DeploymentService.getInstance());
    this.services.set('supplyChainAssociationService', AssociationService.getInstance());
    this.services.set('supplyChainContractReadService', ContractReadService.getInstance());
    this.services.set('supplyChainContractWriteService', ContractWriteService.getInstance());
    
    // Supply Chain Feature Services
    this.services.set('supplyChainQrCodeService', SupplyChainQrCodeService.getInstance());
    this.services.set('supplyChainDashboardService', SupplyChainDashboardService.getInstance());
    this.services.set('supplyChainAnalyticsService', SupplyChainAnalyticsService.getInstance());
    this.services.set('supplyChainProductLifecycleService', ProductLifecycleService.getInstance());
    
    // Supply Chain Utility Services
    this.services.set('supplyChainValidationService', SupplyChainValidationService.getInstance());
    this.services.set('supplyChainMappers', SupplyChainMappers.getInstance());
    this.services.set('supplyChainLogParsingService', LogParsingService.getInstance());

    // Blockchain Services
    this.services.set('nftService', new NftService());

    // External Services
    this.services.set('billingService', new BillingService());
    this.services.set('notificationsService', notificationsService);
    this.services.set('stripeService', new StripeGatewayService());
    this.services.set('tokenDiscountService', new TokenDiscountService());

    // Infrastructure Core Services
    this.services.set('configService', configService);
    
    // Infrastructure Observability Services
    this.services.set('monitoringService', monitoringService);
    this.services.set('performanceService', performanceService);
    this.services.set('memoryMonitorService', memoryMonitorService);
    this.services.set('circuitBreakerManager', observabilityServices.circuitBreakerManager);
    this.services.set('observabilityServices', observabilityServices);
    
    // Infrastructure Cache Services
    this.services.set('cacheConnectionService', cacheConnectionService);
    this.services.set('cacheStoreService', cacheStoreService);
    this.services.set('redisClusterService', redisClusterService);
    this.services.set('enhancedCacheService', enhancedCacheService);
    this.services.set('cacheValidationService', cacheValidationService);
    this.services.set('cacheServices', cacheServices);
    
    // Infrastructure Database Services
    this.services.set('enhancedDatabaseService', enhancedDatabaseService);
    this.services.set('connectionManager', connectionManager);
    this.services.set('maintenanceRunner', maintenanceRunner);
    this.services.set('databaseService', databaseService);
    this.services.set('databaseOptimizationService', databaseOptimizationService);
    this.services.set('queryOptimizationService', queryOptimizationService);
    this.services.set('aggregationOptimizationService', aggregationOptimizationService);
    this.services.set('databaseValidationService', databaseValidationService);
    this.services.set('databasePlatformConfigService', databasePlatformConfigService);
    this.services.set('databaseOpsPlaybook', databaseOpsPlaybook);
    this.services.set('schemaDriftDetectorService', schemaDriftDetectorService);
    this.services.set('atlasBestPracticesService', atlasBestPracticesService);
    this.services.set('filterGuardService', filterGuardService);
    this.services.set('paginationService', paginationService);
    this.services.set('databaseServices', databaseServices);
    
    // Infrastructure Resilience Services
    this.services.set('circuitBreakerRegistry', circuitBreakerRegistry);
    this.services.set('jobQueueAdapter', jobQueueAdapter);
    this.services.set('backgroundTaskProcessorService', backgroundTaskProcessorService);
    this.services.set('retryPolicyService', retryPolicyService);
    this.services.set('queueDashboardService', queueDashboardService);
    this.services.set('resilienceServices', resilienceServices);
  }

  /**
   * Get a service instance by name
   */
  public get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in container`);
    }
    return service as T;
  }

  /**
   * Register a service instance (useful for testing)
   */
  public register<T>(serviceName: string, service: T): void {
    this.services.set(serviceName, service);
  }

  /**
   * Clear all services (useful for testing)
   */
  public clear(): void {
    this.services.clear();
    this.initializeServices();
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Convenience function to get the container instance
 */
export const getContainer = (): ServiceContainer => ServiceContainer.getInstance();

/**
 * Convenience functions for common services
 */
export const getAuthService = () => getContainer().get<typeof authService>('authService');
export const getUserService = () => getContainer().get<OptimizedUserService>('userService');
export const getUserServices = () => getContainer().get<typeof userServices>('userServices');
export const getUserAuthService = () => getContainer().get<typeof userAuthService>('userAuthService');
export const getUserProfileService = () => getContainer().get<typeof userProfileService>('userProfileService');
export const getUserSearchService = () => getContainer().get<typeof userSearchService>('userSearchService');
export const getUserAnalyticsService = () => getContainer().get<typeof userAnalyticsService>('userAnalyticsService');
export const getUserDataService = () => getContainer().get<typeof userDataService>('userDataService');
export const getUserCacheService = () => getContainer().get<typeof userCacheService>('userCacheService');
export const getUserFormatterService = () => getContainer().get<typeof userProfileFormatterService>('userProfileFormatterService');
export const getUserValidationService = () => getContainer().get<typeof userValidationService>('userValidationService');
export const getTenantServices = () => getContainer().get<typeof tenantServices>('tenantServices');
export const getTenantDataService = () => getContainer().get<typeof tenantDataService>('tenantDataService');
export const getTenantResolutionService = () => getContainer().get<typeof tenantResolutionService>('tenantResolutionService');
export const getTenantManagementService = () => getContainer().get<typeof tenantManagementService>('tenantManagementService');
export const getTenantAnalyticsService = () => getContainer().get<typeof tenantAnalyticsService>('tenantAnalyticsService');
export const getTenantCacheService = () => getContainer().get<typeof tenantCacheService>('tenantCacheService');
export const getTenantValidationService = () => getContainer().get<typeof tenantDomainValidationService>('tenantDomainValidationService');
export const getApiKeyService = () => getContainer().get<ApiKeyService>('apiKeyService');

// New Modular Products Services
export const getProductDataService = () => getContainer().get<typeof productDataService>('productDataService');
export const getProductAccountService = () => getContainer().get<typeof productAccountService>('productAccountService');
export const getProductSearchService = () => getContainer().get<typeof productSearchService>('productSearchService');
export const getProductAnalyticsService = () => getContainer().get<typeof productAnalyticsService>('productAnalyticsService');
export const getProductAggregationService = () => getContainer().get<typeof productAggregationService>('productAggregationService');
export const getProductCacheService = () => getContainer().get<typeof productCacheService>('productCacheService');
export const getProductValidationService = () => getContainer().get<typeof productValidationService>('productValidationService');

// New Modular Analytics Services Getters
export const getPlatformAnalyticsDataService = () => getContainer().get<typeof platformAnalyticsDataService>('platformAnalyticsDataService');
export const getReportingDataService = () => getContainer().get<typeof reportingDataService>('reportingDataService');
export const getDashboardAggregationService = () => getContainer().get<typeof dashboardAggregationService>('dashboardAggregationService');
export const getPlatformInsightsService = () => getContainer().get<typeof platformInsightsService>('platformInsightsService');
export const getReportGenerationService = () => getContainer().get<typeof reportGenerationService>('reportGenerationService');
export const getSystemHealthService = () => getContainer().get<typeof systemHealthService>('systemHealthService');
export const getAnalyticsValidationService = () => getContainer().get<typeof analyticsValidationService>('analyticsValidationService');

// Ecommerce Integration Services Getters
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

export const getMediaService = () => getContainer().get<MediaDataService>('mediaService');
export const getBrandAccountService = () => getContainer().get<BrandAccountService>('brandAccountService');
export const getPendingVoteService = () => getContainer().get<PendingVoteService>('pendingVoteService');
export const getBillingService = () => getContainer().get<BillingService>('billingService');
export const getNotificationsService = () => getContainer().get<typeof notificationsService>('notificationsService');
export const getNotificationsServices = () => getContainer().get<typeof notificationsModule>('notificationsServices');
export const getStripeService = () => getContainer().get<StripeGatewayService>('stripeService');
export const getTokenDiscountService = () => getContainer().get<TokenDiscountService>('tokenDiscountService');
export const getNftService = () => getContainer().get<NftService>('nftService');
// Domain Services (Modular)
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

// New modular subscriptions services
export const getSubscriptionServices = () => getContainer().get<typeof subscriptionServices>('subscriptionServices');
export const getSubscriptionDataService = () => getContainer().get<SubscriptionDataService>('subscriptionDataService');
export const getSubscriptionLifecycleService = () => getContainer().get<SubscriptionLifecycleService>('subscriptionLifecycleService');
export const getSubscriptionUsageLimitsService = () => getContainer().get<SubscriptionUsageLimitsService>('subscriptionUsageLimitsService');
export const getSubscriptionAnalyticsService = () => getContainer().get<SubscriptionAnalyticsService>('subscriptionAnalyticsService');
export const getSubscriptionTierManagementService = () => getContainer().get<SubscriptionTierManagementService>('subscriptionTierManagementService');
export const getSubscriptionPlanValidationService = () => getContainer().get<SubscriptionPlanValidationService>('subscriptionPlanValidationService');
export const getSubscriptionBillingService = () => getContainer().get<BillingManagementService>('subscriptionBillingService');

export const getUsageTrackingService = () => getContainer().get<UsageTrackingService>('usageTrackingService');
export const getUsageServicesRegistry = () => getContainer().get<typeof usageServices>('usageServices');
export const getUsageLimitsService = () => getContainer().get<typeof usageLimitsService>('usageLimitsService');
export const getUsageUpdatesService = () => getContainer().get<typeof usageUpdatesService>('usageUpdatesService');
export const getUsagePlanService = () => getContainer().get<typeof usagePlanService>('usagePlanService');
export const getUsageDataService = () => getContainer().get<typeof usageDataService>('usageDataService');
export const getUsageCacheService = () => getContainer().get<typeof usageCacheService>('usageCacheService');
export const getUsageForecastService = () => getContainer().get<typeof usageForecastService>('usageForecastService');
export const getUsageValidationService = () => getContainer().get<typeof usageValidationService>('usageValidationService');
export const getSupplyChainService = () => getContainer().get<SupplyChainService>('supplyChainService');
export const getQrCodeService = () => getContainer().get<QrCodeService>('qrCodeService');
export const getSecurityAuditService = () => getContainer().get<SecurityAuditService>('securityAuditService');

// New Modular Supply Chain Services
export const getSupplyChainServicesRegistry = () => getContainer().get<SupplyChainServicesRegistry>('supplyChainServicesRegistry');

// Supply Chain Core Services
export const getSupplyChainDeploymentService = () => getContainer().get<DeploymentService>('supplyChainDeploymentService');
export const getSupplyChainAssociationService = () => getContainer().get<AssociationService>('supplyChainAssociationService');
export const getSupplyChainContractReadService = () => getContainer().get<ContractReadService>('supplyChainContractReadService');
export const getSupplyChainContractWriteService = () => getContainer().get<ContractWriteService>('supplyChainContractWriteService');

// Supply Chain Feature Services
export const getSupplyChainQrCodeService = () => getContainer().get<SupplyChainQrCodeService>('supplyChainQrCodeService');
export const getSupplyChainDashboardService = () => getContainer().get<SupplyChainDashboardService>('supplyChainDashboardService');
export const getSupplyChainAnalyticsService = () => getContainer().get<SupplyChainAnalyticsService>('supplyChainAnalyticsService');
export const getSupplyChainProductLifecycleService = () => getContainer().get<ProductLifecycleService>('supplyChainProductLifecycleService');

// Supply Chain Utility Services
export const getSupplyChainValidationService = () => getContainer().get<SupplyChainValidationService>('supplyChainValidationService');
export const getSupplyChainMappers = () => getContainer().get<SupplyChainMappers>('supplyChainMappers');
export const getSupplyChainLogParsingService = () => getContainer().get<LogParsingService>('supplyChainLogParsingService');

// Convenience function to get all supply chain services
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

// New Modular Brands Services
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

// Brand Feature Services
export const getCustomerAccessService = () => getContainer().get<typeof customerAccessService>('customerAccessService');

// New Modular Manufacturers Services
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

// New Modular Certificates Services
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

// New Modular Voting Services
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

// New Modular Security Services
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

// Infrastructure Streaming Services Getters
export const getStreamingService = () => getContainer().get<typeof streamingService>('streamingService');
export const getStreamingServices = () => getContainer().get<typeof streamingServices>('streamingServices');

// Infrastructure Resilience Services Getters
export const getSlidingWindowRateLimiter = () => getContainer().get<typeof slidingWindowRateLimiter>('slidingWindowRateLimiter');
export const getSlidingWindowConfigs = () => getContainer().get<typeof slidingWindowConfigs>('slidingWindowConfigs');
export const getSlidingWindowMiddleware = () => getContainer().get<typeof slidingWindowMiddleware>('slidingWindowMiddleware');

// Infrastructure Config Service Getter
export const getConfigService = () => getContainer().get<typeof configService>('configService');

// Infrastructure Observability Services Getters
export const getMonitoringService = () => getContainer().get<typeof monitoringService>('monitoringService');
export const getPerformanceService = () => getContainer().get<typeof performanceService>('performanceService');
export const getMemoryMonitorService = () => getContainer().get<typeof memoryMonitorService>('memoryMonitorService');
export const getCircuitBreakerManager = () => getContainer().get<typeof observabilityServices.circuitBreakerManager>('circuitBreakerManager');
export const getObservabilityServices = () => getContainer().get<typeof observabilityServices>('observabilityServices');

// Infrastructure Cache Services Getters
export const getCacheConnectionService = () => getContainer().get<typeof cacheConnectionService>('cacheConnectionService');
export const getCacheStoreService = () => getContainer().get<typeof cacheStoreService>('cacheStoreService');
export const getRedisClusterService = () => getContainer().get<typeof redisClusterService>('redisClusterService');
export const getEnhancedCacheService = () => getContainer().get<typeof enhancedCacheService>('enhancedCacheService');
export const getCacheValidationService = () => getContainer().get<typeof cacheValidationService>('cacheValidationService');
export const getCacheServices = () => getContainer().get<typeof cacheServices>('cacheServices');

// Infrastructure Database Services Getters
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

// Infrastructure Resilience Services Getters
export const getCircuitBreakerRegistry = () => getContainer().get<typeof circuitBreakerRegistry>('circuitBreakerRegistry');
export const getJobQueueAdapter = () => getContainer().get<typeof jobQueueAdapter>('jobQueueAdapter');
export const getBackgroundTaskProcessorService = () => getContainer().get<typeof backgroundTaskProcessorService>('backgroundTaskProcessorService');
export const getRetryPolicyService = () => getContainer().get<typeof retryPolicyService>('retryPolicyService');
export const getQueueDashboardService = () => getContainer().get<typeof queueDashboardService>('queueDashboardService');
export const getResilienceServices = () => getContainer().get<typeof resilienceServices>('resilienceServices');

/**
 * Get all analytics services
 */
export const getAnalyticsServices = () => ({
  platformData: getPlatformAnalyticsDataService(),
  reporting: getReportingDataService(),
  dashboard: getDashboardAggregationService(),
  insights: getPlatformInsightsService(),
  reportGeneration: getReportGenerationService(),
  systemHealth: getSystemHealthService(),
  validation: getAnalyticsValidationService()
});

/**
 * Get all security services including scanning
 */
export const getSecurityScanServices = () => ({
  // Core Data Services
  eventData: getSecurityEventDataService(),
  sessionData: getSecuritySessionDataService(),
  tokenBlacklistData: getSecurityTokenBlacklistDataService(),
  scanData: getSecurityScanDataService(),
  
  // Feature Services
  eventLogger: getSecurityEventLoggerService(),
  sessionManagement: getSecuritySessionManagementService(),
  tokenRevocation: getSecurityTokenRevocationService(),
  analytics: getSecurityAnalyticsService(),
  scanning: getSecurityScanningService(),
  
  // Validation Services
  validation: getSecurityValidationService(),
  scanValidation: getSecurityScanValidationService()
});

/**
 * Helper function to get multiple services at once
 */
export const getServices = () => ({
  // Core Services
  auth: getAuthService(),
  user: getUserService(),
  userModules: getUserServices(),
  tenantModules: getTenantServices(),

  // New Modular Products Services
  productData: getProductDataService(),
  productAccount: getProductAccountService(),
  productSearch: getProductSearchService(),
  productAnalytics: getProductAnalyticsService(),
  productAggregation: getProductAggregationService(),
  productCache: getProductCacheService(),
  productValidation: getProductValidationService(),

  // New Modular Brands Services
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

  // New Modular Manufacturers Services
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

  // New Modular Certificates Services
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

  // Usage Modules
  usageRegistry: getUsageServicesRegistry(),
  usageLimits: getUsageLimitsService(),
  usageUpdates: getUsageUpdatesService(),
  usagePlan: getUsagePlanService(),
  usageData: getUsageDataService(),
  usageCache: getUsageCacheService(),
  usageForecast: getUsageForecastService(),
  usageValidation: getUsageValidationService(),

  // Infrastructure Streaming
  streaming: getStreamingService(),
  streamingModule: getStreamingServices(),

  // Infrastructure Config
  config: getConfigService(),

  // Infrastructure Observability
  monitoring: getMonitoringService(),
  performance: getPerformanceService(),
  memoryMonitor: getMemoryMonitorService(),
  circuitBreakerManager: getCircuitBreakerManager(),
  observability: getObservabilityServices(),

  // Infrastructure Cache
  cacheConnection: getCacheConnectionService(),
  cacheStore: getCacheStoreService(),
  redisCluster: getRedisClusterService(),
  enhancedCache: getEnhancedCacheService(),
  cacheValidation: getCacheValidationService(),
  cacheServices: getCacheServices(),

  // Infrastructure Database
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

  // Infrastructure Resilience
  slidingWindowRateLimiter: getSlidingWindowRateLimiter(),
  slidingWindowConfigs: getSlidingWindowConfigs(),
  slidingWindowMiddleware: getSlidingWindowMiddleware(),
  circuitBreakerRegistry: getCircuitBreakerRegistry(),
  jobQueueAdapter: getJobQueueAdapter(),
  backgroundTaskProcessor: getBackgroundTaskProcessorService(),
  retryPolicy: getRetryPolicyService(),
  queueDashboard: getQueueDashboardService(),
  resilienceServices: getResilienceServices(),

  // Ecommerce Integration Modules
  ecommerce: getEcommerceServices(),

  // New Modular Supply Chain Services
  supplyChainModules: getSupplyChainServices(),

  // Legacy Services (to be migrated)
  apiKey: getApiKeyService(),
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
  usageTracking: getUsageTrackingService(),

  // Backward compatibility aliases for deprecated controllers
  analytics: getAnalyticsServices(),  // Maps to the new analytics services structure
  manufacturer: getManufacturersServices()  // Maps to manufacturer services
});

/**
 * Helper function to get ecommerce services specifically
 */
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

/**
 * Helper function to get brands services specifically
 */
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
  customerAccess: getCustomerAccessService(),
});

/**
 * Helper function to get manufacturers services specifically
 */
export const getManufacturersServices = () => ({
  // Core Services
  data: getManufacturerDataCoreService(),
  account: getManufacturerAccountCoreService(),
  profile: getManufacturerProfileCoreService(),
  
  // Feature Services
  verification: getManufacturerVerificationService(),
  supplyChain: getManufacturerSupplyChainService(),
  analytics: getManufacturerAnalyticsService(),
  search: getManufacturerSearchService(),
  media: getManufacturerMediaService(),
  
  // Utility Services
  scoreCalculator: getManufacturerScoreCalculatorService(),
  helpers: getManufacturerHelpersService(),
  comparisonEngine: getManufacturerComparisonEngineService(),
  
  // Validation Services
  fileValidation: getManufacturerFileValidationService(),
  validation: getManufacturerValidationService(),
  planValidation: getManufacturerPlanValidationService()
});

/**
 * Helper function to get certificates services specifically
 */
export const getCertificatesServices = () => ({
  // Core Services
  data: getCertificateDataService(),
  account: getCertificateAccountService(),
  
  // Feature Services
  minting: getCertificateMintingService(),
  transfer: getCertificateTransferService(),
  batch: getCertificateBatchService(),
  delivery: getCertificateDeliveryService(),
  analytics: getCertificateAnalyticsService(),
  
  // Utility Services
  helpers: getCertificateHelpersService(),
  metadata: getCertificateMetadataService(),
  images: getCertificateImageService(),
  
  // Validation Services
  certificate: getCertificateValidationService(),
  plan: getCertificatePlanValidationService(),
  recipient: getCertificateRecipientValidationService()
});

/**
 * Helper function to get products services specifically
 */
export const getProductsServices = () => ({
  // Core Services
  data: getProductDataService(),
  account: getProductAccountService(),
  
  // Feature Services
  search: getProductSearchService(),
  analytics: getProductAnalyticsService(),
  aggregation: getProductAggregationService(),
  
  // Utility Services
  cache: getProductCacheService(),
  
  // Validation Services
  validation: getProductValidationService()
});

/**
 * Helper function to get voting services specifically
 */
export const getVotingServices = () => ({
  // Core Services
  data: getVotingDataService(),
  contract: getVotingContractService(),
  
  // Feature Services
  stats: getVotingStatsService(),
  analytics: getVotingAnalyticsService(),
  dashboard: getVotingDashboardService(),
  proposals: getVotingProposalsService(),
  proposalManagement: getVotingProposalManagementService(),
  contractDeployment: getVotingContractDeploymentService(),
  
  // Validation Services
  validation: getVotingValidationService()
});










