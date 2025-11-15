/**
 * Module Registry Service
 * 
 * Discovers, validates, and loads feature modules for the application.
 * Handles dependency checking and module initialization order.
 */

import { Application } from 'express';
import { IFeatureModule, ModuleRegistrationOptions } from './types';
import { container, SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { logger } from '../../logging';

/**
 * Module registry for managing feature modules
 */
export class ModuleRegistry {
  private modules: Map<string, IFeatureModule> = new Map();
  private moduleOptions: Map<string, ModuleRegistrationOptions> = new Map();

  /**
   * Register a feature module
   * 
   * @param module - Feature module instance
   * @param options - Optional registration options
   */
  register(module: IFeatureModule, options: ModuleRegistrationOptions = {}): void {
    if (this.modules.has(module.name)) {
      logger.warn(`Module '${module.name}' is already registered, skipping duplicate registration`);
      return;
    }

    this.modules.set(module.name, module);
    this.moduleOptions.set(module.name, { enabled: true, ...options });
    logger.debug(`Registered module: ${module.name}`);
  }

  /**
   * Register multiple modules at once
   * 
   * @param modules - Array of feature module instances
   * @param options - Optional registration options (applied to all modules)
   */
  registerAll(modules: IFeatureModule[], options: ModuleRegistrationOptions = {}): void {
    modules.forEach(module => this.register(module, options));
  }

  /**
   * Check if all dependencies for a module are available
   * 
   * @param module - Feature module to check
   * @returns True if all dependencies are registered
   */
  private validateDependencies(module: IFeatureModule): boolean {
    const dependencies = module.getDependencies();
    const missing: string[] = [];

    for (const token of dependencies) {
      if (!container.has(token)) {
        missing.push(token);
      }
    }

    if (missing.length > 0) {
      logger.error(
        `Module '${module.name}' has missing dependencies: ${missing.join(', ')}`
      );
      return false;
    }

    return true;
  }

  /**
   * Get all registered modules
   * 
   * @returns Array of registered modules
   */
  getAllModules(): IFeatureModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get enabled modules (filtered by options)
   * 
   * @returns Array of enabled modules
   */
  getEnabledModules(): IFeatureModule[] {
    return Array.from(this.modules.values()).filter(module => {
      const options = this.moduleOptions.get(module.name);
      return options?.enabled !== false;
    });
  }

  /**
   * Initialize all registered modules
   * Validates dependencies, initializes modules, and registers routes
   * 
   * @param app - Express application instance
   */
  async initializeModules(app: Application): Promise<void> {
    logger.info('🔧 Initializing feature modules...');

    const enabledModules = this.getEnabledModules();
    const initialized: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    // Validate dependencies for all modules first
    for (const module of enabledModules) {
      if (!this.validateDependencies(module)) {
        failed.push({
          name: module.name,
          error: 'Missing dependencies'
        });
        continue;
      }
    }

    // Initialize modules (call initialize hook if present)
    for (const module of enabledModules) {
      if (failed.some(f => f.name === module.name)) {
        continue;
      }

      try {
        if (module.initialize) {
          await module.initialize(app);
        }
        initialized.push(module.name);
      } catch (error) {
        logger.error(`Failed to initialize module '${module.name}':`, error);
        failed.push({
          name: module.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Register middleware for all modules
    for (const module of enabledModules) {
      if (failed.some(f => f.name === module.name)) {
        continue;
      }

      try {
        if (module.registerMiddleware) {
          await module.registerMiddleware(app);
        }
      } catch (error) {
        logger.error(`Failed to register middleware for module '${module.name}':`, error);
        failed.push({
          name: module.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Register routes for all modules
    for (const module of enabledModules) {
      if (failed.some(f => f.name === module.name)) {
        continue;
      }

      try {
        await module.registerRoutes(app);
      } catch (error) {
        logger.error(`Failed to register routes for module '${module.name}':`, error);
        failed.push({
          name: module.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log results
    if (initialized.length > 0) {
      logger.info(`✅ Initialized ${initialized.length} modules: ${initialized.join(', ')}`);
    }

    if (failed.length > 0) {
      logger.warn(`⚠️ Failed to initialize ${failed.length} modules: ${failed.map(f => f.name).join(', ')}`);
      failed.forEach(({ name, error }) => {
        logger.error(`  - ${name}: ${error}`);
      });
    }
  }

  /**
   * Get module by name
   * 
   * @param name - Module name
   * @returns Module instance or undefined
   */
  getModule(name: string): IFeatureModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module is registered
   * 
   * @param name - Module name
   * @returns True if module is registered
   */
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Clear all registered modules (useful for testing)
   */
  clear(): void {
    this.modules.clear();
    this.moduleOptions.clear();
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry();

