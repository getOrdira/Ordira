/**
 * Database Initialization Service
 * 
 * Handles database connection, initialization, and optimization.
 */

import mongoose from 'mongoose';
import { logger } from '../../logging';
import { configService } from '../../config/core/config.service';
import { container, SERVICE_TOKENS } from '../../dependency-injection';
import { monitoringService } from '../../observability';
import { 
  databaseOptimizationService, 
  enhancedDatabaseService 
} from '../../database';
import { 
  enhancedCacheService,
  cacheStoreService 
} from '../../cache';

export class DatabaseInitService {
  /**
   * Initialize database connection and services
   */
  async initialize(): Promise<void> {
    logger.info('Initializing enhanced database connection...');

    try {
      // Initialize enhanced database connection
      await enhancedDatabaseService.initializeConnection();

      // Initialize database services
      await this.initializeDatabaseServices();

      // Analyze index health
      await this.reportIndexHealth();

      if (process.env.ENABLE_CACHE_WARMUP === 'true') {
        await this.warmupCache();
      } else {
        logger.info('Skipping cache warmup (ENABLE_CACHE_WARMUP not enabled)');
      }

      // Start domain cache polling
      this.startDomainCachePolling();

      logger.info('✅ Enhanced database initialization completed');

    } catch (error) {
      logger.error('❌ Enhanced database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database-related services
   */
  private async initializeDatabaseServices(): Promise<void> {
    logger.info('🔄 Initializing database services...');

    try {
      // Test cache connection
      const cacheHealth = await cacheStoreService.healthCheck();
      if (cacheHealth.healthy) {
        logger.info('✅ Redis cache connected');
      } else {
        logger.warn('⚠️ Redis cache connection failed, continuing without cache');
      }

      // Record database metrics
      const databaseConfig = configService.getDatabase();
      if (databaseConfig?.mongodb?.analyticsUris?.length) {
        logger.info(`[db] Analytics read replicas configured: ${databaseConfig.mongodb.analyticsUris.join(', ')}`);
      }

      if (!databaseConfig?.mongodb?.tls) {
        logger.warn('[db] TLS client certificates not configured. Atlas clusters require TLS in production.');
      }

      if (databaseConfig?.mongodb?.backupsEnabled === false) {
        logger.warn('[db] MongoDB continuous backups are disabled.');
      }

      if (databaseConfig?.mongodb?.queryableEncryption) {
        logger.info('[db] Queryable encryption support enabled via local key material.');
      }

      monitoringService.recordMetric({
        name: 'database_connection_status',
        value: 1,
        tags: { status: 'connected' }
      });

    } catch (error) {
      logger.error('Database services initialization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze index coverage without mutating collections
   * This is a non-critical operation - failures should not block app startup
   */
  private async reportIndexHealth(): Promise<void> {
    logger.info('[db] Analyzing database index health...');

    try {
      await this.ensureModelRegistrations();

      // Check if database connection is ready
      if (!mongoose.connection.db) {
        logger.warn('Database connection not ready, skipping index report');
        return;
      }

      const report = await databaseOptimizationService.generateIndexReport();
      databaseOptimizationService.logIndexReport(report);

      const missingTotal = report.items.reduce((sum, item) => sum + item.missingIndexes.length, 0);

      monitoringService.recordMetric({
        name: 'database_indexes_missing',
        value: missingTotal,
        tags: { status: missingTotal === 0 ? 'healthy' : 'attention' }
      });

      if (missingTotal === 0) {
        logger.info('Index audit complete: all expected indexes are present.');
      } else {
        logger.warn(`Index audit detected ${missingTotal} missing indexes across collections.`);
      }
    } catch (error) {
      // Don't block app startup if index report fails - this is a non-critical operation
      logger.warn('Failed to generate database index report (non-critical, continuing startup):', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Index report generation is optional and will not prevent the application from starting'
      });

      monitoringService.recordMetric({
        name: 'database_indexes_missing',
        value: -1,
        tags: { status: 'unknown' }
      });

      // Don't throw - allow app to continue starting
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  private async warmupCache(): Promise<void> {
    logger.info('Warming up enhanced cache...');

    try {
      await enhancedCacheService.warmupCache();
      
      logger.info('Enhanced cache warmup completed');

      monitoringService.recordMetric({
        name: 'cache_warmup_completed',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('Enhanced cache warmup failed:', error);
      
      monitoringService.recordMetric({
        name: 'cache_warmup_completed',
        value: 0,
        tags: { status: 'failed', error: error.message }
      });
    }
  }

  private async ensureModelRegistrations(): Promise<void> {
    const registrations: Array<{
      token: symbol | string;
      resolver: () => Promise<Record<string, unknown>>;
      exportKey: string;
    }> = [
      { token: SERVICE_TOKENS.USER_MODEL, resolver: () => import('../../../../models/deprecated/user.model'), exportKey: 'User' },
      { token: SERVICE_TOKENS.BUSINESS_MODEL, resolver: () => import('../../../../models/deprecated/business.model'), exportKey: 'Business' },
      { token: SERVICE_TOKENS.MANUFACTURER_MODEL, resolver: () => import('../../../../models/manufacturer/manufacturer.model'), exportKey: 'Manufacturer' },
      { token: SERVICE_TOKENS.PRODUCT_MODEL, resolver: () => import('../../../../models/products/product.model'), exportKey: 'Product' },
      { token: SERVICE_TOKENS.VOTING_RECORD_MODEL, resolver: () => import('../../../../models/voting/votingRecord.model'), exportKey: 'VotingRecord' },
      { token: SERVICE_TOKENS.BRAND_SETTINGS_MODEL, resolver: () => import('../../../../models/brands/brandSettings.model'), exportKey: 'BrandSettings' },
      { token: SERVICE_TOKENS.CERTIFICATE_MODEL, resolver: () => import('../../../../models/certificates/certificate.model'), exportKey: 'Certificate' },
      { token: SERVICE_TOKENS.MEDIA_MODEL, resolver: () => import('../../../../models/media/media.model'), exportKey: 'Media' }
    ];

    for (const { token, resolver, exportKey } of registrations) {
      if (container.isRegistered(token)) {
        continue;
      }

      const moduleRef = await resolver();
      const model = moduleRef[exportKey];

      if (!model) {
        logger.warn(`Missing model export '${exportKey}' while registering ${String(token)}`);
        continue;
      }

      container.registerInstance(token, model);
      logger.debug(`Registered ${exportKey} for token ${String(token)}`);
    }
  }

  /**
   * Start domain cache polling
   */
  private startDomainCachePolling(): void {
    logger.info('Starting domain cache polling...');

    try {
      const { startDomainCachePolling } = require('../../../../cache/domainCache');
      startDomainCachePolling();
      logger.info('Domain cache polling started');

      monitoringService.recordMetric({
        name: 'domain_cache_polling_started',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('Domain cache polling failed:', error);
      
      monitoringService.recordMetric({
        name: 'domain_cache_polling_started',
        value: 0,
        tags: { status: 'failed', error: error.message }
      });
    }
  }

  /**
   * Gracefully close database connections
   */
  async close(): Promise<void> {
    logger.info('Closing enhanced database connections...');

    try {
      await enhancedDatabaseService.closeConnection();
      logger.info('Enhanced database connections closed');

    } catch (error) {
      logger.error('Error closing enhanced database connections:', error);
      throw error;
    }
  }

  /**
   * Get database health status
   */
  getHealthStatus(): { status: string; details: any } {
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: states[connectionState as keyof typeof states] || 'unknown',
      details: {
        readyState: connectionState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      }
    };
  }
}



