/**
 * Supply Chain Service Module
 * 
 * Registers all supply chain related services
 */

import { DependencyContainer } from 'tsyringe';
import { SERVICE_TOKENS } from '../core/serviceTokens';
import { BaseServiceModule } from './base.module';

export class SupplyChainServiceModule extends BaseServiceModule {
  readonly name = 'SupplyChainServiceModule';
  readonly dependencies: string[] = ['ConfigModule', 'DatabaseModule', 'CacheModule'];
  readonly featureFlags?: string[] = ['supplyChainEnabled'];

  register(container: DependencyContainer): void {
    // Register supply chain services
    // Services should use @injectable() decorator in their own files
    
    // Example:
    // container.registerSingleton(
    //   SERVICE_TOKENS.SUPPLY_CHAIN_REGISTRY,
    //   SupplyChainServicesRegistry
    // );
  }

  async initialize(container: DependencyContainer): Promise<void> {
    // Initialize supply chain services
  }
}

