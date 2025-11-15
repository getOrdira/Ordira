/**
 * Infrastructure Service Module
 * 
 * Registers core infrastructure services (cache, database, performance, etc.)
 */

import { DependencyContainer } from 'tsyringe';
import { SERVICE_TOKENS } from '../core/serviceTokens';
import { BaseServiceModule } from './base.module';

export class InfrastructureServiceModule extends BaseServiceModule {
  readonly name = 'InfrastructureServiceModule';
  readonly dependencies: string[] = ['ConfigModule'];

  register(container: DependencyContainer): void {
    // Infrastructure services are typically registered as instances
    // in appBootstrap, but this module can handle any infrastructure
    // service registration that needs to happen early
  }

  async initialize(container: DependencyContainer): Promise<void> {
    // Initialize infrastructure services
  }
}

