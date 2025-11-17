/**
 * Type-Safe Service Registry
 * 
 * Provides type-safe service registration and resolution
 */

import { ServiceMetadata, DIContainer } from '../core/diContainer.service';
import { container, SERVICE_TOKENS, ServiceToken } from '../core/diContainer.service';
import { ServiceScope, ServiceLifecycle } from '../core/diContainer.service';

/**
 * Type-safe service registration helper
 */
export class ServiceRegistry {
  /**
   * Register a service with type safety
   */
  static register<T>(
    token: ServiceToken | string,
    constructor: new (...args: any[]) => T,
    options: {
      scope?: ServiceScope;
      dependencies?: (ServiceToken | string)[];
      lifecycle?: ServiceLifecycle;
    } = {}
  ): void {
    container.register(token, constructor, {
      scope: options.scope,
      dependencies: options.dependencies,
      lifecycle: options.lifecycle
    });
  }

  /**
   * Register a factory with type safety
   */
  static registerFactory<T>(
    token: ServiceToken | string,
    factory: (container: DIContainer) => T,
    options: {
      scope?: ServiceScope;
      dependencies?: (ServiceToken | string)[];
      lifecycle?: ServiceLifecycle;
    } = {}
  ): void {
    container.registerFactory(token, factory, {
      scope: options.scope,
      dependencies: options.dependencies,
      lifecycle: options.lifecycle as ServiceMetadata['lifecycle']
    });
  }

  /**
   * Register an instance with type safety
   */
  static registerInstance<T>(
    token: ServiceToken | string,
    instance: T,
    options: {
      scope?: ServiceScope;
      lifecycle?: ServiceLifecycle;
    } = {}
  ): void {
    container.registerInstance(token, instance, {
      scope: options.scope,
      lifecycle: options.lifecycle
    });
  }

  /**
   * Resolve a service with type safety
   */
  static resolve<T>(token: ServiceToken | string, requestId?: string): T {
    return container.resolve<T>(token, requestId);
  }

  /**
   * Check if a service is registered
   */
  static has(token: ServiceToken | string): boolean {
    return container.has(token);
  }

  /**
   * Set dependencies for a service (useful when decorators aren't available)
   */
  static setDependencies(
    token: ServiceToken | string,
    dependencies: (ServiceToken | string)[]
  ): void {
    container.setDependencies(token, dependencies);
  }
}

/**
 * Helper function for type-safe service resolution
 */
export function resolveService<T>(token: ServiceToken | string, requestId?: string): T {
  return ServiceRegistry.resolve<T>(token, requestId);
}

/**
 * Helper function for type-safe service registration
 */
export function registerService<T>(
  token: ServiceToken | string,
  constructor: new (...args: any[]) => T,
  options?: {
    scope?: ServiceScope;
    dependencies?: (ServiceToken | string)[];
    lifecycle?: ServiceLifecycle;
  }
): void {
  ServiceRegistry.register(token, constructor, options);
}

