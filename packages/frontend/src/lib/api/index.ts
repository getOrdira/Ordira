// src/lib/api/index.ts
// Main API barrel export

/**
 * Frontend API Modules
 * 
 * Modular API architecture aligned with backend routes structure.
 * 
 * Structure:
 * - core/: Core API modules (auth, health, base)
 * - features/: Feature-specific API modules (brands, products, etc.)
 * - integrations/: Integration-specific API modules (ecommerce, blockchain, etc.)
 */

// Core API modules
export * from './core';

// Features API modules
export * from './features';

// Integrations API modules
export * from './integrations';

// Client exports
export { api, manufacturerApi, publicApi, default as apiClient } from './client';
export type { default as ApiClient } from './client';


