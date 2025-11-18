import mongoose, { type Connection, type ConnectOptions } from 'mongoose';
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../observability/core/monitoringRegistry.service';
import type { DatabasePlatformConfig } from '../utils/databasePlatformConfig.service';

export interface ConnectionStats {
  readyState: number;
  host?: string;
  port?: number;
  name?: string;
  connections: number;
}

export class ConnectionManager {
  private currentConfig: DatabasePlatformConfig | null = null;
  private readonly connection: Connection;

  constructor() {
    this.connection = mongoose.connection;
  }

  async connect(config: DatabasePlatformConfig): Promise<void> {
    if (this.connection.readyState === 1) {
      logger.info('MongoDB connection already established');
      return;
    }

    this.currentConfig = config;
    this.configureMongoose();
    this.registerEventListeners();

    const connectOptions: ConnectOptions = {
      ...config.options,
      // Only include serverApi if explicitly configured (some MongoDB instances don't support it)
      ...(config.serverApi ? { serverApi: config.serverApi } : {}),
      appName: config.appName
    };

    logger.info('Connecting to MongoDB...', {
      appName: config.appName,
      workloadIdentity: config.workloadIdentity,
      usesStableApi: !!config.serverApi
    });

    try {
      await mongoose.connect(config.uri, connectOptions);
      logger.info('✅ MongoDB connection established successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ MongoDB connection failed:', {
        error: errorMessage,
        uri: config.uri ? `${config.uri.substring(0, 20)}...` : 'not configured',
        hasTlsOptions: !!(connectOptions.tlsCAFile || connectOptions.tlsCertificateKeyFile)
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection.readyState === 0) {
      return;
    }

    await mongoose.disconnect();
  }

  getConnection(): Connection {
    return this.connection;
  }

  getStats(): ConnectionStats {
    return {
      readyState: this.connection.readyState,
      host: this.connection.host,
      port: this.connection.port,
      name: this.connection.name,
      connections: mongoose.connections.length
    };
  }

  private configureMongoose(): void {
    mongoose.set('strictQuery', true);
    mongoose.set('sanitizeFilter', true);

    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        logger.debug(`MongoDB ${collectionName}.${method}`, {
          query,
          doc
        });
      });
    }
  }

  private registerEventListeners(): void {
    this.connection.removeAllListeners();

    this.connection.on('connected', () => {
      logger.info('MongoDB connected');
      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 1,
        tags: { status: 'connected' }
      });
    });

    this.connection.on('error', (error) => {
      logger.error('MongoDB connection error', error);
      monitoringService.recordMetric({
        name: 'mongodb_connection_error',
        value: 1,
        tags: { error: error.name ?? 'Unknown' }
      });
    });

    this.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      monitoringService.recordMetric({
        name: 'mongodb_connection_status',
        value: 0,
        tags: { status: 'disconnected' }
      });
    });
  }
}

export const connectionManager = new ConnectionManager();
