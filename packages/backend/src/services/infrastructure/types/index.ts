/**
 * Types Infrastructure Module
 *
 * Central export point for all type checking and validation infrastructure services
 *
 * Organized into:
 * - Core: Basic type guards, validators, and safe conversion utilities
 * - Features: Request type guards, domain-specific type guards
 * - Utils: Type definitions, file types, and utility types
 */

// Core type services
export * from './core';

// Features
export * from './features';

// Utilities
export * from './utils';

// Type declarations (global augmentations and exported types)
export * from './declarations';

