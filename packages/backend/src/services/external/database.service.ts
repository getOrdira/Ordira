// src/services/external/database.service.ts

import mongoose from 'mongoose';
import { logger } from '../../utils/logger'; 
import { createAppError } from '../../middleware/error.middleware';

export interface DatabaseStats {
  connections: number;
  readyState: number;
  host: string;
  port: number;
  name: string;
  collections: number;
  indexes: number;
  memoryUsage: string;
  queryTime: number;
}

export interface QueryOptimization {
  useIndex: boolean;
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexUsed?: string;
}

/**
 * Advanced database optimization and monitoring service
 */
export class DatabaseService {
  private connection: typeof mongoose;
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private maxCacheSize = 100; // Limit cache size

  constructor() {
    this.connection = mongoose;
    this.setupOptimizations();
  }

  private setupOptimizations(): void {
    // Enable query optimization
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Optimize connection settings
    mongoose.set('bufferCommands', false);
  }

  /**
   * Get database statistics and health
   */
  async getStats(): Promise<DatabaseStats> {
    try {
      const start = Date.now();
      
      const admin = this.connection.connection.db.admin();
      const serverStatus = await admin.serverStatus();
      const dbStats = await this.connection.connection.db.stats();
      
      const queryTime = Date.now() - start;
      
      return {
        connections: this.connection.connection.readyState,
        readyState: this.connection.connection.readyState,
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        name: this.connection.connection.name,
        collections: dbStats.collections,
        indexes: dbStats.indexes,
        memoryUsage: `${Math.round(serverStatus.mem.resident / 1024 / 1024)}MB`,
        queryTime
      };
    } catch (error) {
      throw createAppError('Failed to get database stats', 500, 'DB_STATS_ERROR');
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes(): Promise<{ optimized: number; removed: number; created: number }> {
    try {
      const db = this.connection.connection.db;
      const collections = await db.listCollections().toArray();
      
      let optimized = 0;
      let removed = 0;
      let created = 0;

      for (const collection of collections) {
        const coll = db.collection(collection.name);
        const indexes = await coll.indexes();
        
        // Analyze and optimize indexes
        const optimization = await this.analyzeIndexes(coll, indexes);
        optimized += optimization.optimized;
        removed += optimization.removed;
        created += optimization.created;
      }

      return { optimized, removed, created };
    } catch (error) {
      throw createAppError('Failed to optimize indexes', 500, 'INDEX_OPTIMIZATION_ERROR');
    }
  }

  /**
   * Create optimized indexes for common queries
   */
  async createOptimizedIndexes(): Promise<void> {
    try {
      const db = this.connection.connection.db;

      // Business model indexes
      await db.collection('businesses').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { businessName: 1 }, sparse: true },
        { key: { createdAt: -1 } },
        { key: { 'subscription.plan': 1, 'subscription.status': 1 } },
        { key: { isActive: 1, createdAt: -1 } }
      ]);

      // Manufacturer model indexes
      await db.collection('manufacturers').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { name: 1 }, sparse: true },
        { key: { industry: 1, isVerified: 1 } },
        { key: { 'location.country': 1, 'location.city': 1 } },
        { key: { createdAt: -1 } },
        { key: { isActive: 1, lastLoginAt: -1 } }
      ]);

      // User model indexes
      await db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { business: 1, createdAt: -1 } },
        { key: { totalVotes: -1, createdAt: -1 } },
        { key: { isActive: 1, lastLoginAt: -1 } }
      ]);

      // Product model indexes
      await db.collection('products').createIndexes([
        { key: { business: 1, createdAt: -1 } },
        { key: { business: 1, category: 1 } },
        { key: { business: 1, isActive: 1 } },
        { key: { name: 'text', description: 'text' } }
      ]);

      // Voting record indexes
      await db.collection('votingrecords').createIndexes([
        { key: { business: 1, timestamp: -1 } },
        { key: { business: 1, proposalId: 1 } },
        { key: { voterAddress: 1, business: 1 } },
        { key: { selectedProductId: 1, business: 1 } }
      ]);

      // Pending vote indexes
      await db.collection('pendingvotes').createIndexes([
        { key: { businessId: 1, isProcessed: 1, createdAt: -1 } },
        { key: { businessId: 1, proposalId: 1 } },
        { key: { userId: 1, businessId: 1 } },
        { key: { createdAt: 1 }, expireAfterSeconds: 86400 } // TTL index
      ]);

      // Brand settings indexes
      await db.collection('brandsettings').createIndexes([
        { key: { business: 1 }, unique: true },
        { key: { 'web3Settings.voteContract': 1 }, sparse: true },
        { key: { 'web3Settings.nftContract': 1 }, sparse: true }
      ]);

      // Supply chain indexes
      await db.collection('supplychainevents').createIndexes([
        { key: { manufacturer: 1, timestamp: -1 } },
        { key: { productId: 1, timestamp: -1 } },
        { key: { eventType: 1, timestamp: -1 } },
        { key: { 'location.coordinates': '2dsphere' } }
      ]);

      logger.info('✅ Optimized indexes created successfully');
    } catch (error) {
      logger.error('❌ Failed to create optimized indexes:', error);
      throw createAppError('Failed to create optimized indexes', 500, 'INDEX_CREATION_ERROR');
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(collectionName: string, query: any, options: any = {}): Promise<QueryOptimization> {
    try {
      const start = Date.now();
      const db = this.connection.connection.db;
      const collection = db.collection(collectionName);

      // Execute explain to analyze query
      const explainResult = await collection.find(query, options).explain('executionStats');
      const executionStats = explainResult.executionStats;

      const executionTime = Date.now() - start;
      const useIndex = executionStats.totalDocsExamined < executionStats.totalDocsReturned * 2;

      return {
        useIndex,
        executionTime,
        documentsExamined: executionStats.totalDocsExamined,
        documentsReturned: executionStats.totalDocsReturned,
        indexUsed: executionStats.executionStages?.indexName || 'No index used'
      };
    } catch (error) {
      throw createAppError('Failed to analyze query', 500, 'QUERY_ANALYSIS_ERROR');
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      const db = this.connection.connection.db;
      const profiler = db.collection('system.profile');
      
      const slowQueries = await profiler
        .find({ millis: { $gte: 100 } }) // Queries taking more than 100ms
        .sort({ millis: -1 })
        .limit(limit)
        .toArray();

      return slowQueries;
    } catch (error) {
      logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * Enable query profiling
   */
  async enableProfiling(level: number = 1, slowMs: number = 100): Promise<void> {
    try {
      const db = this.connection.connection.db;
      await db.command({
        profile: level,
        slowms: slowMs
      });
      logger.info('✅ Query profiling enabled (level: ${level}, slowms: ${slowMs})');
    } catch (error) {
      logger.error('Failed to enable profiling:', error);
    }
  }

  /**
   * Disable query profiling
   */
  async disableProfiling(): Promise<void> {
    try {
      const db = this.connection.connection.db;
      await db.command({ profile: 0 });
      logger.info('✅ Query profiling disabled');
    } catch (error) {
      logger.error('Failed to disable profiling:', error);
    }
  }

  /**
   * Optimize connection pool
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Close existing connections
      await this.connection.disconnect();

      // Reconnect with optimized settings
      await this.connection.connect(process.env.MONGODB_URI!, {
        maxPoolSize: 20, // Increased pool size
        minPoolSize: 5,  // Minimum connections
        maxIdleTimeMS: 30000, // Close idle connections after 30s
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Connection optimization
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        // Compression
        compressors: ['zlib'],
        zlibCompressionLevel: 6
      });

      logger.info('✅ Connection pool optimized');
    } catch (error) {
      logger.error('❌ Failed to optimize connection pool:', error);
      throw createAppError('Failed to optimize connection pool', 500, 'CONNECTION_OPTIMIZATION_ERROR');
    }
  }

  /**
   * Cache query results
   */
  async cacheQuery<T>(
    key: string, 
    queryFn: () => Promise<T>, 
    ttl: number = 300
  ): Promise<T> {
    const cached = this.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.result;
    }

    const result = await queryFn();
    
    // Manage cache size to prevent memory leaks
    if (this.queryCache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple LRU)
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize / 2));
      toRemove.forEach(([key]) => this.queryCache.delete(key));
    }
    
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });

    return result;
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    this.queryCache.clear();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      await this.connection.connection.db.admin().ping();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        latency: Date.now() - start, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async analyzeIndexes(collection: any, indexes: any[]): Promise<{ optimized: number; removed: number; created: number }> {
    // This would contain complex index analysis logic
    // For now, return placeholder values
    return { optimized: 0, removed: 0, created: 0 };
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
