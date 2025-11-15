/**
 * Module Registration Types
 * 
 * Defines interfaces for module-based service registration
 */

import { DependencyContainer } from 'tsyringe';

/**
 * Interface for service registration modules
 */
export interface IServiceModule {
  /**
   * Module name for identification
   */
  readonly name: string;

  /**
   * Register all services in this module
   */
  register(container: DependencyContainer): void;

  /**
   * Optional: Initialize module after all services are registered
   */
  initialize?(container: DependencyContainer): Promise<void> | void;

  /**
   * Optional: Cleanup when module is unloaded
   */
  cleanup?(container: DependencyContainer): Promise<void> | void;

  /**
   * Dependencies on other modules (module names)
   */
  readonly dependencies?: string[];

  /**
   * Feature flags required for this module to be active
   */
  readonly featureFlags?: string[];
}

/**
 * Module registration options
 */
export interface ModuleRegistrationOptions {
  /**
   * Whether to register this module conditionally
   */
  conditional?: boolean;

  /**
   * Feature flags that must be enabled
   */
  featureFlags?: string[];

  /**
   * Priority order (lower numbers register first)
   */
  priority?: number;
}

