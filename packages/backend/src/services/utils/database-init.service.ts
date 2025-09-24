/**
 * Database Initialization Service
 * 
 * Handles database connection, initialization, and optimization.
 */

import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { configService } from './config.service';
import { container, SERVICE_TOKENS } from './di-container.service';
import { monitoringService } from '../external/monitoring.service';
import { databaseOptimizationService } from '../external/database-optimization.service';
import { enhancedDatabaseService } from '../external/enhanced-database.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';

export class DatabaseInitService {
  /**
   * Initialize database connection and services
   */
  async initialize(): Promise<void> {
    logger.info('🗄️ Initializing enhanced database connection...');

    try {
      // Initialize enhanced database connection
      await enhancedDatabaseService.initializeConnection();

      // Initialize database services
      await this.initializeDatabaseServices();

      // Create advanced indexes
      await this.createAdvancedIndexes();

      // Warm up cache
      await this.warmupCache();

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
    logger.info('🔧 Initializing database services...');

    try {
      // Initialize database service
      const { databaseService } = await import('../external/database.service');
      await databaseService.createOptimizedIndexes();
      logger.info('✅ Database indexes optimized');

      // Test cache connection
      const { cacheService } = await import('../external/cache.service');
      const cacheHealth = await cacheService.healthCheck();
      if (cacheHealth.healthy) {
        logger.info('✅ Redis cache connected');
      } else {
        logger.warn('⚠️ Redis cache connection failed, continuing without cache');
      }

      // Record database metrics
      monitoringService.recordMetric({
        name: 'database_connection_status',
        value: 1,
        tags: { status: 'connected' }
      });

    } catch (error) {
      logger.error('❌ Database services initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create advanced database indexes
   */
  private async createAdvancedIndexes(): Promise<void> {
    logger.info('📊 Creating advanced database indexes...');

    try {
      // Use the database optimization service
      await databaseOptimizationService.createAdvancedIndexes();

      logger.info('✅ Advanced database indexes created successfully');

      // Record index creation metrics
      monitoringService.recordMetric({
        name: 'database_indexes_created',
        value: 1,
        tags: { status: 'success', type: 'advanced' }
      });

    } catch (error) {
      logger.error('❌ Advanced database index creation failed:', error);
      
      monitoringService.recordMetric({
        name: 'database_indexes_created',
        value: 0,
        tags: { status: 'failed', error: error.message, type: 'advanced' }
      });
      
      throw error;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  private async warmupCache(): Promise<void> {
    logger.info('🔥 Warming up enhanced cache...');

    try {
      await enhancedCacheService.warmupCache();
      
      logger.info('✅ Enhanced cache warmup completed');

      monitoringService.recordMetric({
        name: 'cache_warmup_completed',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('❌ Enhanced cache warmup failed:', error);
      
      monitoringService.recordMetric({
        name: 'cache_warmup_completed',
        value: 0,
        tags: { status: 'failed', error: error.message }
      });
    }
  }

  /**
   * Start domain cache polling
   */
  private startDomainCachePolling(): void {
    logger.info('🌐 Starting domain cache polling...');

    try {
      const { startDomainCachePolling } = require('../../cache/domainCache');
      startDomainCachePolling();
      logger.info('✅ Domain cache polling started');

      monitoringService.recordMetric({
        name: 'domain_cache_polling_started',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('❌ Domain cache polling failed:', error);
      
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
    logger.info('📡 Closing enhanced database connections...');

    try {
      await enhancedDatabaseService.closeConnection();
      logger.info('✅ Enhanced database connections closed');

    } catch (error) {
      logger.error('❌ Error closing enhanced database connections:', error);
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
