/**
 * Dependency Injection Container Service
 * 
 * Provides a lightweight DI container for managing service dependencies
 * and improving testability and maintainability.
 */

export interface ServiceConstructor<T = any> {
  new (...args: any[]): T;
}

export interface ServiceFactory<T = any> {
  (): T;
}

export interface ServiceInstance<T = any> {
  instance: T;
  singleton: boolean;
}

export class DIContainer {
  private services = new Map<string, ServiceInstance>();
  private factories = new Map<string, ServiceFactory>();
  private constructors = new Map<string, ServiceConstructor>();

  /**
   * Register a service constructor
   */
  register<T>(
    token: string,
    constructor: ServiceConstructor<T>,
    singleton: boolean = true
  ): void {
    this.constructors.set(token, constructor);
    
    if (singleton) {
      // For singletons, we'll instantiate on first resolve
      this.services.set(token, { instance: null as T | null, singleton: true });
    }
  }

  /**
   * Register a service factory function
   */
  registerFactory<T>(
    token: string,
    factory: ServiceFactory<T>,
    singleton: boolean = true
  ): void {
    this.factories.set(token, factory);
    
    if (singleton) {
      this.services.set(token, { instance: null as T | null, singleton: true });
    }
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(token: string, instance: T): void {
    this.services.set(token, { instance, singleton: true });
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    // Check if we have a cached instance
    const cached = this.services.get(token);
    if (cached && cached.instance) {
      return cached.instance;
    }

    // Try to resolve from factory
    const factory = this.factories.get(token);
    if (factory) {
      const instance = factory();
      if (cached?.singleton) {
        cached.instance = instance;
      }
      return instance;
    }

    // Try to resolve from constructor
    const constructor = this.constructors.get(token);
    if (constructor) {
      const instance = new constructor();
      if (cached?.singleton) {
        cached.instance = instance;
      }
      return instance;
    }

    throw new Error(`Service '${token}' not found in container`);
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || 
           this.factories.has(token) || 
           this.constructors.has(token);
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.constructors.clear();
  }

  /**
   * Get all registered service tokens
   */
  getTokens(): string[] {
    const tokens = new Set<string>();
    this.services.forEach((_, token) => tokens.add(token));
    this.factories.forEach((_, token) => tokens.add(token));
    this.constructors.forEach((_, token) => tokens.add(token));
    return Array.from(tokens);
  }

  /**
   * Create a child container that inherits from this one
   */
  createChild(): DIContainer {
    const child = new DIContainer();
    
    // Copy all registrations to child
    this.services.forEach((service, token) => {
      child.services.set(token, { ...service });
    });
    
    this.factories.forEach((factory, token) => {
      child.factories.set(token, factory);
    });
    
    this.constructors.forEach((constructor, token) => {
      child.constructors.set(token, constructor);
    });
    
    return child;
  }
}

// Global container instance
export const container = new DIContainer();

// Service tokens for type safety
export const SERVICE_TOKENS = {
  // Configuration
  CONFIG_SERVICE: 'ConfigService',
  
  // External services
  CACHE_SERVICE: 'CacheService',
  DATABASE_SERVICE: 'DatabaseService',
  PERFORMANCE_SERVICE: 'PerformanceService',
  S3_SERVICE: 'S3Service',
  
  // Business services
  AUTH_SERVICE: 'AuthService',
  SECURITY_SERVICE: 'SecurityService',
  TENANT_SERVICE: 'TenantService',
  
  // Utilities
  UTILS_SERVICE: 'UtilsService',
  
  // Models (for dependency injection)
  USER_MODEL: 'UserModel',
  BUSINESS_MODEL: 'BusinessModel',
  MANUFACTURER_MODEL: 'ManufacturerModel',
  BRAND_SETTINGS_MODEL: 'BrandSettingsModel',
  VOTING_RECORD_MODEL: 'VotingRecordModel',
  CERTIFICATE_MODEL: 'CertificateModel',
} as const;

export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];
