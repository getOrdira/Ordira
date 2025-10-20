import type { ReadPreferenceMode } from 'mongodb';
import type { Connection } from 'mongoose';

export interface DatabaseConnectionOptions {
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
  readPreference?: ReadPreferenceMode | string;
  writeConcern?: any;
  readConcern?: { level: string };
  compressors?: string[];
  zlibCompressionLevel?: number;
  appName?: string;
  monitorCommands?: boolean;
  maxConnecting?: number;
  heartbeatFrequencyMS?: number;
  maxStalenessSeconds?: number;
}

export interface DatabaseConfig {
  uri: string;
  options: DatabaseConnectionOptions;
}

export interface DatabaseHealth {
  healthy: boolean;
  latency: number;
  error?: string;
}

export interface DatabaseStats {
  connections: {
    current: number;
    readyState: number;
    host: string;
    port: number;
    name: string;
  };
  collections: number;
  indexes: number;
  memoryUsage: string;
  queryTime: number;
}

export interface ConnectionMetrics {
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

export interface IndexOptimizationSummary {
  optimized: number;
  removed: number;
  created: number;
}

export interface SlowOperation {
  ns: string;
  op: string;
  millis: number;
  query?: Record<string, unknown>;
}

export type MongooseConnection = Connection;
