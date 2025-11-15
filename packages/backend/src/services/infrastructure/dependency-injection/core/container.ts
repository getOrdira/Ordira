/**
 * Tsyringe Container Wrapper
 * 
 * Provides a unified interface to tsyringe's container with
 * additional utilities and type safety.
 */

import 'reflect-metadata';
import { container as tsyringeContainer, DependencyContainer, Lifecycle } from 'tsyringe';
import { SERVICE_TOKENS, ServiceToken } from './serviceTokens';

/**
 * Re-export tsyringe container as the main container
 */
export const container = tsyringeContainer;

/**
 * Service registration options
 */
export interface ServiceRegistrationOptions {
  lifecycle?: Lifecycle;
  singleton?: boolean;
  transient?: boolean;
}

/**
 * Enhanced container utilities
 */
export class Container {
  /**
   * Register a singleton instance
   */
  static registerInstance<T>(token: ServiceToken | string, instance: T): void {
    container.registerInstance(token, instance);
  }

  /**
   * Register a class as singleton
   */
  static registerSingleton<T>(
    token: ServiceToken | string,
    constructor: new (...args: any[]) => T
  ): void {
    container.registerSingleton(token, constructor);
  }

  /**
   * Register a class as transient
   */
  static registerTransient<T>(
    token: ServiceToken | string,
    constructor: new (...args: any[]) => T
  ): void {
    container.register(token, constructor, { lifecycle: Lifecycle.Transient });
  }

  /**
   * Register a factory
   */
  static registerFactory<T>(
    token: ServiceToken | string,
    factory: (dependencyContainer: DependencyContainer) => T
  ): void {
    container.register(token, {
      useFactory: factory
    });
  }

  /**
   * Resolve a service
   */
  static resolve<T>(token: ServiceToken | string): T {
    return container.resolve<T>(token);
  }

  /**
   * Check if a service is registered
   */
  static isRegistered(token: ServiceToken | string): boolean {
    return container.isRegistered(token);
  }

  /**
   * Resolve all instances of a token (for multi-injection)
   */
  static resolveAll<T>(token: ServiceToken | string): T[] {
    return container.resolveAll<T>(token);
  }

  /**
   * Create a child container
   */
  static createChildContainer(): DependencyContainer {
    return container.createChildContainer();
  }

  /**
   * Clear all registrations (useful for testing)
   */
  static clear(): void {
    container.clearInstances();
  }
}

/**
 * Export container as default for convenience
 */
export default container;

