/**
 * Service Module Registry
 * 
 * Manages registration and initialization of service modules
 */

import { DependencyContainer } from 'tsyringe';
import { IServiceModule } from './types';
import { logger } from '../../logging';

export class ServiceModuleRegistry {
  private modules = new Map<string, IServiceModule>();
  private registeredModules = new Set<string>();
  private initializedModules = new Set<string>();

  /**
   * Register a service module
   */
  register(module: IServiceModule): void {
    if (this.modules.has(module.name)) {
      logger.warn(`Module ${module.name} is already registered, skipping...`);
      return;
    }

    this.modules.set(module.name, module);
    logger.info(`📦 Registered service module: ${module.name}`);
  }

  /**
   * Register multiple modules
   */
  registerAll(modules: IServiceModule[]): void {
    modules.forEach(module => this.register(module));
  }

  /**
   * Register all modules in dependency order
   */
  async registerAllModules(container: DependencyContainer): Promise<void> {
    const modules = Array.from(this.modules.values());
    
    // Sort by dependencies (topological sort)
    const sortedModules = this.topologicalSort(modules);
    
    // Register modules in dependency order
    for (const module of sortedModules) {
      await this.registerModule(module, container);
    }
  }

  /**
   * Register a single module and its dependencies
   */
  private async registerModule(
    module: IServiceModule,
    container: DependencyContainer
  ): Promise<void> {
    if (this.registeredModules.has(module.name)) {
      return; // Already registered
    }

    // Register dependencies first
    if (module.dependencies) {
      for (const depName of module.dependencies) {
        const depModule = this.modules.get(depName);
        if (depModule && !this.registeredModules.has(depName)) {
          await this.registerModule(depModule, container);
        }
      }
    }

    // Check feature flags
    if (module.featureFlags) {
      const enabled = module.featureFlags.every(flag => {
        // Check if feature flag is enabled (implement your feature flag logic)
        return process.env[`FEATURE_${flag.toUpperCase()}`] === 'true';
      });

      if (!enabled) {
        logger.info(`⏭️  Skipping module ${module.name} - feature flags not enabled`);
        return;
      }
    }

    // Register the module
    try {
      module.register(container);
      this.registeredModules.add(module.name);
      logger.info(`✅ Registered service module: ${module.name}`);
    } catch (error) {
      logger.error(`❌ Failed to register module ${module.name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize all registered modules
   */
  async initializeAll(container: DependencyContainer): Promise<void> {
    const modules = Array.from(this.modules.values())
      .filter(m => this.registeredModules.has(m.name));

    for (const module of modules) {
      if (module.initialize && !this.initializedModules.has(module.name)) {
        try {
          await module.initialize(container);
          this.initializedModules.add(module.name);
          logger.info(`🚀 Initialized service module: ${module.name}`);
        } catch (error) {
          logger.error(`❌ Failed to initialize module ${module.name}:`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Topological sort for dependency ordering
   */
  private topologicalSort(modules: IServiceModule[]): IServiceModule[] {
    const sorted: IServiceModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (module: IServiceModule): void => {
      if (visiting.has(module.name)) {
        throw new Error(`Circular dependency detected in modules: ${module.name}`);
      }

      if (visited.has(module.name)) {
        return;
      }

      visiting.add(module.name);

      // Visit dependencies first
      if (module.dependencies) {
        for (const depName of module.dependencies) {
          const depModule = modules.find(m => m.name === depName);
          if (depModule) {
            visit(depModule);
          }
        }
      }

      visiting.delete(module.name);
      visited.add(module.name);
      sorted.push(module);
    };

    modules.forEach(module => {
      if (!visited.has(module.name)) {
        visit(module);
      }
    });

    return sorted;
  }

  /**
   * Get all registered module names
   */
  getRegisteredModules(): string[] {
    return Array.from(this.registeredModules);
  }

  /**
   * Clear all modules (useful for testing)
   */
  clear(): void {
    this.modules.clear();
    this.registeredModules.clear();
    this.initializedModules.clear();
  }
}

// Global module registry instance
export const serviceModuleRegistry = new ServiceModuleRegistry();

