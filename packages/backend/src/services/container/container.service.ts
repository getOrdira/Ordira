/**
 * Service Container
 * 
 * Centralizes service instantiation and provides singleton instances
 * to prevent tight coupling and improve testability.
 * 
 * Service registrations are organized in container.registrations.ts
 * Getter functions are organized in container.getters.ts
 */

import { registerAllServices } from './container.registrations';

/**
 * Dependency Injection Container
 * Centralizes service instantiation and provides singleton instances
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
    registerAllServices(this.services);
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

// Re-export all getter functions for backward compatibility
export * from './container.getters';

