/**
 * Dependency Injection Infrastructure Module
 *
 * Central export point for all dependency injection services
 *
 * Organized into:
 * - Core: Tsyringe container and service tokens
 * - Modules: Module-based service registration
 * - Decorators: Injectable, Inject decorators (tsyringe built-in)
 */

// Import reflect-metadata for decorator support
import 'reflect-metadata';

// Core DI services (tsyringe-based)
export * from './core';

// Service modules and registry
export * from './modules';

// Re-export tsyringe decorators for convenience
export { injectable, inject, singleton, container } from 'tsyringe';
export type { DependencyContainer } from 'tsyringe';

