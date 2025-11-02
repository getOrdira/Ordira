/**
 * Configuration Infrastructure Module
 *
 * Central export point for all configuration management services
 *
 * Organized into:
 * - Core: Configuration service and environment validation
 * - Features: Extended configuration features (auth, captcha, logging, redis)
 * - Validation: Configuration validation utilities (environment, secrets)
 */

// Core configuration services
export * from './core';

// Feature-specific configuration
export * from './features';

// Configuration validation
export * from './validation';

