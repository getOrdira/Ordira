/**
 * Enhanced Dependency Injection Container Service
 * 
 * Provides a modern DI container with:
 * - Constructor parameter injection
 * - Service lifecycle hooks
 * - Scoped services (singleton, transient, request-scoped)
 * - Circular dependency detection
 * - Type-safe service resolution
 * 
 * @version 2.0
 */

export type ServiceScope = 'singleton' | 'transient' | 'request';

export interface ServiceConstructor<T = any> {
  new (...args: any[]): T;
}

export interface ServiceFactory<T = any> {
  (container: DIContainer): T;
}

export interface ServiceInstance<T = any> {
  instance: T | null;
  scope: ServiceScope;
  constructor?: ServiceConstructor<T> | undefined;
  factory?: ServiceFactory<T> | undefined;
  dependencies?: string[];
  metadata?: ServiceMetadata;
}

export interface ServiceMetadata {
  token: string;
  dependencies: string[];
  scope: ServiceScope;
  lifecycle?: {
    onInit?: (instance: any) => void | Promise<void>;
    onDestroy?: (instance: any) => void | Promise<void>;
  };
}

export interface InjectableOptions {
  scope?: ServiceScope;
  token?: string;
  dependencies?: string[];
}

/**
 * Service lifecycle interface
 */
export interface ServiceLifecycle {
  onInit?(): void | Promise<void>;
  onDestroy?(): void | Promise<void>;
}

export class DIContainer {
  private services = new Map<string, ServiceInstance>();
  private factories = new Map<string, ServiceFactory>();
  private constructors = new Map<string, ServiceConstructor>();
  private metadata = new Map<string, ServiceMetadata>();
  private resolving = new Set<string>(); // Track circular dependencies
  private requestScoped = new Map<string, any>(); // Request-scoped instances

  /**
   * Register a service constructor with dependency injection
   */
  register<T>(
    token: string,
    constructor: ServiceConstructor<T>,
    options: {
      scope?: ServiceScope;
      dependencies?: string[];
      lifecycle?: ServiceMetadata['lifecycle'];
    } = {}
  ): void {
    const scope = options.scope || 'singleton';
    const dependencies = options.dependencies || this.extractDependencies(constructor);
    
    this.constructors.set(token, constructor);
    this.metadata.set(token, {
      token,
      dependencies,
      scope,
      lifecycle: options.lifecycle
    });
    
    if (scope === 'singleton') {
      this.services.set(token, {
        instance: null,
        scope,
        constructor,
        dependencies,
        metadata: this.metadata.get(token)
      });
    } else {
      // For transient and request-scoped, we don't cache the instance
      this.services.set(token, {
        instance: null,
        scope,
        constructor,
        dependencies,
        metadata: this.metadata.get(token)
      });
    }
  }

  /**
   * Register a service factory function
   */
  registerFactory<T>(
    token: string,
    factory: ServiceFactory<T>,
    options: {
      scope?: ServiceScope;
      dependencies?: string[];
      lifecycle?: ServiceMetadata['lifecycle'];
    } = {}
  ): void {
    const scope = options.scope || 'singleton';
    
    this.factories.set(token, factory);
    this.metadata.set(token, {
      token,
      dependencies: options.dependencies || [],
      scope,
      lifecycle: options.lifecycle
    });
    
    const serviceInstance: ServiceInstance<T> = {
      instance: null,
      scope,
      constructor: undefined,
      factory,
      dependencies: options.dependencies || [],
      metadata: this.metadata.get(token)
    };
    
    this.services.set(token, serviceInstance);
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(token: string, instance: T, options: {
    scope?: ServiceScope;
    lifecycle?: ServiceMetadata['lifecycle'];
  } = {}): void {
    const scope = options.scope || 'singleton';
    
    const serviceInstance: ServiceInstance<T> = {
      instance,
      scope,
      constructor: undefined,
      factory: undefined,
      dependencies: [],
      metadata: {
        token,
        dependencies: [],
        scope,
        lifecycle: options.lifecycle
      }
    };
    
    this.services.set(token, serviceInstance);
    
    // Call onInit if provided
    if (options.lifecycle?.onInit) {
      Promise.resolve(options.lifecycle.onInit(instance)).catch(err => {
        console.error(`Error in onInit for ${token}:`, err);
      });
    }
  }

  /**
   * Resolve a service by token with dependency injection
   */
  resolve<T>(token: string, requestId?: string): T {
    // Check for circular dependency
    if (this.resolving.has(token)) {
      throw new Error(
        `Circular dependency detected: ${Array.from(this.resolving).join(' -> ')} -> ${token}`
      );
    }

    this.resolving.add(token);

    try {
      // Handle request-scoped services
      if (requestId) {
        const requestKey = `${token}:${requestId}`;
        const cached = this.requestScoped.get(requestKey);
        if (cached) {
          return cached;
        }
      }

      const serviceInfo = this.services.get(token);
      
      // Check if we have a cached singleton instance
      if (serviceInfo?.scope === 'singleton' && serviceInfo.instance) {
        return serviceInfo.instance;
      }

      let instance: T;

      // Try to resolve from factory
      const factory = this.factories.get(token);
      if (factory) {
        instance = factory(this);
      } 
      // Try to resolve from constructor with dependency injection
      else {
        const constructor = this.constructors.get(token);
        if (constructor) {
          const metadata = this.metadata.get(token);
          const dependencies = metadata?.dependencies || [];
          
          // Resolve all dependencies
          const resolvedDeps = dependencies.map(depToken => {
            if (!this.has(depToken)) {
              throw new Error(
                `Dependency '${depToken}' not found for service '${token}'`
              );
            }
            return this.resolve(depToken, requestId);
          });
          
          // Instantiate with injected dependencies
          instance = new constructor(...resolvedDeps);
        } else {
          throw new Error(`Service '${token}' not found in container`);
        }
      }

      // Call lifecycle hooks
      const metadata = this.metadata.get(token);
      if (metadata?.lifecycle?.onInit) {
        Promise.resolve(metadata.lifecycle.onInit(instance)).catch(err => {
          console.error(`Error in onInit for ${token}:`, err);
        });
      }

      // Cache based on scope
      if (serviceInfo) {
        if (serviceInfo.scope === 'singleton') {
          serviceInfo.instance = instance;
        } else if (serviceInfo.scope === 'request' && requestId) {
          const requestKey = `${token}:${requestId}`;
          this.requestScoped.set(requestKey, instance);
        }
        // Transient services are not cached
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Extract dependencies from constructor using parameter names
   * This is a basic implementation - in production, you'd use decorators or metadata
   */
  private extractDependencies(constructor: ServiceConstructor): string[] {
    // Try to get dependencies from constructor metadata
    // This requires TypeScript emitDecoratorMetadata or manual registration
    const paramTypes = (constructor as any).__dependencies || [];
    return paramTypes;
  }

  /**
   * Manually set dependencies for a constructor (used when decorators aren't available)
   */
  setDependencies(token: string, dependencies: string[]): void {
    const metadata = this.metadata.get(token);
    if (metadata) {
      metadata.dependencies = dependencies;
    } else {
      this.metadata.set(token, {
        token,
        dependencies,
        scope: 'singleton'
      });
    }
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
    // Call onDestroy for all services
    this.services.forEach((service, token) => {
      if (service.instance && service.metadata?.lifecycle?.onDestroy) {
        Promise.resolve(service.metadata.lifecycle.onDestroy(service.instance)).catch(err => {
          console.error(`Error in onDestroy for ${token}:`, err);
        });
      }
    });
    
    this.services.clear();
    this.factories.clear();
    this.constructors.clear();
    this.metadata.clear();
    this.requestScoped.clear();
  }

  /**
   * Clear request-scoped instances for a specific request
   */
  clearRequestScope(requestId: string): void {
    const keysToDelete: string[] = [];
    this.requestScoped.forEach((_, key) => {
      if (key.endsWith(`:${requestId}`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      const instance = this.requestScoped.get(key);
      // Find metadata and call onDestroy if needed
      const token = key.split(':')[0];
      const metadata = this.metadata.get(token);
      if (instance && metadata?.lifecycle?.onDestroy) {
        Promise.resolve(metadata.lifecycle.onDestroy(instance)).catch(err => {
          console.error(`Error in onDestroy for ${token}:`, err);
        });
      }
      this.requestScoped.delete(key);
    });
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
   * Get service metadata
   */
  getMetadata(token: string): ServiceMetadata | undefined {
    return this.metadata.get(token);
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
    
    this.metadata.forEach((metadata, token) => {
      child.metadata.set(token, { ...metadata });
    });
    
    return child;
  }

  /**
   * Resolve multiple services at once
   */
  resolveMany<T>(tokens: string[], requestId?: string): T[] {
    return tokens.map(token => this.resolve<T>(token, requestId));
  }

  /**
   * Check if a service is currently being resolved (for debugging)
   */
  isResolving(token: string): boolean {
    return this.resolving.has(token);
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

  // Supply Chain modular services
  SUPPLY_CHAIN_REGISTRY: 'SupplyChainServicesRegistry',
  SUPPLY_CHAIN_DEPLOYMENT_SERVICE: 'SupplyChainDeploymentService',
  SUPPLY_CHAIN_ASSOCIATION_SERVICE: 'SupplyChainAssociationService',
  SUPPLY_CHAIN_CONTRACT_READ_SERVICE: 'SupplyChainContractReadService',
  SUPPLY_CHAIN_CONTRACT_WRITE_SERVICE: 'SupplyChainContractWriteService',
  SUPPLY_CHAIN_QR_CODE_SERVICE: 'SupplyChainQrCodeService',
  SUPPLY_CHAIN_DASHBOARD_SERVICE: 'SupplyChainDashboardService',
  SUPPLY_CHAIN_ANALYTICS_SERVICE: 'SupplyChainAnalyticsService',
  SUPPLY_CHAIN_PRODUCT_LIFECYCLE_SERVICE: 'SupplyChainProductLifecycleService',
  SUPPLY_CHAIN_VALIDATION_SERVICE: 'SupplyChainValidationService',
  SUPPLY_CHAIN_MAPPERS: 'SupplyChainMappers',
  SUPPLY_CHAIN_LOG_SERVICE: 'SupplyChainLogParsingService',

  // Models (for dependency injection)
  USER_MODEL: 'UserModel',
  BUSINESS_MODEL: 'BusinessModel',
  MANUFACTURER_MODEL: 'ManufacturerModel',
  PRODUCT_MODEL: 'ProductModel',
  BRAND_SETTINGS_MODEL: 'BrandSettingsModel',
  VOTING_RECORD_MODEL: 'VotingRecordModel',
  CERTIFICATE_MODEL: 'CertificateModel',
  MEDIA_MODEL: 'MediaModel',
  SECURITY_EVENT_MODEL: 'SecurityEventModel',
  ACTIVE_SESSION_MODEL: 'ActiveSessionModel',
  BLACKLISTED_TOKEN_MODEL: 'BlacklistedTokenModel',
} as const;

export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];
