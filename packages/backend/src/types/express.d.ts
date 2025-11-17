/**
 * Express type declarations
 * Ensures Express Request types are properly available for TypeScript compilation
 * This file ensures that Request types from @types/express are properly resolved
 * 
 * Note: Express Request already has these properties, but this ensures they're
 * available during TypeScript compilation on all environments (including Render)
 */

/// <reference types="express" />

// Import Express types to ensure they're loaded (type-only import doesn't affect runtime)
import type * as Express from 'express';

// Augment express-serve-static-core to ensure all Request properties are available
// This augmentation ensures TypeScript recognizes all Express Request properties
declare module 'express-serve-static-core' {
  interface Request {
    // Explicitly declare properties that should exist on Express Request
    // This ensures TypeScript recognizes them during compilation on all environments
    ip?: string;
    headers: import('http').IncomingHttpHeaders;
    body: any;
    query: any;
    params: any;
    path: string;
    hostname: string;
    method: string;
    url: string;
  }
}

