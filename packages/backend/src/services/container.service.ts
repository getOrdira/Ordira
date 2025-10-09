// src/services/container.service.ts

import { authService } from './auth/index';
import { OptimizedUserService } from './business/user.service';
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
import { AnalyticsService } from './business/analytics.service';
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
import { ShopifyService } from './external/shopify.service';
import { WixService } from './external/wix.service';
import { WooCommerceService } from './external/woocommerce.service';
import { NotificationsService } from './external/notifications.service';
import { StripeService } from './external/stripe.service';
import { TokenDiscountService } from './external/tokenDiscount.service';
import { NftService } from './blockchain/nft.service';
import { DomainMappingService } from './external/domainMapping.service';
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
  SubscriptionPlanValidationService
} from './subscriptions';
import { SupplyChainService } from './blockchain/supplyChain.service';
import { QrCodeService } from './external/qrCode.service';
import { SecurityAuditService } from './security/securityAudit.service';
import { UsageTrackingService } from './business/usageTracking.service';
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
    this.services.set('analyticsService', new AnalyticsService());
    
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
    
    this.services.set('mediaService', new MediaDataService());
    this.services.set('brandAccountService', new BrandAccountService());
    this.services.set('pendingVoteService', new PendingVoteService());
    this.services.set('notificationsServices', notificationsModule);
    this.services.set('invitationService', invitationsService);
    
    // New subscriptions services
    this.services.set('subscriptionServices', subscriptionServices);
    this.services.set('subscriptionDataService', subscriptionServices.data);
    this.services.set('subscriptionLifecycleService', subscriptionServices.lifecycle);
    this.services.set('subscriptionUsageLimitsService', subscriptionServices.usageLimits);
    this.services.set('subscriptionAnalyticsService', subscriptionServices.analytics);
    this.services.set('subscriptionTierManagementService', subscriptionServices.tierManagement);
    this.services.set('subscriptionPlanValidationService', subscriptionServices.validation);
    
    this.services.set('usageTrackingService', new UsageTrackingService());

    // External/Platform Services
    this.services.set('domainMappingService', new DomainMappingService());
    this.services.set('supplyChainService', SupplyChainService.getInstance());
    this.services.set('qrCodeService', new QrCodeService());
    this.services.set('securityAuditService', SecurityAuditService.getInstance());

    // Blockchain Services
    this.services.set('nftService', new NftService());

    // External Services
    this.services.set('billingService', new BillingService());
    this.services.set('shopifyService', new ShopifyService());
    this.services.set('wixService', new WixService());
    this.services.set('wooCommerceService', new WooCommerceService());
    this.services.set('notificationsService', new NotificationsService());
    this.services.set('stripeService', new StripeService());
    this.services.set('tokenDiscountService', new TokenDiscountService());
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
export const getApiKeyService = () => getContainer().get<ApiKeyService>('apiKeyService');

// New Modular Products Services
export const getProductDataService = () => getContainer().get<typeof productDataService>('productDataService');
export const getProductAccountService = () => getContainer().get<typeof productAccountService>('productAccountService');
export const getProductSearchService = () => getContainer().get<typeof productSearchService>('productSearchService');
export const getProductAnalyticsService = () => getContainer().get<typeof productAnalyticsService>('productAnalyticsService');
export const getProductAggregationService = () => getContainer().get<typeof productAggregationService>('productAggregationService');
export const getProductCacheService = () => getContainer().get<typeof productCacheService>('productCacheService');
export const getProductValidationService = () => getContainer().get<typeof productValidationService>('productValidationService');
export const getAnalyticsService = () => getContainer().get<AnalyticsService>('analyticsService');
export const getMediaService = () => getContainer().get<MediaDataService>('mediaService');
export const getBrandAccountService = () => getContainer().get<BrandAccountService>('brandAccountService');
export const getPendingVoteService = () => getContainer().get<PendingVoteService>('pendingVoteService');
export const getBillingService = () => getContainer().get<BillingService>('billingService');
export const getShopifyService = () => getContainer().get<ShopifyService>('shopifyService');
export const getWixService = () => getContainer().get<WixService>('wixService');
export const getWooCommerceService = () => getContainer().get<WooCommerceService>('wooCommerceService');
export const getNotificationsService = () => getContainer().get<NotificationsService>('notificationsService');
export const getNotificationsServices = () => getContainer().get<typeof notificationsModule>('notificationsServices');
export const getStripeService = () => getContainer().get<StripeService>('stripeService');
export const getTokenDiscountService = () => getContainer().get<TokenDiscountService>('tokenDiscountService');
export const getNftService = () => getContainer().get<NftService>('nftService');
export const getDomainMappingService = () => getContainer().get<DomainMappingService>('domainMappingService');
export const getInvitationService = () => getContainer().get<InvitationsService>('invitationService');

// New modular subscriptions services
export const getSubscriptionServices = () => getContainer().get<typeof subscriptionServices>('subscriptionServices');
export const getSubscriptionDataService = () => getContainer().get<SubscriptionDataService>('subscriptionDataService');
export const getSubscriptionLifecycleService = () => getContainer().get<SubscriptionLifecycleService>('subscriptionLifecycleService');
export const getSubscriptionUsageLimitsService = () => getContainer().get<SubscriptionUsageLimitsService>('subscriptionUsageLimitsService');
export const getSubscriptionAnalyticsService = () => getContainer().get<SubscriptionAnalyticsService>('subscriptionAnalyticsService');
export const getSubscriptionTierManagementService = () => getContainer().get<SubscriptionTierManagementService>('subscriptionTierManagementService');
export const getSubscriptionPlanValidationService = () => getContainer().get<SubscriptionPlanValidationService>('subscriptionPlanValidationService');

export const getUsageTrackingService = () => getContainer().get<UsageTrackingService>('usageTrackingService');
export const getSupplyChainService = () => getContainer().get<SupplyChainService>('supplyChainService');
export const getQrCodeService = () => getContainer().get<QrCodeService>('qrCodeService');
export const getSecurityAuditService = () => getContainer().get<SecurityAuditService>('securityAuditService');

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
export const getDomainValidationService = () => getContainer().get<DomainValidationService>('domainValidationService');
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

/**
 * Helper function to get multiple services at once
 */
export const getServices = () => ({
  // Core Services
  auth: getAuthService(),
  user: getUserService(),

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

  // Legacy Services (to be migrated)
  apiKey: getApiKeyService(),
  analytics: getAnalyticsService(),
  media: getMediaService(),
  brandAccountLegacy: getBrandAccountService(),
  billing: getBillingService(),
  shopify: getShopifyService(),
  wix: getWixService(),
  wooCommerce: getWooCommerceService(),
  notifications: getNotificationsServices(),
  stripe: getStripeService(),
  tokenDiscount: getTokenDiscountService(),
  nft: getNftService(),
  domainMapping: getDomainMappingService(),
  supplyChain: getSupplyChainService(),
  usageTracking: getUsageTrackingService()
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

