/**
 * Base Feature Module
 * 
 * Abstract base class that provides common functionality for feature modules.
 * Feature modules should extend this class for consistency.
 */

import { Application } from 'express';
import { IFeatureModule, ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';

/**
 * Abstract base class for feature modules
 */
export abstract class BaseFeatureModule implements IFeatureModule {
  abstract readonly name: string;

  /**
   * Register routes for this feature module
   * Must be implemented by subclasses
   */
  abstract registerRoutes(app: Application): void | Promise<void>;

  /**
   * Register module-specific middleware
   * Override in subclasses if needed
   */
  registerMiddleware?(app: Application): void | Promise<void>;

  /**
   * Get list of required service tokens
   * Override in subclasses to declare dependencies
   */
  getDependencies(): ServiceToken[] {
    return [];
  }

  /**
   * Optional initialization hook
   * Override in subclasses if needed
   */
  initialize?(app: Application): void | Promise<void>;
}

