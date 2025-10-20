import Redis, { RedisOptions, Redis as RedisType } from 'ioredis';
import { logger } from '../../../../utils/logger';

export class CacheConnectionService {
  private client: RedisType | null = null;
  private readonly hasConfiguration: boolean;

  constructor() {
    this.hasConfiguration = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
    logger.info('dY"? Redis configuration detected:', { context: this.hasConfiguration ? 'Found' : 'Not found' });
  }

  getClient(): RedisType | null {
    if (!this.hasConfiguration) {
      logger.info('?s??,? No Redis configuration found, cache disabled');
      return null;
    }

    if (this.client) {
      return this.client;
    }

    const config = this.buildRedisConfig();
    this.client = new Redis(config);
    this.setupEventHandlers(this.client);
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    } finally {
      this.client = null;
    }
  }

  private buildRedisConfig(): RedisOptions {
    if (process.env.REDIS_URL) {
      try {
        const url = new URL(process.env.REDIS_URL);
        logger.info('dY"- Parsed Redis config:', { host: url.hostname, port: url.port || '6379', db: url.pathname?.slice(1) || '0' });
        return {
          host: url.hostname,
          port: parseInt(url.port, 10) || 6379,
          password: url.password || undefined,
          db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,
          family: 4,
          enableReadyCheck: true
        };
      } catch (error) {
        logger.error('??O Failed to parse REDIS_URL, falling back to defaults:', error);
      }
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4,
      enableReadyCheck: true
    };
  }

  private setupEventHandlers(client: RedisType): void {
    client.on('connect', () => logger.info('?o. Redis connected'));
    client.on('ready', () => logger.info('dYs? Redis ready for operations'));
    client.on('close', () => logger.info('?s??,? Redis connection closed'));
    client.on('reconnecting', () => logger.info('dY", Redis reconnecting...'));
    client.on('error', (error) => {
      logger.error('??O Redis error:', error);
    });
  }
}

export const cacheConnectionService = new CacheConnectionService();
