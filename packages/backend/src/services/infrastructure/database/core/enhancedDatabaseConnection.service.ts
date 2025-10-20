/**
 * Enhanced Database Service
 * 
 * Provides optimized MongoDB connection configuration, connection pooling,
 * and database performance monitoring.
 */

import mongoose, { ConnectOptions } from 'mongoose';
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../../external/monitoring.service';

export interface DatabaseConfig {
  uri: string;
  options: ConnectOptions;
}

export interface DatabaseStats {
  connections: {
    current: number;
    available: number;
    totalCreated: number;
  };
  operations: {
    totalReads: number;
    totalWrites: number;
    totalCommands: number;
  };
  performance: {
    averageResponseTime: number;
    slowOperations: number;
    indexHits: number;
    indexMisses: number;
  };
}

export class EnhancedDatabaseService {
  private connectionStats: DatabaseStats = {
    connections: {
      current: 0,
      available: 0,
      totalCreated: 0
    },
    operations: {
      totalReads: 0,
      totalWrites: 0,
      totalCommands: 0
    },
    performance: {
      averageResponseTime: 0,
      slowOperations: 0,
      indexHits: 0,
      indexMisses: 0
    }
  };

  /**
   * Get optimized database configuration
   */
  getOptimizedConfig(): DatabaseConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    return {
      uri: process.env.MONGODB_URI!,
      options: {
        // Enhanced Connection Pool Configuration
        maxPoolSize: isProduction ? 50 : 15, // Increased maximum connections for high concurrency
        minPoolSize: isProduction ? 10 : 3,  // Increased minimum connections for availability
        maxIdleTimeMS: 30000,                // Close connections after 30s of inactivity
        maxConnecting: isProduction ? 5 : 3, // Maximum simultaneous connection attempts

        // Optimized Timeout Configuration
        serverSelectionTimeoutMS: 5000,      // 5 second server selection timeout
        socketTimeoutMS: 45000,              // 45 second socket timeout
        connectTimeoutMS: 10000,             // 10 second connection timeout
        heartbeatFrequencyMS: 10000,         // Heart beat frequency

        // Buffer Configuration for High Performance
        bufferCommands: false,               // Disable command buffering

        // Enhanced Retry Configuration
        retryWrites: true,                   // Retry write operations
        retryReads: true,                    // Retry read operations
        maxStalenessSeconds: 90,             // Max staleness for secondary reads

        // Optimized Read/Write Configuration
        readPreference: isProduction ? 'secondaryPreferred' : 'primary',
        readConcern: { level: isProduction ? 'majority' : 'local' },
        writeConcern: {
          w: isProduction ? 'majority' : 1,
          j: true,                           // Acknowledge writes to journal
          wtimeout: 5000                     // 5 second write concern timeout
        },

        // Additional Performance Options
        compressors: isProduction ? ['snappy', 'zlib'] : [], // Enable compression in production
        zlibCompressionLevel: 6,             // Compression level
        appName: 'OrderPlatform',            // App name for monitoring

        // Connection monitoring
        monitorCommands: process.env.NODE_ENV === 'development'
      }
    };
  }

  /**
   * Initialize optimized database connection
   */
  async initializeConnection(): Promise<void> {
    logger.info('🔧 Initializing enhanced database connection...');

    try {
      const config = this.getOptimizedConfig();
      
      // Configure Mongoose settings
      this.configureMongoose();
      
      // Connect with optimized configuration
      await mongoose.connect(config.uri, config.options);
      
      // Set up connection event listeners
      this.setupConnectionListeners();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      logger.info('✅ Enhanced database connection initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize enhanced database connection:', error);
      throw error;
    }
  }

  /**
   * Configure Mongoose for optimal performance
   */
  private configureMongoose(): void {
    // Disable strict query mode for better compatibility
    mongoose.set('strictQuery', false);
    
    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
        logger.debug(`MongoDB Query: ${collectionName}.${method}`, {
          query: JSON.stringify(query),
          doc: doc ? JSON.stringify(doc) : undefined
        });
      });
    }

    // Set up query middleware for performance tracking
    mongoose.plugin((schema: any) => {
      schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], function() {
        const startTime = Date.now();
        this.startTime = startTime;
      });

      schema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], function() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        // Track slow operations
        if (duration > 100) { // Operations taking more than 100ms
          logger.warn(`Slow MongoDB operation detected: ${duration}ms`, {
            operation: this.op,
            collection: this.collection.name,
            duration
          });
          
          monitoringService.recordMetric({
            name: 'mongodb_slow_operation',
            value: duration,
            tags: {
              collection: this.collection.name,
              operation: this.op
            }
          });
        }

        // Record performance metrics
        monitoringService.recordMetric({
          name: 'mongodb_operation_duration',
          value: duration,
          tags: {
            collection: this.collection.name,
            operation: this.op
          }
        });
      });
    });
  }

  /**
   * Set up connection event listeners
   */
  private setupConnectionListeners(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      logger.info('✅ MongoDB connected successfully');
      this.updateConnectionStats();
      
      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 1,
        tags: { status: 'connected' }
      });
    });

    connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
      this.updateConnectionStats();
      
      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 0,
        tags: { status: 'disconnected' }
      });
    });

    connection.on('error', (error) => {
      logger.error('❌ MongoDB connection error:', error);
      
      monitoringService.recordMetric({
        name: 'mongodb_connection_error',
        value: 1,
        tags: { 
          error: error.name || 'Unknown',
          message: error.message || 'Unknown error'
        }
      });
    });

    connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected');
      this.updateConnectionStats();
      
      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 1,
        tags: { status: 'reconnected' }
      });
    });

    // Monitor connection pool
    setInterval(() => {
      this.updateConnectionStats();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor database performance every minute
    setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
      } catch (error) {
        logger.error('❌ Failed to collect performance metrics:', error);
      }
    }, 60000); // Every minute

    // Monitor index usage every 5 minutes
    setInterval(async () => {
      try {
        await this.analyzeIndexUsage();
      } catch (error) {
        logger.error('❌ Failed to analyze index usage:', error);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Collect database performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      // Update connection stats
      this.connectionStats.connections = {
        current: mongoose.connections.length,
        available: stats.connections?.current || 0,
        totalCreated: stats.connections?.totalCreated || 0
      };

      // Record metrics
      monitoringService.recordMetric({
        name: 'mongodb_connections_current',
        value: this.connectionStats.connections.current,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'mongodb_collections_count',
        value: stats.collections || 0,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'mongodb_data_size',
        value: stats.dataSize || 0,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'mongodb_index_size',
        value: stats.indexSize || 0,
        tags: {}
      });

    } catch (error) {
      logger.error('❌ Failed to collect performance metrics:', error);
    }
  }

  /**
   * Analyze index usage and suggest optimizations
   */
  private async analyzeIndexUsage(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      
      // Get index usage statistics
      const collections = await db.listCollections().toArray();
      let unusedIndexes = 0;
      let totalIndexes = 0;
      
      for (const collection of collections) {
        try {
          const indexes = await db.collection(collection.name).listIndexes().toArray();
          totalIndexes += indexes.length;
          
          // Note: indexStats command requires MongoDB 3.2+ and proper permissions
          // For now, we'll just count indexes
        } catch (error) {
          logger.warn(`Could not analyze indexes for collection ${collection.name}:`, error);
        }
      }

      // Record index usage metrics
      monitoringService.recordMetric({
        name: 'mongodb_indexes_total',
        value: totalIndexes,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'mongodb_indexes_unused',
        value: unusedIndexes,
        tags: {}
      });

      if (unusedIndexes > 0) {
        logger.info(`📊 Index Analysis: ${unusedIndexes}/${totalIndexes} indexes are unused`);
      }

    } catch (error) {
      logger.error('❌ Failed to analyze index usage:', error);
    }
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(): void {
    this.connectionStats.connections.current = mongoose.connections.length;
    
    monitoringService.recordMetric({
      name: 'mongodb_connections_active',
      value: this.connectionStats.connections.current,
      tags: {}
    });
  }

  /**
   * Get current database statistics
   */
  getDatabaseStats(): DatabaseStats {
    return { ...this.connectionStats };
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const connectionState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      const status = states[connectionState as keyof typeof states] || 'unknown';

      if (connectionState === 1) {
        // Test with a simple operation
        await mongoose.connection.db.admin().ping();
        
        return {
          status: 'healthy',
          details: {
            readyState: connectionState,
            status,
            connections: this.connectionStats.connections,
            uptime: process.uptime()
          }
        };
      } else {
        return {
          status: 'unhealthy',
          details: {
            readyState: connectionState,
            status,
            error: 'Database not connected'
          }
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          readyState: mongoose.connection.readyState
        }
      };
    }
  }

  /**
   * Gracefully close database connections
   */
  async closeConnection(): Promise<void> {
    logger.info('📡 Closing enhanced database connections...');

    try {
      await mongoose.connection.close();
      logger.info('✅ Enhanced database connections closed');

      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 0,
        tags: { status: 'closed' }
      });

    } catch (error) {
      logger.error('❌ Error closing enhanced database connections:', error);
      throw error;
    }
  }

  /**
   * Execute comprehensive database maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    logger.info('🔧 Starting comprehensive database maintenance...');

    try {
      const db = mongoose.connection.db;
      const adminDb = db.admin();
      
      // Get database statistics before maintenance
      const statsBefore = await db.stats();
      logger.info('📊 Database stats before maintenance:', {
        dataSize: `${Math.round(statsBefore.dataSize / 1024 / 1024)}MB`,
        indexSize: `${Math.round(statsBefore.indexSize / 1024 / 1024)}MB`,
        collections: statsBefore.collections,
        indexes: statsBefore.indexes
      });

      const maintenanceResults = {
        collectionsAnalyzed: 0,
        indexesOptimized: 0,
        indexesDropped: 0,
        dataCleaned: 0,
        statsUpdated: 0,
        errors: 0
      };

      // Get all collections
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          maintenanceResults.collectionsAnalyzed++;
          
          // Skip system collections
          if (collection.name.startsWith('system.')) {
            continue;
          }

          logger.info(`🔍 Analyzing collection: ${collection.name}`);
          
          // Analyze collection
          const collectionStats = await db.collection(collection.name).stats();
          
          // 1. Index Analysis and Optimization
          await this.optimizeCollectionIndexes(db, collection.name, maintenanceResults);
          
          // 2. Data Cleanup Operations
          await this.performDataCleanup(db, collection.name, maintenanceResults);
          
          // 3. Collection Statistics Update
          await this.updateCollectionStatistics(db, collection.name, maintenanceResults);
          
          // 4. Collection Validation (if needed)
          await this.validateCollectionIntegrity(db, collection.name);
          
          logger.debug(`✅ Maintenance completed for collection: ${collection.name}`);

        } catch (error) {
          maintenanceResults.errors++;
          logger.warn(`❌ Maintenance failed for collection ${collection.name}:`, error);
        }
      }

      // 5. Database-wide operations
      await this.performDatabaseWideOperations(db, adminDb, maintenanceResults);

      // Get final statistics
      const statsAfter = await db.stats();
      
      logger.info('✅ Database maintenance completed successfully', {
        ...maintenanceResults,
        spaceSaved: {
          dataSize: `${Math.round((statsBefore.dataSize - statsAfter.dataSize) / 1024 / 1024)}MB`,
          indexSize: `${Math.round((statsBefore.indexSize - statsAfter.indexSize) / 1024 / 1024)}MB`
        },
        finalStats: {
          dataSize: `${Math.round(statsAfter.dataSize / 1024 / 1024)}MB`,
          indexSize: `${Math.round(statsAfter.indexSize / 1024 / 1024)}MB`,
          collections: statsAfter.collections,
          indexes: statsAfter.indexes
        }
      });

      // Record maintenance metrics
      monitoringService.recordMetric({
        name: 'database_maintenance_collections_analyzed',
        value: maintenanceResults.collectionsAnalyzed,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'database_maintenance_indexes_optimized',
        value: maintenanceResults.indexesOptimized,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'database_maintenance_errors',
        value: maintenanceResults.errors,
        tags: {}
      });

    } catch (error) {
      logger.error('❌ Database maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Optimize collection indexes
   */
  private async optimizeCollectionIndexes(db: any, collectionName: string, results: any): Promise<void> {
    try {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      
      // Analyze each index
      for (const index of indexes) {
        // Skip _id index
        if (index.name === '_id_') continue;
        
        try {
          // Get index usage statistics
          const indexStats = await collection.aggregate([
            { $indexStats: {} },
            { $match: { name: index.name } }
          ]).toArray();
          
          if (indexStats.length > 0) {
            const usage = indexStats[0];
            
            // Drop unused indexes (no access for 30+ days)
            if (usage.accesses && usage.accesses.ops === 0) {
              const lastUsed = new Date(usage.accesses.last);
              const daysSinceUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
              
              if (daysSinceUsed > 30) {
                await collection.dropIndex(index.name);
                results.indexesDropped++;
                logger.info(`🗑️ Dropped unused index: ${collectionName}.${index.name}`);
              }
            }
            
            // Check for duplicate indexes
            if (await this.isDuplicateIndex(collection, index)) {
              await collection.dropIndex(index.name);
              results.indexesDropped++;
              logger.info(`🗑️ Dropped duplicate index: ${collectionName}.${index.name}`);
            }
          }
          
          results.indexesOptimized++;
          
        } catch (indexError) {
          logger.warn(`Index optimization failed for ${collectionName}.${index.name}:`, indexError);
        }
      }
      
    } catch (error) {
      logger.warn(`Index optimization failed for collection ${collectionName}:`, error);
    }
  }

  /**
   * Check if index is duplicate
   */
  private async isDuplicateIndex(collection: any, currentIndex: any): Promise<boolean> {
    try {
      const allIndexes = await collection.indexes();
      
      for (const otherIndex of allIndexes) {
        if (otherIndex.name === currentIndex.name) continue;
        
        // Compare index keys
        if (JSON.stringify(otherIndex.key) === JSON.stringify(currentIndex.key)) {
          // If they have the same keys, keep the one with more options
          const currentOptions = Object.keys(currentIndex).length;
          const otherOptions = Object.keys(otherIndex).length;
          
          return currentOptions < otherOptions;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform data cleanup operations
   */
  private async performDataCleanup(db: any, collectionName: string, results: any): Promise<void> {
    try {
      const collection = db.collection(collectionName);
      
      // Clean up old session data
      if (collectionName === 'sessions' || collectionName === 'activesessions') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const deletedSessions = await collection.deleteMany({
          expiresAt: { $lt: thirtyDaysAgo }
        });
        results.dataCleaned += deletedSessions.deletedCount;
        
        if (deletedSessions.deletedCount > 0) {
          logger.info(`🧹 Cleaned ${deletedSessions.deletedCount} expired sessions from ${collectionName}`);
        }
      }
      
      // Clean up old logs
      if (collectionName.includes('log') || collectionName.includes('audit')) {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const deletedLogs = await collection.deleteMany({
          createdAt: { $lt: ninetyDaysAgo }
        });
        results.dataCleaned += deletedLogs.deletedCount;
        
        if (deletedLogs.deletedCount > 0) {
          logger.info(`🧹 Cleaned ${deletedLogs.deletedCount} old log entries from ${collectionName}`);
        }
      }
      
      // Clean up old temporary data
      if (collectionName === 'tempdata' || collectionName === 'cache') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const deletedTemp = await collection.deleteMany({
          createdAt: { $lt: sevenDaysAgo }
        });
        results.dataCleaned += deletedTemp.deletedCount;
        
        if (deletedTemp.deletedCount > 0) {
          logger.info(`🧹 Cleaned ${deletedTemp.deletedCount} temporary records from ${collectionName}`);
        }
      }
      
      // Clean up orphaned records
      await this.cleanupOrphanedRecords(db, collectionName, results);
      
    } catch (error) {
      logger.warn(`Data cleanup failed for collection ${collectionName}:`, error);
    }
  }

  /**
   * Clean up orphaned records
   */
  private async cleanupOrphanedRecords(db: any, collectionName: string, results: any): Promise<void> {
    try {
      const collection = db.collection(collectionName);
      
      // Clean up orphaned voting records
      if (collectionName === 'votingrecords') {
        const businessCollection = db.collection('businesses');
        const existingBusinesses = await businessCollection.distinct('_id');
        
        const deletedOrphanedVotes = await collection.deleteMany({
          business: { $nin: existingBusinesses }
        });
        results.dataCleaned += deletedOrphanedVotes.deletedCount;
        
        if (deletedOrphanedVotes.deletedCount > 0) {
          logger.info(`🧹 Cleaned ${deletedOrphanedVotes.deletedCount} orphaned voting records`);
        }
      }
      
      // Clean up orphaned products
      if (collectionName === 'products') {
        const businessCollection = db.collection('businesses');
        const manufacturerCollection = db.collection('manufacturers');
        
        const existingBusinesses = await businessCollection.distinct('_id');
        const existingManufacturers = await manufacturerCollection.distinct('_id');
        
        const deletedOrphanedProducts = await collection.deleteMany({
          $and: [
            { business: { $nin: existingBusinesses } },
            { manufacturer: { $nin: existingManufacturers } }
          ]
        });
        results.dataCleaned += deletedOrphanedProducts.deletedCount;
        
        if (deletedOrphanedProducts.deletedCount > 0) {
          logger.info(`🧹 Cleaned ${deletedOrphanedProducts.deletedCount} orphaned products`);
        }
      }
      
    } catch (error) {
      logger.warn(`Orphaned records cleanup failed for collection ${collectionName}:`, error);
    }
  }

  /**
   * Update collection statistics
   */
  private async updateCollectionStatistics(db: any, collectionName: string, results: any): Promise<void> {
    try {
      const collection = db.collection(collectionName);
      
      // Update collection statistics
      await collection.stats();
      results.statsUpdated++;
      
      // Force index rebuild for critical collections
      const criticalCollections = ['businesses', 'users', 'products', 'votingrecords'];
      if (criticalCollections.includes(collectionName)) {
        const indexes = await collection.indexes();
        for (const index of indexes) {
          if (index.name !== '_id_') {
            try {
              // Rebuild index to update statistics
              await collection.reIndex();
              logger.debug(`📊 Updated statistics for index: ${collectionName}.${index.name}`);
            } catch (reindexError) {
              logger.warn(`Failed to reindex ${collectionName}.${index.name}:`, reindexError);
            }
          }
        }
      }
      
    } catch (error) {
      logger.warn(`Statistics update failed for collection ${collectionName}:`, error);
    }
  }

  /**
   * Validate collection integrity
   */
  private async validateCollectionIntegrity(db: any, collectionName: string): Promise<void> {
    try {
      const collection = db.collection(collectionName);
      
      // Only validate critical collections to avoid performance impact
      const criticalCollections = ['businesses', 'users', 'products'];
      if (!criticalCollections.includes(collectionName)) {
        return;
      }
      
      // Validate collection (this is expensive, so we do it selectively)
      const validationResult = await collection.validate();
      
      if (!validationResult.valid) {
        logger.warn(`⚠️ Collection integrity issues found in ${collectionName}:`, validationResult);
        
        // Record validation issues
        monitoringService.recordMetric({
          name: 'database_collection_validation_failed',
          value: 1,
          tags: { collection: collectionName }
        });
      }
      
    } catch (error) {
      logger.warn(`Collection validation failed for ${collectionName}:`, error);
    }
  }

  /**
   * Perform database-wide operations
   */
  private async performDatabaseWideOperations(db: any, adminDb: any, results: any): Promise<void> {
    try {
      // 1. Compact database (if supported and needed)
      const stats = await db.stats();
      const fragmentationThreshold = 0.8; // 80% fragmentation threshold
      
      if (stats.storageSize > 0 && (stats.dataSize / stats.storageSize) < fragmentationThreshold) {
        try {
          await adminDb.command({ compact: db.databaseName });
          logger.info('🗜️ Database compaction completed');
        } catch (compactError) {
          logger.warn('Database compaction failed (may not be supported):', compactError);
        }
      }
      
      // 2. Update database statistics
      await db.runCommand({ dbStats: 1 });
      results.statsUpdated++;
      
      // 3. Clean up old oplog entries (if replica set)
      try {
        const replSetStatus = await adminDb.command({ replSetGetStatus: 1 });
        if (replSetStatus.ok === 1) {
          logger.info('🔄 Replica set detected - oplog maintenance handled by MongoDB');
        }
      } catch (replicaError) {
        // Not a replica set, ignore
      }
      
      // 4. Optimize query plan cache
      try {
        await adminDb.command({ planCacheClear: db.databaseName });
        logger.info('🧠 Query plan cache cleared');
      } catch (planCacheError) {
        logger.warn('Query plan cache clear failed:', planCacheError);
      }
      
    } catch (error) {
      logger.warn('Database-wide operations failed:', error);
    }
  }

  /**
   * Schedule maintenance tasks
   */
  async scheduleMaintenance(options: {
    interval?: 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    enabled?: boolean;
  } = {}): Promise<void> {
    const { interval = 'weekly', time = '02:00', enabled = true } = options;
    
    if (!enabled) {
      logger.info('Database maintenance scheduling disabled');
      return;
    }

    // Calculate next maintenance time
    const scheduleMaintenance = () => {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      
      let nextMaintenance = new Date(now);
      nextMaintenance.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for next interval
      if (nextMaintenance <= now) {
        switch (interval) {
          case 'daily':
            nextMaintenance.setDate(nextMaintenance.getDate() + 1);
            break;
          case 'weekly':
            nextMaintenance.setDate(nextMaintenance.getDate() + 7);
            break;
          case 'monthly':
            nextMaintenance.setMonth(nextMaintenance.getMonth() + 1);
            break;
        }
      }
      
      const timeUntilMaintenance = nextMaintenance.getTime() - now.getTime();
      
      logger.info(`📅 Next database maintenance scheduled for ${nextMaintenance.toISOString()} (${interval})`);
      
      setTimeout(async () => {
        try {
          await this.performMaintenance();
          
          // Schedule next maintenance
          scheduleMaintenance();
        } catch (error) {
          logger.error('Scheduled maintenance failed:', error);
          
          // Schedule retry in 1 hour
          setTimeout(() => {
            scheduleMaintenance();
          }, 60 * 60 * 1000);
        }
      }, timeUntilMaintenance);
    };

    // Start scheduling
    scheduleMaintenance();
  }

  /**
   * Get maintenance recommendations
   */
  async getMaintenanceRecommendations(): Promise<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    estimatedSpaceSavings: string;
  }> {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      const recommendations: string[] = [];
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let estimatedSavings = 0;

      // Check index usage
      const collections = await db.listCollections().toArray();
      let unusedIndexes = 0;
      let totalIndexes = 0;

      for (const collection of collections) {
        if (collection.name.startsWith('system.')) continue;
        
        try {
          const coll = db.collection(collection.name);
          const indexes = await coll.indexes();
          totalIndexes += indexes.length;
          
          // Check for unused indexes
          for (const index of indexes) {
            if (index.name === '_id_') continue;
            
            try {
              const indexStats = await coll.aggregate([
                { $indexStats: {} },
                { $match: { name: index.name } }
              ]).toArray();
              
              if (indexStats.length > 0 && indexStats[0].accesses?.ops === 0) {
                unusedIndexes++;
              }
            } catch (error) {
              // Ignore index stats errors
            }
          }
        } catch (error) {
          // Ignore collection errors
        }
      }

      // Analyze fragmentation
      const fragmentationRatio = stats.storageSize > 0 ? stats.dataSize / stats.storageSize : 1;
      
      // Generate recommendations
      if (unusedIndexes > 0) {
        recommendations.push(`Remove ${unusedIndexes} unused indexes to free up space`);
        estimatedSavings += unusedIndexes * 1024 * 1024; // Estimate 1MB per unused index
        priority = 'medium';
      }

      if (fragmentationRatio < 0.8) {
        recommendations.push('Database fragmentation detected - compaction recommended');
        estimatedSavings += (stats.storageSize - stats.dataSize) * 0.1; // Estimate 10% savings
        priority = priority === 'low' ? 'medium' : priority;
      }

      if (stats.indexSize > stats.dataSize * 0.5) {
        recommendations.push('Index size is large relative to data size - review index strategy');
        priority = 'high';
      }

      // Check for old data
      const oldDataCollections = ['sessions', 'logs', 'audit', 'tempdata'];
      for (const collectionName of oldDataCollections) {
        try {
          const collection = db.collection(collectionName);
          const count = await collection.estimatedDocumentCount();
          
          if (count > 10000) {
            recommendations.push(`Clean up old data in ${collectionName} collection (${count} documents)`);
            priority = priority === 'low' ? 'medium' : priority;
          }
        } catch (error) {
          // Collection might not exist
        }
      }

      // Check collection count
      if (stats.collections > 100) {
        recommendations.push(`High number of collections (${stats.collections}) - consider consolidation`);
        priority = 'high';
      }

      if (recommendations.length === 0) {
        recommendations.push('Database is well-optimized - no immediate maintenance needed');
      }

      return {
        priority,
        recommendations,
        estimatedSpaceSavings: `${Math.round(estimatedSavings / 1024 / 1024)}MB`
      };

    } catch (error) {
      logger.error('Failed to generate maintenance recommendations:', error);
      return {
        priority: 'medium',
        recommendations: ['Unable to analyze database - manual maintenance recommended'],
        estimatedSpaceSavings: 'Unknown'
      };
    }
  }
}

export const enhancedDatabaseService = new EnhancedDatabaseService();

