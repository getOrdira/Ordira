/**
 * Redis Cluster Service
 *
 * Provides high-availability Redis caching with cluster support,
 * automatic failover, and load balancing across multiple Redis nodes.
 */

import Redis, { Cluster, RedisOptions } from 'ioredis';
import type { Redis as RedisInstance } from 'ioredis';
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../observability/core/monitoringRegistry.service'; 
import { secureRedisClusterConfigs, validateRedisSecurityConfig } from '../../../../config/redis-cluster-secure.config';
import crypto from 'crypto';
import { configService } from '../../config/core/config.service';

export interface RedisClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  options: {
    enableReadyCheck?: boolean;
    redisOptions?: {
      password?: string;
      connectTimeout?: number;
      lazyConnect?: boolean;
      maxRetriesPerRequest?: number;
      commandTimeout?: number;
      tls?: {
        rejectUnauthorized: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      };
      keepAlive?: number;
      family?: number;
      db?: number;
    };
    clusterRetryDelayOnFailover?: number;
    clusterRetryDelayOnClusterDown?: number;
    clusterMaxRedirections?: number;
    scaleReads?: 'master' | 'slave' | 'all';
    readOnly?: boolean;
    enableOfflineQueue?: boolean;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    lazyConnect?: boolean;
  };
}

export interface ClusterStats {
  nodes: Array<{
    host: string;
    port: number;
    status: 'connected' | 'connecting' | 'disconnected' | 'ready';
    role: 'master' | 'slave';
    slots?: string;
    memory?: string;
  }>;
  totalNodes: number;
  connectedNodes: number;
  operations: {
    total: number;
    successful: number;
    failed: number;
    redirections: number;
  };
  performance: {
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
  };
}

export class RedisClusterService {
  private cluster: Cluster | null = null;
  private singleRedis: RedisInstance | null = null;
  private isClusterMode: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  private performanceInterval: NodeJS.Timeout | null = null;
  private readonly requireSecureConfig: boolean;
  private operationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    redirections: 0,
    latencies: [] as number[]
  };
  private authAttempts = 0;
  private readonly maxAuthAttempts = 3;
  private lastAuthFailure: number = 0;

  constructor() {
    this.requireSecureConfig = this.shouldRequireSecureConfig();

    if (this.requireSecureConfig) {
      validateRedisSecurityConfig();
    } else {
      try {
        validateRedisSecurityConfig();
      } catch (error) {
        logger.warn('Redis security configuration incomplete; continuing with relaxed defaults.', {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }

    this.initializeRedis();
  }

  private shouldRequireSecureConfig(): boolean {
    // Only require secure config if TLS is explicitly enabled
    // This allows non-TLS Redis connections (common in development and some cloud providers)
    return process.env.REDIS_TLS === 'true';
  }

  /**
   * Get secure password with validation
   * Only required when NOT using REDIS_URL (password is embedded in URL)
   */
  private getSecurePassword(): string | undefined {
    // If REDIS_URL is set, password is embedded in the URL, so we don't need REDIS_PASSWORD
    if (process.env.REDIS_URL) {
      return undefined;
    }

    const password = process.env.REDIS_PASSWORD;
    if (!password) {
      throw new Error('REDIS_PASSWORD environment variable is required when not using REDIS_URL');
    }

    // Basic password strength validation
    if (password.length < 8) {
      if (this.requireSecureConfig) {
        throw new Error('Redis password must be at least 8 characters long');
      }
      logger.warn('Redis password is shorter than the recommended minimum of 8 characters.');
    }

    return password;
  }

  /**
   * Get secure TLS configuration (only if TLS is enabled)
   */
  private getSecureTLSConfig(): { tls?: any } {
    // Only configure TLS if explicitly enabled
    if (process.env.REDIS_TLS !== 'true') {
      return {};
    }

    if (!process.env.REDIS_CA_CERT) {
      throw new Error('REDIS_CA_CERT environment variable is required when REDIS_TLS=true');
    }

    return {
      tls: {
        rejectUnauthorized: true,
        ca: process.env.REDIS_CA_CERT,
        cert: process.env.REDIS_CLIENT_CERT,
        key: process.env.REDIS_CLIENT_KEY
      }
    };
  }

  /**
   * Validate authentication attempt with rate limiting
   */
  private validateAuthAttempt(): void {
    const now = Date.now();

    // Reset auth attempts after 5 minutes
    if (now - this.lastAuthFailure > 5 * 60 * 1000) {
      this.authAttempts = 0;
    }

    if (this.authAttempts >= this.maxAuthAttempts) {
      throw new Error('Maximum authentication attempts exceeded. Please wait before retrying.');
    }
  }

  /**
   * Record authentication failure
   */
  private recordAuthFailure(): void {
    this.authAttempts++;
    this.lastAuthFailure = Date.now();

    logger.warn('Redis authentication failed:', {
      attempts: this.authAttempts,
      maxAttempts: this.maxAuthAttempts,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Initialize Redis connection (cluster or single node)
   * Uses formalized cache strategy: cluster only when multiple nodes specified
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Check if cluster configuration is provided
      const clusterConfig = this.getClusterConfig();
      const shouldUseCluster = this.shouldUseClusterMode(clusterConfig);

      if (shouldUseCluster) {
        logger.info('🔧 Initializing Redis cluster mode (multiple nodes detected)');
        await this.initializeCluster(clusterConfig);
      } else {
        logger.info('🔧 Initializing Redis single node mode (single node or cluster disabled)');
        await this.initializeSingleNode();
      }

      this.setupHealthMonitoring();

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * Determine if cluster mode should be used based on formalized cache strategy
   */
  private shouldUseClusterMode(clusterConfig: RedisClusterConfig): boolean {
    // Force cluster mode if explicitly enabled
    if (process.env.REDIS_FORCE_CLUSTER === 'true') {
      logger.info('Redis cluster mode forced via REDIS_FORCE_CLUSTER environment variable');
      return true;
    }

    // Disable cluster mode if explicitly disabled
    if (process.env.REDIS_DISABLE_CLUSTER === 'true') {
      logger.info('Redis cluster mode disabled via REDIS_DISABLE_CLUSTER environment variable');
      return false;
    }

    // Use cluster mode only when multiple nodes are specified
    const hasMultipleNodes = clusterConfig.nodes.length > 1;
    
    if (hasMultipleNodes) {
      logger.info(`Redis cluster mode enabled: ${clusterConfig.nodes.length} nodes detected`);
      return true;
    }

    logger.info('Redis single node mode: only one node configured');
    return false;
  }

  /**
   * Get secure cluster configuration from environment
   */
  private getClusterConfig(): RedisClusterConfig {
    const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development';

    // Use secure configuration template
    const secureConfig = secureRedisClusterConfigs[environment];

    // Parse cluster nodes from environment or use secure defaults
    const dbConfig = configService.getDatabase();
    const clusterNodes = process.env.REDIS_CLUSTER_NODES || dbConfig?.redis?.clusterNodes || '';
    const password = this.getSecurePassword();
    const tlsConfig = this.getSecureTLSConfig();

    if (!clusterNodes) {
      return {
        nodes: [{ host: 'localhost', port: 6379 }],
        options: {}
      };
    }

    // Parse multiple nodes (comma-separated)
    const nodes = clusterNodes.split(',').map(node => {
      if (node.startsWith('redis://') || node.startsWith('rediss://')) {
        const url = new URL(node);
        return {
          host: url.hostname,
          port: parseInt(url.port) || 6379
        };
      } else {
        const [host, port] = node.split(':');
        return {
          host: host || 'localhost',
          port: parseInt(port) || 6379
        };
      }
    });

    const redisOptions = {
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      ...(password ? { password } : {}),
      ...(tlsConfig.tls ? { tls: tlsConfig.tls } : {})
    };

    const options = {
      enableReadyCheck: false,
      clusterRetryDelayOnFailover: 100,
      clusterRetryDelayOnClusterDown: 300,
      clusterMaxRedirections: 16,
      scaleReads: 'slave' as const,
      enableOfflineQueue: false,
      ...(secureConfig?.options || {}),
      redisOptions: {
        ...(secureConfig?.options?.redisOptions || {}),
        ...redisOptions
      }
    };

    return {
      nodes,
      options
    };
  }

  /**
   * Initialize Redis cluster
   */
  private async initializeCluster(config: RedisClusterConfig): Promise<void> {
    logger.info('🔧 Initializing Redis cluster...', {
      nodeCount: config.nodes.length,
      nodes: config.nodes
    });

    this.cluster = new Redis.Cluster(config.nodes, config.options);
    this.isClusterMode = true;

    this.setupClusterEventHandlers();

    // Wait for cluster to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Cluster initialization timeout'));
      }, 30000);

      this.cluster!.on('ready', () => {
        clearTimeout(timeout);
        logger.info('✅ Redis cluster ready');
        resolve();
      });

      this.cluster!.on('error', (error) => {
        clearTimeout(timeout);
        logger.error('❌ Redis cluster initialization failed:', error);
        reject(error);
      });
    });

    await this.applyEvictionPolicy();

    // Record cluster metrics
    monitoringService.recordMetric({
      name: 'redis_cluster_initialized',
      value: 1,
      tags: {
        nodeCount: config.nodes.length.toString(),
        status: 'success'
      }
    });
  }

  /**
   * Initialize single Redis node
   */
  private async initializeSingleNode(): Promise<void> {
    logger.info('🔧 Initializing single Redis node...');

    const redisUrl = process.env.REDIS_URL;
    const config = {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4,
      enableReadyCheck: true,
      retryDelayOnFailover: 100
    };

    if (redisUrl) {
      this.singleRedis = new Redis(redisUrl, config);
    } else {
      const password = this.getSecurePassword();
      const tlsConfig = this.getSecureTLSConfig();

      const redisOptions: RedisOptions = {
        ...config,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_DB || '0')
      };

      if (password) {
        redisOptions.password = password;
      }

      if (tlsConfig.tls) {
        redisOptions.tls = tlsConfig.tls;
      }

      this.singleRedis = new Redis(redisOptions);
    }

    this.setupSingleNodeEventHandlers();

    try {
      await this.singleRedis.ping();
      await this.applyEvictionPolicy();
      logger.info('✅ Single Redis node ready');
    } catch (error) {
      logger.error('❌ Single Redis node initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup cluster event handlers
   */
  private setupClusterEventHandlers(): void {
    if (!this.cluster) return;

    this.cluster.on('connect', () => {
      logger.info('✅ Redis cluster connected');
    });

    this.cluster.on('ready', () => {
      logger.info('🚀 Redis cluster ready');
    });

    this.cluster.on('error', (error) => {
      logger.error('❌ Redis cluster error:', error);
      this.operationStats.failed++;

      monitoringService.recordMetric({
        name: 'redis_cluster_error',
        value: 1,
        tags: { error: error.message }
      });
    });

    this.cluster.on('close', () => {
      logger.warn('⚠️ Redis cluster connection closed');
    });

    this.cluster.on('reconnecting', () => {
      logger.info('🔄 Redis cluster reconnecting...');
    });

    this.cluster.on('node error', (error, node) => {
      logger.error(`❌ Redis node error (${node.options.host}:${node.options.port}):`, error);
    });

    this.cluster.on('+node', (node) => {
      logger.info(`➕ Redis node added: ${node.options.host}:${node.options.port}`);
    });

    this.cluster.on('-node', (node) => {
      logger.warn(`➖ Redis node removed: ${node.options.host}:${node.options.port}`);
    });
  }

  /**
   * Setup single node event handlers
   */
  private setupSingleNodeEventHandlers(): void {
    if (!this.singleRedis) return;

    this.singleRedis.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    this.singleRedis.on('ready', () => {
      logger.info('🚀 Redis ready');
    });

    this.singleRedis.on('error', (error) => {
      logger.error('❌ Redis error:', error);
      this.operationStats.failed++;
    });

    this.singleRedis.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });

    this.singleRedis.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    this.clearHealthMonitoring();

    // Monitor cluster health every 30 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectClusterMetrics();
      } catch (error) {
        logger.error('Failed to collect cluster metrics:', error);
      }
    }, 30000);

    // Log performance statistics every 5 minutes
    this.performanceInterval = setInterval(() => {
      this.logPerformanceStats();
    }, 300000);
  }

  private async applyEvictionPolicy(): Promise<void> {
    const redisConfig = configService.getDatabase()?.redis;
    let policy = process.env.REDIS_EVICTION_POLICY || redisConfig?.evictionPolicy || 'allkeys-lru';

    // Validate eviction policy
    const validPolicies = [
      'noeviction', 'allkeys-lru', 'volatile-lru', 'allkeys-random', 
      'volatile-random', 'volatile-ttl', 'allkeys-lfu', 'volatile-lfu'
    ];

    if (!validPolicies.includes(policy)) {
      logger.warn(`Invalid Redis eviction policy: ${policy}. Using default: allkeys-lru`);
      policy = 'allkeys-lru';
    }

    try {
      if (this.isClusterMode && this.cluster) {
        // Apply eviction policy to all cluster nodes
        const nodes = this.cluster.nodes('all');
        const results = await Promise.allSettled(
          nodes.map((node) => node.config('SET', 'maxmemory-policy', policy))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        logger.info(`Applied eviction policy "${policy}" to Redis cluster`, {
          totalNodes: nodes.length,
          successful,
          failed,
          policy
        });

        // Record metrics
        monitoringService.recordMetric({
          name: 'redis_eviction_policy_applied',
          value: successful,
          tags: { policy, mode: 'cluster' }
        });

      } else if (this.singleRedis) {
        await this.singleRedis.config('SET', 'maxmemory-policy', policy);
        
        logger.info(`Applied eviction policy "${policy}" to Redis single node`, {
          policy
        });

        // Record metrics
        monitoringService.recordMetric({
          name: 'redis_eviction_policy_applied',
          value: 1,
          tags: { policy, mode: 'single' }
        });
      }

      // Set additional memory management policies
      await this.applyMemoryManagementPolicies();

    } catch (error) {
      logger.warn('Failed to enforce Redis eviction policy', {
        policy,
        error: error instanceof Error ? error.message : error
      });

      monitoringService.recordMetric({
        name: 'redis_eviction_policy_error',
        value: 1,
        tags: { policy, error: error instanceof Error ? error.message : 'unknown' }
      });
    }
  }

  /**
   * Apply additional memory management policies
   */
  private async applyMemoryManagementPolicies(): Promise<void> {
    const policies = [
      { key: 'maxmemory-samples', value: '5' }, // LRU/LFU sample size
      { key: 'lazyfree-lazy-eviction', value: 'yes' }, // Async eviction
      { key: 'lazyfree-lazy-expire', value: 'yes' }, // Async expiration
      { key: 'lazyfree-lazy-server-del', value: 'yes' }, // Async deletion
    ];

    try {
      if (this.isClusterMode && this.cluster) {
        const nodes = this.cluster.nodes('all');
        
        for (const policy of policies) {
          await Promise.allSettled(
            nodes.map((node) => node.config('SET', policy.key, policy.value))
          );
        }

        logger.info('Applied memory management policies to Redis cluster', {
          policies: policies.length,
          nodes: nodes.length
        });

      } else if (this.singleRedis) {
        for (const policy of policies) {
          await this.singleRedis.config('SET', policy.key, policy.value);
        }

        logger.info('Applied memory management policies to Redis single node', {
          policies: policies.length
        });
      }

    } catch (error) {
      logger.warn('Failed to apply memory management policies', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private clearHealthMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
  }

  /**
   * Get Redis client (cluster or single)
   */
  public getClient(): Cluster | RedisInstance | null {
    return this.cluster || this.singleRedis;
  }

  /**
   * Release Redis client (no-op for compatibility)
   */
  public releaseClient(client: Cluster | RedisInstance | null): void {
    // No-op: client is managed internally
  }

  /**
   * Delete key from cluster
   */
  public async deleteFromCluster(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Execute operation with performance tracking
   */
  private async executeOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.operationStats.total++;

    try {
      const result = await fn();
      const latency = Date.now() - startTime;

      this.operationStats.successful++;
      this.operationStats.latencies.push(latency);

      // Keep only last 1000 latency measurements
      if (this.operationStats.latencies.length > 1000) {
        this.operationStats.latencies = this.operationStats.latencies.slice(-1000);
      }

      // Record slow operations
      if (latency > 100) {
        logger.warn(`Slow Redis operation: ${operation} took ${latency}ms`);

        monitoringService.recordMetric({
          name: 'redis_slow_operation',
          value: latency,
          tags: { operation }
        });
      }

      return result;

    } catch (error) {
      this.operationStats.failed++;
      logger.error(`Redis operation failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * Get value with cluster support
   */
  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    return this.executeOperation('get', async () => {
      const value = await client.get(key);
      if (value === null) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    });
  }

  /**
   * Set value with cluster support
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    return this.executeOperation('set', async () => {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (ttl) {
        await client.setex(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }

      return true;
    });
  }

  /**
   * Delete value with cluster support
   */
  async delete(key: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    return this.executeOperation('delete', async () => {
      const result = await client.del(key);
      return result > 0;
    });
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const client = this.getClient();
    if (!client) return keys.map(() => null);

    return this.executeOperation('mget', async () => {
      const values = await client.mget(...keys);

      return values.map(value => {
        if (value === null) return null;

        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    });
  }

  /**
   * Get cluster statistics
   */
  async getClusterStats(): Promise<ClusterStats> {
    const defaultStats: ClusterStats = {
      nodes: [],
      totalNodes: 0,
      connectedNodes: 0,
      operations: {
        total: this.operationStats.total,
        successful: this.operationStats.successful,
        failed: this.operationStats.failed,
        redirections: this.operationStats.redirections
      },
      performance: {
        averageLatency: 0,
        maxLatency: 0,
        minLatency: 0
      }
    };

    try {
      if (this.isClusterMode && this.cluster) {
        const nodes = this.cluster.nodes('all');
        const nodeStats = await Promise.all(
          nodes.map(async (node) => {
            try {
              const info = await node.info();
              const role = info.includes('role:master') ? 'master' : 'slave';
              const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';

              return {
                host: node.options.host!,
                port: node.options.port!,
                status: node.status as 'ready' | 'connected' | 'connecting' | 'disconnected',
                role: role as 'master' | 'slave',
                memory
              };
            } catch (error) {
              return {
                host: node.options.host!,
                port: node.options.port!,
                status: 'disconnected' as const,
                role: 'master' as const,
                memory: 'unknown'
              };
            }
          })
        );

        defaultStats.nodes = nodeStats;
        defaultStats.totalNodes = nodeStats.length;
        defaultStats.connectedNodes = nodeStats.filter(n => n.status === 'ready').length;

      } else if (this.singleRedis) {
        const status = this.singleRedis.status === 'ready' ? 'ready' : 'disconnected';
        defaultStats.nodes = [{
          host: this.singleRedis.options.host || 'localhost',
          port: this.singleRedis.options.port || 6379,
          status: status as any,
          role: 'master',
          memory: 'unknown'
        }];
        defaultStats.totalNodes = 1;
        defaultStats.connectedNodes = status === 'ready' ? 1 : 0;
      }

      // Calculate performance metrics
      if (this.operationStats.latencies.length > 0) {
        const latencies = this.operationStats.latencies;
        defaultStats.performance.averageLatency = Math.round(
          latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
        );
        defaultStats.performance.maxLatency = Math.max(...latencies);
        defaultStats.performance.minLatency = Math.min(...latencies);
      }

    } catch (error) {
      logger.error('Failed to get cluster stats:', error);
    }

    return defaultStats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    cluster: boolean;
    error?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return {
        healthy: false,
        latency: 0,
        cluster: this.isClusterMode,
        error: 'Redis not initialized'
      };
    }

    const startTime = Date.now();

    try {
      await client.ping();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        cluster: this.isClusterMode
      };

    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        cluster: this.isClusterMode,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Collect cluster metrics
   */
  private async collectClusterMetrics(): Promise<void> {
    try {
      const stats = await this.getClusterStats();

      monitoringService.recordMetric({
        name: 'redis_cluster_nodes_total',
        value: stats.totalNodes,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'redis_cluster_nodes_connected',
        value: stats.connectedNodes,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'redis_operations_total',
        value: stats.operations.total,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'redis_operations_failed',
        value: stats.operations.failed,
        tags: {}
      });

      if (stats.performance.averageLatency > 0) {
        monitoringService.recordMetric({
          name: 'redis_average_latency',
          value: stats.performance.averageLatency,
          tags: {}
        });
      }

    } catch (error) {
      logger.error('Failed to collect cluster metrics:', error);
    }
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(): void {
    const stats = this.operationStats;
    const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

    logger.info('📊 Redis performance stats:', {
      totalOperations: stats.total,
      successfulOperations: stats.successful,
      failedOperations: stats.failed,
      successRate: `${successRate.toFixed(2)}%`,
      isClusterMode: this.isClusterMode
    });
  }

  /**
   * Gracefully disconnect
   */
  async disconnect(): Promise<void> {
    try {
      if (this.cluster) {
        await this.cluster.disconnect();
        logger.info('✅ Redis cluster disconnected');
      }

      if (this.singleRedis) {
        await this.singleRedis.quit();
        logger.info('✅ Redis disconnected');
      }

      this.clearHealthMonitoring();

    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
}

// Singleton instance
export const redisClusterService = new RedisClusterService();
