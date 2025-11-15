/**
 * Test Application Factory
 * 
 * Creates a test Express app with the same middleware and routes as production,
 * but with test-friendly configuration.
 */

import express, { Application } from 'express';
import { AppBootstrapService } from '../../../services/infrastructure/bootstrap/core/appBootstrap.service';
import { logger } from '../../../utils/logger';

/**
 * Creates a test Express application
 * 
 * This factory creates an app identical to production but configured for testing:
 * - Uses test database connections (via test utils)
 * - Mocks external services (S3, Stripe, etc.)
 * - Disables monitoring/metrics in test mode
 * - Uses test JWT secrets
 * 
 * @returns Promise<Application> Configured Express app for testing
 */
export async function createTestApp(): Promise<Application> {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Disable external integrations
  process.env.DISABLE_EXTERNAL_SERVICES = 'true';
  process.env.DISABLE_EMAIL_SENDING = 'true';
  process.env.DISABLE_SMS_SENDING = 'true';
  
  // Ensure JWT secret is set for testing
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-min-32-chars';
  }
  
  // Create app bootstrap service
  const appBootstrap = new AppBootstrapService();
  
  try {
    // Initialize the app (this sets up middleware, routes, etc.)
    const app = await appBootstrap.initialize();
    
    logger.info('✅ Test application created successfully');
    return app;
  } catch (error) {
    logger.error('❌ Failed to create test application:', error);
    throw error;
  }
}

/**
 * Creates a minimal test app with only essential middleware
 * Useful for isolated controller or route tests
 * 
 * @returns Express application with basic middleware
 */
export function createMinimalTestApp(): Application {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  return app;
}

