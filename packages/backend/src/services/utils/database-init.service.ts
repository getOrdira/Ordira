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

export class DatabaseInitService {
  /**
   * Initialize database connection and services
   */
  async initialize(): Promise<void> {
    logger.info('🗄️ Initializing database connection...');

    try {
      // Configure Mongoose settings
      mongoose.set('strictQuery', false); // Suppress deprecation warning
      
      // Get database configuration
      const dbConfig = configService.getDatabase();
      
      // Connect to MongoDB
      await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
      logger.info('✅ Connected to MongoDB with optimized configuration');

      // Initialize database services
      await this.initializeDatabaseServices();

      // Create optimized indexes
      await this.createOptimizedIndexes();

      // Start domain cache polling
      this.startDomainCachePolling();

      logger.info('✅ Database initialization completed');

    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
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
   * Create optimized database indexes
   */
  private async createOptimizedIndexes(): Promise<void> {
    logger.info('📊 Creating optimized database indexes...');

    try {
      // Get models from container
      const User = container.resolve(SERVICE_TOKENS.USER_MODEL) as typeof import('../../models/user.model').User;
      const Business = container.resolve(SERVICE_TOKENS.BUSINESS_MODEL) as typeof import('../../models/business.model').Business;
      const Manufacturer = container.resolve(SERVICE_TOKENS.MANUFACTURER_MODEL) as typeof import('../../models/manufacturer.model').Manufacturer;
      const BrandSettings = container.resolve(SERVICE_TOKENS.BRAND_SETTINGS_MODEL) as typeof import('../../models/brandSettings.model').BrandSettings;
      const VotingRecord = container.resolve(SERVICE_TOKENS.VOTING_RECORD_MODEL) as typeof import('../../models/votingRecord.model').VotingRecord;
      const Certificate = container.resolve(SERVICE_TOKENS.CERTIFICATE_MODEL) as typeof import('../../models/certificate.model').Certificate;

      // Create indexes for User model
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ businessId: 1 });
      await User.collection.createIndex({ createdAt: -1 });
      await User.collection.createIndex({ isActive: 1, createdAt: -1 });

      // Create indexes for Business model
      await Business.collection.createIndex({ subdomain: 1 }, { unique: true, sparse: true });
      await Business.collection.createIndex({ customDomain: 1 }, { unique: true, sparse: true });
      await Business.collection.createIndex({ businessId: 1 }, { unique: true });
      await Business.collection.createIndex({ isActive: 1, isEmailVerified: 1 });
      await Business.collection.createIndex({ businessType: 1, isEmailVerified: 1 });
      await Business.collection.createIndex({ industry: 1, isEmailVerified: 1 });
      await Business.collection.createIndex({ createdAt: -1 });

      // Create indexes for Manufacturer model
      await Manufacturer.collection.createIndex({ email: 1 }, { unique: true });
      await Manufacturer.collection.createIndex({ businessId: 1 });
      await Manufacturer.collection.createIndex({ isActive: 1, lastLoginAt: -1 });
      await Manufacturer.collection.createIndex({ isActive: 1, isEmailVerified: 1, profileScore: -1 });
      await Manufacturer.collection.createIndex({ industry: 1, isActive: 1, profileScore: -1 });
      await Manufacturer.collection.createIndex({ location: 1, isActive: 1 });
      await Manufacturer.collection.createIndex({ createdAt: -1 });

      // Create indexes for BrandSettings model
      await BrandSettings.collection.createIndex({ businessId: 1 }, { unique: true });
      await BrandSettings.collection.createIndex({ createdAt: -1 });

      // Create indexes for VotingRecord model
      await VotingRecord.collection.createIndex({ businessId: 1, productId: 1 });
      await VotingRecord.collection.createIndex({ userId: 1, businessId: 1 });
      await VotingRecord.collection.createIndex({ createdAt: -1 });

      // Create indexes for Certificate model
      await Certificate.collection.createIndex({ businessId: 1 });
      await Certificate.collection.createIndex({ tokenId: 1 }, { unique: true, sparse: true });
      await Certificate.collection.createIndex({ createdAt: -1 });

      logger.info('✅ Database indexes created successfully');

      // Record index creation metrics
      monitoringService.recordMetric({
        name: 'database_indexes_created',
        value: 1,
        tags: { status: 'success' }
      });

    } catch (error) {
      logger.error('❌ Database index creation failed:', error);
      
      monitoringService.recordMetric({
        name: 'database_indexes_created',
        value: 0,
        tags: { status: 'failed', error: error.message }
      });
      
      throw error;
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
    logger.info('📡 Closing database connections...');

    try {
      await mongoose.connection.close();
      logger.info('✅ MongoDB connection closed');

      monitoringService.recordMetric({
        name: 'database_connection_status',
        value: 0,
        tags: { status: 'disconnected' }
      });

    } catch (error) {
      logger.error('❌ Error closing MongoDB connection:', error);
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
