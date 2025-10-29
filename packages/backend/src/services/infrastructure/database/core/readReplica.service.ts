import mongoose, { type Connection, type ConnectOptions } from 'mongoose';
import { configService } from '../../../utils/config.service';
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../observability';

export interface ReadReplicaConfig {
  uri: string;
  name: string;
  weight: number;
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

interface ExecutionContext<T> {
  queryFn: (connection: Connection) => Promise<T>;
  options: QueryOptions;
  replicas: Array<{ name: string; weight: number }>;
}

export class ReadReplicaService {
  private replicas = new Map<string, Connection>();
  private replicaConfigs = new Map<string, ReadReplicaConfig>();
  private replicaStats = new Map<string, ReplicaStats>();
  private currentReplicaIndex = 0;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private statsCollectionInterval: NodeJS.Timeout | null = null;
  private readonly hasReplicaConfiguration: boolean;

  constructor() {
    this.hasReplicaConfiguration = this.detectReplicaConfiguration();

    if (this.hasReplicaConfiguration) {
      void this.ensureInitialized();
    }
  }

  private detectReplicaConfiguration(): boolean {
    const databaseConfig = configService.getDatabase();

    return Boolean(
      process.env.MONGODB_ANALYTICS_URI ||
      process.env.MONGODB_REPORTING_URI ||
      process.env.MONGODB_READONLY_URI ||
      (databaseConfig?.mongodb?.analyticsUris && databaseConfig.mongodb.analyticsUris.length > 0)
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized || !this.hasReplicaConfiguration) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        await this.initializeReplicas();

        if (this.replicas.size === 0) {
          logger.info('Read replica service initialized without configured replicas; background tasks not started');
          this.initialized = true;
          return;
        }

        this.startHealthChecks();
        this.startStatsCollection();
        this.initialized = true;
      })().catch((error) => {
        logger.error('Failed to initialize read replicas', { error });
        throw error;
      }).finally(() => {
        this.initializationPromise = null;
      });
    }

    await this.initializationPromise;
  }

  private async initializeReplicas(): Promise<void> {
    const replicaConfigs = this.getReplicaConfigs();

    if (replicaConfigs.length === 0) {
      logger.info('Read replica initialization skipped (no replica URIs configured)');
      return;
    }

    for (const connection of this.replicas.values()) {
      await connection.close().catch(() => undefined);
    }

    this.replicas.clear();
    this.replicaConfigs.clear();
    this.replicaStats.clear();

    logger.info('Initializing read replica connections', {
      replicaCount: replicaConfigs.length
    });

    for (const config of replicaConfigs) {
      if (!config.enabled) {
        continue;
      }

      try {
        await this.connectReplica(config);
      } catch (error) {
        logger.error(`Failed to connect to replica ${config.name}`, { error });
      }
    }

    logger.info('Read replica initialization completed', {
      connectedReplicas: this.replicas.size
    });
  }

  private getReplicaConfigs(): ReadReplicaConfig[] {
    const configs: ReadReplicaConfig[] = [];

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

    const databaseConfig = configService.getDatabase();
    const analyticsUris = databaseConfig?.mongodb?.analyticsUris ?? [];
    const seenUris = new Set(configs.map((config) => config.uri));

    analyticsUris.forEach((uri, index) => {
      if (seenUris.has(uri)) {
        return;
      }

      configs.push({
        name: `analytics-${index + 1}`,
        uri,
        weight: 5,
        maxPoolSize: 20,
        readPreference: 'secondaryPreferred',
        tags: { purpose: 'analytics' },
        enabled: true
      });

      seenUris.add(uri);
    });

    return configs;
  }

  private async connectReplica(config: ReadReplicaConfig): Promise<void> {
    const options: ConnectOptions = {
      maxPoolSize: config.maxPoolSize,
      serverSelectionTimeoutMS: 5_000,
      readPreference: config.readPreference
    };

    const connection = await mongoose.createConnection(config.uri, options).asPromise();

    this.replicas.set(config.name, connection);
    this.replicaConfigs.set(config.name, config);
    this.replicaStats.set(config.name, {
      name: config.name,
      status: 'connected',
      queries: 0,
      avgResponseTime: 0,
      errors: 0,
      lastUsed: new Date(),
      weight: config.weight
    });

    logger.info('Connected to read replica', { replica: config.name });
  }

  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      for (const [name, connection] of this.replicas.entries()) {
        try {
          await connection.db.command({ ping: 1 });
          this.updateReplicaStatus(name, 'connected');
        } catch (error) {
          logger.warn('Read replica health check failed', { replica: name, error });
          this.updateReplicaStatus(name, 'error');

          const config = this.replicaConfigs.get(name);
          if (!config) continue;

          try {
            await this.reconnectReplica(config);
          } catch (reconnectError) {
            logger.error('Failed to reconnect replica', {
              replica: name,
              error: reconnectError
            });
          }
        }
      }
    }, 30_000);
  }

  private async reconnectReplica(config: ReadReplicaConfig): Promise<void> {
    if (!config.enabled) return;

    const existing = this.replicas.get(config.name);
    if (existing) {
      await existing.close();
      this.replicas.delete(config.name);
    }

    await this.connectReplica(config);
  }

  private startStatsCollection(): void {
    if (this.statsCollectionInterval) {
      clearInterval(this.statsCollectionInterval);
    }

    this.statsCollectionInterval = setInterval(() => {
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

        stats.queries = 0;
      }
    }, 60_000);
  }

  async executeQuery<T>(
    queryFn: (connection: Connection) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const shouldUseReplica = options.useReplica ?? true;

    if (!shouldUseReplica) {
      return queryFn(mongoose.connection);
    }

    await this.ensureInitialized();

    const context: ExecutionContext<T> = {
      queryFn,
      options,
      replicas: this.buildReplicaList(options)
    };

    if (context.replicas.length === 0) {
      return queryFn(mongoose.connection);
    }

    const replicasToTry = [...context.replicas];

    while (replicasToTry.length) {
      const replicaInfo = this.selectReplica(replicasToTry);
      if (!replicaInfo) break;

      const replicaConnection = this.replicas.get(replicaInfo.name);
      const stats = this.replicaStats.get(replicaInfo.name);

      if (!replicaConnection || !stats || stats.status !== 'connected') {
        replicasToTry.splice(replicasToTry.indexOf(replicaInfo), 1);
        continue;
      }

      const start = Date.now();

      try {
        const result = await this.executeWithTimeout(
          context.queryFn(replicaConnection),
          context.options.timeout ?? 30_000
        );

        const duration = Date.now() - start;
        this.recordQuerySuccess(replicaInfo.name, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.recordQueryError(replicaInfo.name, duration, error as Error);
        replicasToTry.splice(replicasToTry.indexOf(replicaInfo), 1);
      }
    }

    logger.warn('All read replicas failed, falling back to primary');
    return context.queryFn(mongoose.connection);
  }

  private buildReplicaList(options: QueryOptions): Array<{ name: string; weight: number }> {
    if (options.replicaName) {
      const stats = this.replicaStats.get(options.replicaName);
      if (stats && this.isReplicaHealthy(options.replicaName)) {
        return [{ name: options.replicaName, weight: stats.weight }];
      }
      return [];
    }

    const replicas: Array<{ name: string; weight: number }> = [];
    for (const [name, stats] of this.replicaStats.entries()) {
      if (this.isReplicaHealthy(name)) {
        replicas.push({ name, weight: stats.weight });
      }
    }

    return replicas.sort((a, b) => b.weight - a.weight);
  }

  private selectReplica(
    replicas: Array<{ name: string; weight: number }>
  ): { name: string; weight: number } | null {
    if (!replicas.length) {
      return null;
    }

    const totalWeight = replicas.reduce((sum, replica) => sum + replica.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const replica of replicas) {
      cumulativeWeight += replica.weight;
      if (random <= cumulativeWeight) {
        return replica;
      }
    }

    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % replicas.length;
    return replicas[this.currentReplicaIndex];
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Query timed out'));
      }, timeout);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  private recordQuerySuccess(replicaName: string, duration: number): void {
    const stats = this.replicaStats.get(replicaName);
    if (!stats) return;

    stats.queries += 1;
    stats.lastUsed = new Date();
    stats.avgResponseTime =
      stats.avgResponseTime === 0 ? duration : (stats.avgResponseTime + duration) / 2;

    monitoringService.recordMetric({
      name: 'read_replica_query_duration',
      value: duration,
      tags: { replica: replicaName }
    });
  }

  private recordQueryError(replicaName: string, duration: number, error: Error): void {
    const stats = this.replicaStats.get(replicaName);
    if (!stats) return;

    stats.errors += 1;
    stats.avgResponseTime =
      stats.avgResponseTime === 0 ? duration : (stats.avgResponseTime + duration) / 2;

    monitoringService.recordMetric({
      name: 'read_replica_query_error',
      value: 1,
      tags: { replica: replicaName, error: error.name }
    });
  }

  private updateReplicaStatus(name: string, status: ReplicaStats['status']): void {
    const stats = this.replicaStats.get(name);
    if (!stats) return;
    stats.status = status;
  }

  private isReplicaHealthy(name: string): boolean {
    const stats = this.replicaStats.get(name);
    return !!stats && stats.status === 'connected';
  }

  getReplicaStats(): ReplicaStats[] {
    return Array.from(this.replicaStats.values());
  }

  getReplica(name: string): Connection | null {
    return this.replicas.get(name) ?? null;
  }

  hasHealthyReplicas(): boolean {
    return Array.from(this.replicaStats.keys()).some((name) => this.isReplicaHealthy(name));
  }

  async closeAllReplicas(): Promise<void> {
    logger.info('Closing all read replica connections');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.statsCollectionInterval) {
      clearInterval(this.statsCollectionInterval);
      this.statsCollectionInterval = null;
    }

    const closePromises = Array.from(this.replicas.entries()).map(async ([name, connection]) => {
      try {
        await connection.close();
        logger.info('Replica connection closed', { replica: name });
      } catch (error) {
        logger.error('Error closing replica connection', { replica: name, error });
      }
    });

    await Promise.all(closePromises);

    this.replicas.clear();
    this.replicaStats.clear();
    this.replicaConfigs.clear();
    this.initialized = false;
  }
}

export const readReplicaService = new ReadReplicaService();

export async function executeAnalyticsQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    replicaName: 'analytics',
    maxRetries: 2,
    timeout: 30_000,
    ...options
  });
}

export async function executeReportingQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    replicaName: 'reporting',
    maxRetries: 1,
    timeout: 60_000,
    ...options
  });
}

export async function executeReadOnlyQuery<T>(
  queryFn: (connection: Connection) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  return readReplicaService.executeQuery(queryFn, {
    useReplica: true,
    maxRetries: 2,
    timeout: 15_000,
    ...options
  });
}
