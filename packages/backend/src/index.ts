/**
 * Refactored Main Application Entry Point
 * 
 * This file has been refactored to reduce complexity by breaking down
 * the initialization process into smaller, focused services.
 */

// Load environment variables early
import 'dotenv/config';

// Import reflect-metadata for dependency injection decorators
import 'reflect-metadata';

// Import services
import { AppBootstrapService, DatabaseInitService, ServerStartupService } from './services/infrastructure/bootstrap';
import { logger } from './services/infrastructure/logging'; 
import { monitoringService } from './services/external/monitoring.service';
import { securityScanService } from './services/external/security-scan.service';

/**
 * Main application initialization function
 */
async function initializeApplication(): Promise<void> {
  try {
    logger.info('🚀 Starting Ordira Platform...');

    // Initialize database
    const databaseInit = new DatabaseInitService();
    await databaseInit.initialize();

    // Initialize Express application
    const appBootstrap = new AppBootstrapService();
    const app = await appBootstrap.initialize();

    // Start HTTP server
    const serverStartup = new ServerStartupService();
    const port = Number(process.env.PORT) || 4000;
    await serverStartup.start(app, port);

    // Record successful startup
    monitoringService.recordMetric({
      name: 'application_startup',
      value: 1,
      tags: { 
        status: 'success',
        port: port.toString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });

    logger.info('✅ Ordira Platform started successfully');

  } catch (error) {
    logger.error('❌ Failed to start Ordira Platform:', error);
    
    // Record startup failure
    monitoringService.recordMetric({
      name: 'application_startup',
      value: 0,
      tags: { 
        status: 'failed',
        error: error.message,
        environment: process.env.NODE_ENV || 'development'
      }
    });
    
    process.exit(1);
  }
}

// Start the application
initializeApplication();
