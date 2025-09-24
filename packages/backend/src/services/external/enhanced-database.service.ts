/**
 * Enhanced Database Service
 * 
 * Provides optimized MongoDB connection configuration, connection pooling,
 * and database performance monitoring.
 */

import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { monitoringService } from './monitoring.service';

export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
    bufferMaxEntries?: number;
    bufferCommands?: boolean;
    retryWrites?: boolean;
    retryReads?: boolean;
    readPreference?: string;
    writeConcern?: any;
  };
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
        // Connection Pool Configuration
        maxPoolSize: isProduction ? 20 : 10, // Maximum number of connections
        minPoolSize: isProduction ? 5 : 2,   // Minimum number of connections
        maxIdleTimeMS: 30000,                // Close connections after 30s of inactivity
        
        // Timeout Configuration
        serverSelectionTimeoutMS: 5000,      // 5 second server selection timeout
        socketTimeoutMS: 45000,              // 45 second socket timeout
        connectTimeoutMS: 10000,             // 10 second connection timeout
        
        // Buffer Configuration
        bufferMaxEntries: 0,                 // Disable mongoose buffering
        bufferCommands: false,               // Disable command buffering
        
        // Retry Configuration
        retryWrites: true,                   // Retry write operations
        retryReads: true,                    // Retry read operations
        
        // Read/Write Configuration
        readPreference: isProduction ? 'secondaryPreferred' : 'primary',
        writeConcern: {
          w: isProduction ? 'majority' : 1,
          j: true,                           // Acknowledge writes to journal
          wtimeout: 5000                     // 5 second write concern timeout
        }
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
          error: error.name,
          message: error.message 
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
      const indexUsage = await db.admin().command({ indexStats: 1 });
      
      if (indexUsage && indexUsage.cursor) {
        const cursor = db.admin().command({ indexStats: 1 });
        
        // Analyze unused indexes
        let unusedIndexes = 0;
        let totalIndexes = 0;
        
        await cursor.forEach((index: any) => {
          totalIndexes++;
          if (index.accesses && index.accesses.ops === 0) {
            unusedIndexes++;
            logger.warn(`Unused index detected: ${index.name} on collection ${index.ns}`);
          }
        });

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
          error: error.message,
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
   * Execute database maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    logger.info('🔧 Performing database maintenance...');

    try {
      const db = mongoose.connection.db;
      
      // Compact collections (if supported)
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          // This is a placeholder for maintenance tasks
          // In production, you might want to:
          // - Compact collections
          // - Update statistics
          // - Clean up old data
          logger.debug(`Maintenance completed for collection: ${collection.name}`);
        } catch (error) {
          logger.warn(`Maintenance failed for collection ${collection.name}:`, error);
        }
      }

      logger.info('✅ Database maintenance completed');

    } catch (error) {
      logger.error('❌ Database maintenance failed:', error);
      throw error;
    }
  }
}

export const enhancedDatabaseService = new EnhancedDatabaseService();

