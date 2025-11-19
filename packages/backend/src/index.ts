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
import { getMonitoringService } from './services/container/container.getters';

// Check NODE_OPTIONS and actual heap limit at startup
const nodeOptions = process.env.NODE_OPTIONS || '';
const maxOldSpaceSize = nodeOptions.match(/--max-old-space-size=(\d+)/);
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();
const actualHeapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);

if (!maxOldSpaceSize) {
  logger.warn('⚠️ NODE_OPTIONS not set with --max-old-space-size. Heap size may be too small for production.', {
    hint: 'Set NODE_OPTIONS=--max-old-space-size=1536 in Render environment variables for Standard plan (2GB RAM)',
    actualHeapLimitMB,
    note: actualHeapLimitMB < 200 ? 'Heap limit is very small - NODE_OPTIONS is not being applied' : 'Heap limit is default size'
  });
} else {
  const configuredHeapSizeMB = parseInt(maxOldSpaceSize[1], 10);
  if (actualHeapLimitMB < configuredHeapSizeMB * 0.8) {
    // Actual heap is significantly less than configured (allowing 20% tolerance)
    logger.warn('⚠️ NODE_OPTIONS detected but heap limit is smaller than expected:', {
      configuredHeapSizeMB,
      actualHeapLimitMB,
      difference: `${configuredHeapSizeMB - actualHeapLimitMB}MB`,
      hint: 'NODE_OPTIONS may not be applied correctly. Ensure it is set in Render environment variables before deployment.',
      note: 'Node.js heap limit is determined at process start - NODE_OPTIONS must be set before Node.js launches'
    });
  } else {
    logger.info('✅ NODE_OPTIONS configured correctly:', {
      configuredHeapSizeMB,
      actualHeapLimitMB,
      note: actualHeapLimitMB < 500 ? 'Heap size may be too small for production workloads' : 'Heap size configured correctly'
    });
  }
}


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
    getMonitoringService().recordMetric({
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
    getMonitoringService().recordMetric({
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
