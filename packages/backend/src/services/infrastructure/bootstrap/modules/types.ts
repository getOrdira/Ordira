/**
 * Feature Module Types
 * 
 * Defines interfaces and types for feature modules that can be
 * discovered and loaded by the ModuleRegistry.
 */

import { Application, RequestHandler } from 'express';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';

/**
 * Service token type for dependency declarations
 */
export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

/**
 * Feature module interface that all domain modules must implement
 */
export interface IFeatureModule {
  /**
   * Module name for identification and logging
   */
  readonly name: string;

  /**
   * Register routes for this feature module
   * 
   * @param app - Express application instance
   */
  registerRoutes(app: Application): void | Promise<void>;

  /**
   * Register module-specific middleware
   * This is called before routes are registered
   * 
   * @param app - Express application instance
   */
  registerMiddleware?(app: Application): void | Promise<void>;

  /**
   * Get list of required service tokens that must be registered
   * in the DI container before this module can be loaded
   * 
   * @returns Array of service token strings
   */
  getDependencies(): ServiceToken[];

  /**
   * Optional initialization hook called after dependencies are verified
   * 
   * @param app - Express application instance
   */
  initialize?(app: Application): void | Promise<void>;
}

/**
 * Module registration options
 */
export interface ModuleRegistrationOptions {
  /**
   * Whether to enable this module (for feature flags)
   */
  enabled?: boolean;

  /**
   * Module-specific configuration
   */
  config?: Record<string, any>;
}

