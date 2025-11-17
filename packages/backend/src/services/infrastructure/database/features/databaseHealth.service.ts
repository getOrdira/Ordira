import mongoose from 'mongoose';
import { monitoringService } from '../../observability/core/monitoringRegistry.service';
import { redisClusterService } from '../../cache/core/redisClusterConnection.service';
import type { ConnectionManager } from '../core/connectionManager.service';

export interface DatabaseHealthSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mongo: {
    healthy: boolean;
    latencyMs: number;
    readyState: number;
    connections: number;
  };
  redis: {
    healthy: boolean;
    latencyMs: number;
    cluster: boolean;
  };
  timestamp: string;
}

export class DatabaseHealthService {
  constructor(private readonly connectionManager: ConnectionManager) {}

  async collectSnapshot(): Promise<DatabaseHealthSnapshot> {
    const mongoStart = Date.now();
    let mongoHealthy = false;
    let mongoLatency = 0;

    try {
      await mongoose.connection.db.admin().ping();
      mongoHealthy = true;
      mongoLatency = Date.now() - mongoStart;
    } catch {
      mongoLatency = Date.now() - mongoStart;
    }

    const redisHealth = await redisClusterService.healthCheck();

    const mongoStats = this.connectionManager.getStats();
    const snapshot: DatabaseHealthSnapshot = {
      status: this.resolveOverallStatus(mongoHealthy, redisHealth.healthy),
      mongo: {
        healthy: mongoHealthy,
        latencyMs: mongoLatency,
        readyState: mongoStats.readyState,
        connections: mongoStats.connections
      },
      redis: {
        healthy: redisHealth.healthy,
        latencyMs: redisHealth.latency,
        cluster: redisHealth.cluster
      },
      timestamp: new Date().toISOString()
    };

    return snapshot;
  }

  emitMetrics(snapshot: DatabaseHealthSnapshot): void {
    monitoringService.recordMetrics([
      {
        name: 'mongodb_health_status',
        value: snapshot.mongo.healthy ? 1 : 0,
        tags: {}
      },
      {
        name: 'mongodb_latency_ms',
        value: snapshot.mongo.latencyMs,
        tags: {}
      },
      {
        name: 'redis_health_status',
        value: snapshot.redis.healthy ? 1 : 0,
        tags: { cluster: snapshot.redis.cluster.toString() }
      },
      {
        name: 'redis_latency_ms',
        value: snapshot.redis.latencyMs,
        tags: { cluster: snapshot.redis.cluster.toString() }
      }
    ]);
  }

  private resolveOverallStatus(mongoHealthy: boolean, redisHealthy: boolean): DatabaseHealthSnapshot['status'] {
    if (mongoHealthy && redisHealthy) {
      return 'healthy';
    }

    if (!mongoHealthy && !redisHealthy) {
      return 'unhealthy';
    }

    return 'degraded';
  }
}
