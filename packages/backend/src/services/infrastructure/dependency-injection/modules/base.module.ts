/**
 * Base Service Module
 * 
 * Abstract base class for service registration modules
 */

import { DependencyContainer } from 'tsyringe';
import { IServiceModule } from './types';

/**
 * Abstract base class for service modules
 */
export abstract class BaseServiceModule implements IServiceModule {
  abstract readonly name: string;
  readonly dependencies?: string[];
  readonly featureFlags?: string[];

  /**
   * Register services in this module
   */
  abstract register(container: DependencyContainer): void;

  /**
   * Optional initialization hook
   */
  initialize?(container: DependencyContainer): Promise<void> | void;

  /**
   * Optional cleanup hook
   */
  cleanup?(container: DependencyContainer): Promise<void> | void;
}

