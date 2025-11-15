/**
 * Authentication Service Module
 * 
 * Registers all authentication-related services
 */

import { container, DependencyContainer } from 'tsyringe';
import { SERVICE_TOKENS } from '../core/serviceTokens';
import { BaseServiceModule } from './base.module';

export class AuthServiceModule extends BaseServiceModule {
  readonly name = 'AuthServiceModule';
  readonly dependencies: string[] = ['ConfigModule', 'DatabaseModule', 'CacheModule'];

  register(container: DependencyContainer): void {
    // Register auth service
    // Note: Services should be decorated with @injectable() in their own files
    // This module just ensures they're registered in the correct order
    
    // Example registration (services should use @injectable decorator):
    // container.registerSingleton(SERVICE_TOKENS.AUTH_SERVICE, AuthService);
  }

  async initialize(container: DependencyContainer): Promise<void> {
    // Initialize auth-specific services if needed
  }
}

