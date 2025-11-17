import mongoose from 'mongoose';
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../observability/core/monitoringRegistry.service'; 
import type { ConnectionManager } from './connectionManager.service';

export class TelemetryScheduler {
  private connectionInterval: NodeJS.Timeout | null = null;
  private databaseMetricsInterval: NodeJS.Timeout | null = null;
  private indexMetricsInterval: NodeJS.Timeout | null = null;

  constructor(private readonly connectionManager: ConnectionManager) {}

  start(): void {
    if (this.connectionInterval || this.databaseMetricsInterval || this.indexMetricsInterval) {
      return;
    }

    this.connectionInterval = setInterval(() => {
      const stats = this.connectionManager.getStats();
      monitoringService.recordMetric({
        name: 'mongodb_connections_active',
        value: stats.connections,
        tags: {}
      });
    }, 30_000);

    this.databaseMetricsInterval = setInterval(async () => {
      try {
        const db = mongoose.connection.db;
        const stats = await db.stats();

        monitoringService.recordMetric({
          name: 'mongodb_collections_count',
          value: stats.collections ?? 0,
          tags: {}
        });

        monitoringService.recordMetric({
          name: 'mongodb_data_size_bytes',
          value: stats.dataSize ?? 0,
          tags: {}
        });

        monitoringService.recordMetric({
          name: 'mongodb_index_size_bytes',
          value: stats.indexSize ?? 0,
          tags: {}
        });
      } catch (error) {
        logger.error('Failed to collect MongoDB metrics', error as Error);
      }
    }, 60_000);

    this.indexMetricsInterval = setInterval(async () => {
      try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        monitoringService.recordMetric({
          name: 'mongodb_collections_total',
          value: collections.length,
          tags: {}
        });
      } catch (error) {
        logger.error('Failed to collect collection metrics', error as Error);
      }
    }, 300_000);
  }

  stop(): void {
    if (this.connectionInterval) {
      clearInterval(this.connectionInterval);
      this.connectionInterval = null;
    }

    if (this.databaseMetricsInterval) {
      clearInterval(this.databaseMetricsInterval);
      this.databaseMetricsInterval = null;
    }

    if (this.indexMetricsInterval) {
      clearInterval(this.indexMetricsInterval);
      this.indexMetricsInterval = null;
    }
  }
}
