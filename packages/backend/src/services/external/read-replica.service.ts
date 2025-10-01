/**
 * Database Read Replica Service
 *
 * Manages read replica connections for analytics and reporting queries
 * to distribute load and improve performance for read-heavy operations.
 */

import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { logger } from '../../utils/logger';
import { monitoringService } from './monitoring.service';

export interface ReadReplicaConfig {
  uri: string;
  name: string;
  weight: number;           // Load balancing weight (1-10)
  maxPoolSize: number;
  readPreference: 'secondary' | 'secondaryPreferred' | 'primary';
  tags?: Record<string, string>;
  enabled: boolean;
}

export interface ReplicaStats {
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  queries: number;
  avgResponseTime: number;
  errors: number;
  lastUsed: Date;
  weight: number;
}

export interface QueryOptions {
  useReplica?: boolean;
  replicaName?: string;
  maxRetries?: number;
  timeout?: number;
  readConcern?: 'local' | 'available' | 'majority';
}

/**
 * Read replica connection manager
 */
export class ReadReplicaService {
  private replicas = new Map<string, Connection>();
  private replicaConfigs = new Map<string, ReadReplicaConfig>();
  private replicaStats = new Map<string, ReplicaStats>();
  private currentReplicaIndex = 0;

  constructor() {
    this.initializeReplicas();
    this.startHealthChecks();
    this.startStatsCollection();
  }

  /**
   * Initialize read replica connections
   */
  private async initializeReplicas(): Promise<void> {
    const replicaConfigs = this.getReplicaConfigs();

    logger.info('🔧 Initializing read replica connections...', {
      count: replicaConfigs.length
    });

    for (const config of replicaConfigs) {
      if (config.enabled) {
        try {
          await this.connectReplica(config);
        } catch (error) {
          logger.error(`Failed to connect to replica ${config.name}:`, error);
        }
      }
    }

    logger.info(`✅ Read replica initialization completed. ${this.replicas.size} replicas connected.`);
  }

  /**
   * Get replica configurations from environment
   */
  private getReplicaConfigs(): ReadReplicaConfig[] {
    const configs: ReadReplicaConfig[] = [];

    // Primary analytics replica
    if (process.env.MONGODB_ANALYTICS_URI) {
      configs.push({
        name: 'analytics',
        uri: process.env.MONGODB_ANALYTICS_URI,
        weight: 5,
        maxPoolSize: 20,
        readPreference: 'secondaryPreferred',
        tags: { purpose: 'analytics' },
        enabled: true
      });
    }

    // Reporting replica
    if (process.env.MONGODB_REPORTING_URI) {
      configs.push({
        name: 'reporting',
        uri: process.env.MONGODB_REPORTING_URI,
        weight: 3,
        maxPoolSize: 15,
        readPreference: 'secondary',
        tags: { purpose: 'reporting' },
        enabled: true
      });
    }

    // Read-only replica
    if (process.env.MONGODB_READONLY_URI) {
      configs.push({
        name: 'readonly',
        uri: process.env.MONGODB_READONLY_URI,
        weight: 7,
        maxPoolSize: 25,
        readPreference: 'secondary',
        tags: { purpose: 'readonly' },
        enabled: true
      });
    }

    // Fallback to primary if no replicas configured
    if (configs.length === 0 && process.env.MONGODB_URI) {
      logger.warn('⚠️ No read replicas configured, using primary connection');
      configs.push({
        name: 'primary-fallback',
        uri: process.env.MONGODB_URI,
        weight: 1,
        maxPoolSize: 10,
        readPreference: 'primary',
        enabled: true
      });
    }

    return configs;
  }

  /**
   * Connect to a single replica
   */
  private async connectReplica(config: ReadReplicaConfig): Promise<void> {
    logger.info(`🔗 Connecting to read replica: ${config.name}`);

    const options: ConnectOptions = {
      maxPoolSize: config.maxPoolSize,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      readPreference: config.readPreference,
      readConcern: { level: 'available' },
      bufferMaxEntries: 0,
      bufferCommands: false,
      retryWrites: false, // Read replicas don't need write retries
      retryReads: true,
      appName: `OrderPlatform-ReadReplica-${config.name}`
    };

    try {
      const connection = mongoose.createConnection(config.uri, options);

      // Setup event handlers
      this.setupReplicaEventHandlers(connection, config);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for replica ${config.name}`));
        }, 10000);

        connection.on('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        connection.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Store connection and config
      this.replicas.set(config.name, connection);
      this.replicaConfigs.set(config.name, config);

      // Initialize stats
      this.replicaStats.set(config.name, {
        name: config.name,
        status: 'connected',
        queries: 0,
        avgResponseTime: 0,
        errors: 0,
        lastUsed: new Date(),
        weight: config.weight
      });

      logger.info(`✅ Read replica connected: ${config.name}`);

      monitoringService.recordMetric({
        name: 'read_replica_connected',
        value: 1,
        tags: { replica: config.name }
      });

    } catch (error) {
      logger.error(`❌ Failed to connect to read replica ${config.name}:`, error);

      monitoringService.recordMetric({
        name: 'read_replica_connection_failed',
        value: 1,
        tags: { replica: config.name, error: error.message }
      });

      throw error;
    }
  }

  /**
   * Setup event handlers for replica connections
   */
  private setupReplicaEventHandlers(connection: Connection, config: ReadReplicaConfig): void {
    connection.on('connected', () => {
      this.updateReplicaStatus(config.name, 'connected');
      logger.info(`📡 Replica ${config.name} connected`);
    });

    connection.on('disconnected', () => {
      this.updateReplicaStatus(config.name, 'disconnected');
      logger.warn(`⚠️ Replica ${config.name} disconnected`);
    });

    connection.on('error', (error) => {
      this.updateReplicaStatus(config.name, 'error');
      const stats = this.replicaStats.get(config.name);
      if (stats) {
        stats.errors++;
      }

      logger.error(`❌ Replica ${config.name} error:`, error);

      monitoringService.recordMetric({
        name: 'read_replica_error',
        value: 1,
        tags: { replica: config.name, error: error.name }
      });
    });

    connection.on('reconnected', () => {
      this.updateReplicaStatus(config.name, 'connected');
      logger.info(`🔄 Replica ${config.name} reconnected`);
    });
  }

  /**
   * Get optimal replica for query
   */
  getOptimalReplica(options: QueryOptions = {}): Connection {
    // Use specific replica if requested
    if (options.replicaName) {
      const replica = this.replicas.get(options.replicaName);
      if (replica && this.isReplicaHealthy(options.replicaName)) {
        return replica;
      }
    }

    // Use replica balancing if requested and available
    if (options.useReplica !== false) {
      const replica = this.selectReplicaByWeight();
      if (replica) {
        return replica;
      }
    }

    // Fallback to primary connection
    return mongoose.connection;
  }

  /**
   * Select replica using weighted round-robin
   */
  private selectReplicaByWeight(): Connection | null {
    const healthyReplicas = Array.from(this.replicaStats.entries())
      .filter(([name, stats]) => this.isReplicaHealthy(name))
      .sort((a, b) => b[1].weight - a[1].weight); // Sort by weight descending

    if (healthyReplicas.length === 0) {
      return null;
    }

    // Weighted round-robin selection
    const totalWeight = healthyReplicas.reduce((sum, [, stats]) => sum + stats.weight, 0);
    let randomWeight = Math.random() * totalWeight;

    for (const [name, stats] of healthyReplicas) {
      randomWeight -= stats.weight;
      if (randomWeight <= 0) {
        const connection = this.replicas.get(name);
        if (connection) {
          this.recordReplicaUsage(name);
          return connection;
        }
      }
    }

    // Fallback to first healthy replica
    const [firstName] = healthyReplicas[0];
    const connection = this.replicas.get(firstName);
    if (connection) {
      this.recordReplicaUsage(firstName);
    }

    return connection || null;
  }

  /**
   * Check if replica is healthy
   */
  private isReplicaHealthy(replicaName: string): boolean {
    const stats = this.replicaStats.get(replicaName);
    const connection = this.replicas.get(replicaName);

    return !!(
      stats &&
      connection &&
      stats.status === 'connected' &&
      connection.readyState === 1 &&
      stats.errors < 10 // Allow some errors but not too many
    );
  }

  /**
   * Execute query with replica
   */
  async executeQuery<T>(
    queryFn: (connection: Connection) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const replica = this.getOptimalReplica(options);

    try {
      const result = await Promise.race([
        queryFn(replica),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), options.timeout || 30000)
        )
      ]);

      const duration = Date.now() - startTime;
      this.recordQueryMetrics(replica, duration, true);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(replica, duration, false);

      // Retry with different replica if available and retries allowed
      if (options.maxRetries && options.maxRetries > 0 && replica !== mongoose.connection) {
        logger.warn('Query failed on replica, retrying with different connection:', error);

        return this.executeQuery(queryFn, {
          ...options,
          maxRetries: options.maxRetries - 1,
          replicaName: undefined // Don't force same replica on retry
        });
      }

      throw error;
    }
  }

  /**
   * Record replica usage
   */
  private recordReplicaUsage(replicaName: string): void {
    const stats = this.replicaStats.get(replicaName);
    if (stats) {
      stats.lastUsed = new Date();
    }
  }

  /**
   * Record query metrics
   */
  private recordQueryMetrics(connection: Connection, duration: number, success: boolean): void {
    // Find replica name for this connection
    const replicaName = Array.from(this.replicas.entries())
      .find(([, conn]) => conn === connection)?.[0] || 'primary';

    const stats = this.replicaStats.get(replicaName);
    if (stats) {
      stats.queries++;
      stats.avgResponseTime = (stats.avgResponseTime + duration) / 2;

      if (!success) {
        stats.errors++;
      }
    }

    monitoringService.recordMetric({
      name: 'read_replica_query_duration',
      value: duration,
      tags: {
        replica: replicaName,
        success: success.toString()
      }
    });
  }

  /**
   * Update replica status
   */
  private updateReplicaStatus(replicaName: string, status: ReplicaStats['status']): void {
    const stats = this.replicaStats.get(replicaName);
    if (stats) {
      stats.status = status;
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [name, connection] of this.replicas.entries()) {
        try {
          await connection.db.admin().ping();
          this.updateReplicaStatus(name, 'connected');
        } catch (error) {
          this.updateReplicaStatus(name, 'error');
          logger.warn(`Health check failed for replica ${name}:`, error);
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    setInterval(() => {
      for (const [name, stats] of this.replicaStats.entries()) {
        monitoringService.recordMetric({
          name: 'read_replica_status',
          value: stats.status === 'connected' ? 1 : 0,
          tags: { replica: name }
        });

        monitoringService.recordMetric({
          name: 'read_replica_queries_total',
          value: stats.queries,
          tags: { replica: name }
        });

        monitoringService.recordMetric({
          name: 'read_replica_avg_response_time',
          value: stats.avgResponseTime,
          tags: { replica: name }
        });

        // Reset query counter
        stats.queries = 0;
      }
    }, 60000); // Every minute
  }

  /**
   * Get replica statistics
   */
  getReplicaStats(): ReplicaStats[] {
    return Array.from(this.replicaStats.values());
  }

  /**
   * Get specific replica connection
   */
  getReplica(name: string): Connection | null {
    return this.replicas.get(name) || null;
  }

  /**
   * Check if any replicas are available
   */
  hasHealthyReplicas(): boolean {
    return Array.from(this.replicaStats.keys()).some(name => this.isReplicaHealthy(name));
  }

  /**
   * Gracefully close all replica connections
   */
  async closeAllReplicas(): Promise<void> {
    logger.info('📡 Closing all read replica connections...');

    const closePromises = Array.from(this.replicas.entries()).map(async ([name, connection]) => {
      try {
        await connection.close();
        logger.info(`✅ Replica ${name} connection closed`);
      } catch (error) {
        logger.error(`❌ Error closing replica ${name}:`, error);
      }
    });

    await Promise.all(closePromises);

    this.replicas.clear();
    this.replicaStats.clear();
    this.replicaConfigs.clear();

    logger.info('✅ All read replica connections closed');
  }
}

// Singleton instance
export const readReplicaService = new ReadReplicaService();

/**
 * Helper functions for using read replicas in services
 */

/**
 * Execute analytics query with read replica
 */
export async function executeAnalyticsQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    replicaName: 'analytics',
    maxRetries: 2,
    timeout: 30000,
    ...options
  });
}

/**
 * Execute reporting query with read replica
 */
export async function executeReportingQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    replicaName: 'reporting',
    maxRetries: 1,
    timeout: 60000,
    ...options
  });
}

/**
 * Execute read-only query with read replica
 */
export async function executeReadOnlyQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    maxRetries: 2,
    timeout: 15000,
    ...options
  });
}