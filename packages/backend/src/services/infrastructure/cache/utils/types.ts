export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

export interface AdvancedCacheOptions extends CacheOptions {
  tags?: string[];
  keyPrefix?: string;
  encrypt?: boolean;
  sensitiveFields?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage?: string;
  connectedClients?: number;
}

export interface CacheHealth {
  healthy: boolean;
  latency: number;
  error?: string;
}

export interface ClusterHealth extends CacheHealth {
  cluster: boolean;
}
