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
import { ManufacturerService } from './business/manufacturer.service';
import { NotificationsService } from './external/notifications.service';

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

    // External Services
    this.services.set('billingService', new BillingService());
    this.services.set('shopifyService', new ShopifyService());
    this.services.set('notificationsService', new NotificationsService());
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
export const getBillingService = () => getContainer().get<BillingService>('billingService');
export const getShopifyService = () => getContainer().get<ShopifyService>('shopifyService');
export const getNotificationsService = () => getContainer().get<NotificationsService>('notificationsService');
