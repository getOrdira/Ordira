// src/services/container.service.ts

import { AuthService } from './business/auth.service';
import { UserService } from './business/user.service';
import { ProductService } from './business/product.service';
import { BrandSettingsService } from './business/brandSettings.service';
import { ApiKeyService } from './business/apiKey.service';
import { AnalyticsBusinessService } from './business/analytics.service';
import { VotingBusinessService } from './business/votes.service';
import { CertificateService } from './business/certificate.service';
import { MediaService } from './business/media.service';
import { BillingService } from './external/billing.service';
import { ShopifyService } from './external/shopify.service';
import { WixService } from './external/wix.service';
import { WooCommerceService } from './external/woocommerce.service';
import { ManufacturerService } from './business/manufacturer.service';
import { NotificationsService } from './external/notifications.service';
import { StripeService } from './external/stripe.service';
import { TokenDiscountService } from './external/tokenDiscount.service';
import { BrandAccountService } from './business/brandAccount.service';
import { NftService } from './blockchain/nft.service';
import { DomainMappingService } from './external/domainMapping.service';
import { NotificationService } from './business/notification.service';
import { BrandProfileService } from './business/brandProfile.service';
import { ManufacturerProfileService } from './business/manufacturerProfile.service';
import { PendingVoteService } from './business/pendingVote.service';
import { InvitationService } from './business/invitation.service';
import { EmailGatingService } from './business/emailGating.service';
import { ManufacturerAccountService } from './business/manufacturerAccount.service';
import { SubscriptionService } from './business/subscription.service';
import { QrCodeService } from './external/qrCode.service';
import { SecurityAuditService } from './security/securityAudit.service';

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
    // Business Services
    this.services.set('authService', new AuthService());
    this.services.set('userService', new UserService());
    this.services.set('productService', new ProductService());
    this.services.set('brandSettingsService', new BrandSettingsService());
    this.services.set('apiKeyService', new ApiKeyService());
    this.services.set('analyticsService', new AnalyticsBusinessService());
    this.services.set('votingService', new VotingBusinessService());
    this.services.set('certificateService', new CertificateService());
    this.services.set('mediaService', new MediaService());
    this.services.set('manufacturerService', new ManufacturerService());
    this.services.set('brandAccountService', new BrandAccountService());
    this.services.set('brandProfileService', new BrandProfileService());
    this.services.set('manufacturerProfileService', new ManufacturerProfileService());
    this.services.set('pendingVoteService', new PendingVoteService());
    this.services.set('notificationService', new NotificationService());
    this.services.set('invitationService', new InvitationService());
    this.services.set('emailGatingService', new EmailGatingService());
    this.services.set('manufacturerAccountService', new ManufacturerAccountService());
    this.services.set('subscriptionService', new SubscriptionService());
    // External/Platform Services
    this.services.set('domainMappingService', new DomainMappingService());
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
export const getAuthService = () => getContainer().get<AuthService>('authService');
export const getUserService = () => getContainer().get<UserService>('userService');
export const getProductService = () => getContainer().get<ProductService>('productService');
export const getBrandSettingsService = () => getContainer().get<BrandSettingsService>('brandSettingsService');
export const getApiKeyService = () => getContainer().get<ApiKeyService>('apiKeyService');
export const getAnalyticsService = () => getContainer().get<AnalyticsBusinessService>('analyticsService');
export const getVotingService = () => getContainer().get<VotingBusinessService>('votingService');
export const getCertificateService = () => getContainer().get<CertificateService>('certificateService');
export const getMediaService = () => getContainer().get<MediaService>('mediaService');
export const getManufacturerService = () => getContainer().get<ManufacturerService>('manufacturerService');
export const getBrandAccountService = () => getContainer().get<BrandAccountService>('brandAccountService');
export const getBrandProfileService = () => getContainer().get<BrandProfileService>('brandProfileService');
export const getManufacturerProfileService = () => getContainer().get<ManufacturerProfileService>('manufacturerProfileService');
export const getPendingVoteService = () => getContainer().get<PendingVoteService>('pendingVoteService');
export const getBillingService = () => getContainer().get<BillingService>('billingService');
export const getShopifyService = () => getContainer().get<ShopifyService>('shopifyService');
export const getWixService = () => getContainer().get<WixService>('wixService');
export const getWooCommerceService = () => getContainer().get<WooCommerceService>('wooCommerceService');
export const getNotificationsService = () => getContainer().get<NotificationsService>('notificationsService');
export const getNotificationService = () => getContainer().get<NotificationService>('notificationService');
export const getStripeService = () => getContainer().get<StripeService>('stripeService');
export const getTokenDiscountService = () => getContainer().get<TokenDiscountService>('tokenDiscountService');
export const getNftService = () => getContainer().get<NftService>('nftService');
export const getDomainMappingService = () => getContainer().get<DomainMappingService>('domainMappingService');
export const getInvitationService = () => getContainer().get<InvitationService>('invitationService');
export const getEmailGatingService = () => getContainer().get<EmailGatingService>('emailGatingService');
export const getManufacturerAccountService = () => getContainer().get<ManufacturerAccountService>('manufacturerAccountService');
export const getSubscriptionService = () => getContainer().get<SubscriptionService>('subscriptionService');
export const getQrCodeService = () => getContainer().get<QrCodeService>('qrCodeService');
export const getSecurityAuditService = () => getContainer().get<SecurityAuditService>('securityAuditService');

/**
 * Helper function to get multiple services at once
 */
export const getServices = () => ({
  auth: getAuthService(),
  user: getUserService(),
  product: getProductService(),
  brandSettings: getBrandSettingsService(),
  apiKey: getApiKeyService(),
  analytics: getAnalyticsService(),
  voting: getVotingService(),
  certificate: getCertificateService(),
  media: getMediaService(),
  manufacturer: getManufacturerService(),
  brandAccount: getBrandAccountService(),
  billing: getBillingService(),
  shopify: getShopifyService(),
  wix: getWixService(),
  wooCommerce: getWooCommerceService(),
  notifications: getNotificationsService(),
  stripe: getStripeService(),
  tokenDiscount: getTokenDiscountService(),
  nft: getNftService(),
  domainMapping: getDomainMappingService()
});
