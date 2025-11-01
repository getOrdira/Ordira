/**
 * Backend Middleware - Modular Organization
 * 
 * Organized by responsibility:
 * - core: Application-level middleware
 * - auth: Authentication & authorization
 * - limits: Rate limiting and plan limits
 * - performance: Performance optimization and metrics
 * - tenant: Multi-tenancy and tenant resolution
 * - upload: File uploads and processing
 * - validation: Request validation and security checks
 * - security: CORS, webhooks, and audit logging
 */

// Re-export all middleware organized by category
export * from './core';
export * from './auth';
export * from './limits';
export * from './performance';
export * from './tenant';
export * from './upload';
export * from './validation';
export * from './security';

