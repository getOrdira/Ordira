/**
 * Business Service Module
 * 
 * Registers all business logic services (users, tenants, products, etc.)
 */

import { DependencyContainer } from 'tsyringe';
import { SERVICE_TOKENS } from '../core/serviceTokens';
import { BaseServiceModule } from './base.module';

export class BusinessServiceModule extends BaseServiceModule {
  readonly name = 'BusinessServiceModule';
  readonly dependencies: string[] = ['ConfigModule', 'DatabaseModule', 'CacheModule'];

  register(container: DependencyContainer): void {
    // Register business services
    // Services should be decorated with @injectable() in their own files
    
    // Example:
    // container.registerSingleton(SERVICE_TOKENS.SECURITY_SERVICE, SecurityService);
    // container.registerSingleton(SERVICE_TOKENS.TENANT_SERVICE, TenantService);
  }

  async initialize(container: DependencyContainer): Promise<void> {
    // Initialize business services if needed
  }
}

