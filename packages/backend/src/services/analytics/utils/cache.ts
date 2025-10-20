import { enhancedCacheService, type CacheOptions } from '../../external/enhanced-cache.service';
import { hashCacheParams, serializeParams } from './helpers';

const ANALYTICS_CACHE_PREFIX = 'analytics';

export const ANALYTICS_CACHE_TTL = {
  default: 300,
  short: 60,
  long: 3600
} as const;

export const ANALYTICS_CACHE_SEGMENT = {
  business: 'business',
  product: 'product',
  manufacturer: 'manufacturer',
  dashboard: 'dashboard',
  voting: 'voting',
  insights: 'insights',
  reporting: 'reporting',
  system: 'system'
} as const;

interface CacheMetadataPayload {
  segment: string;
  identifier?: string;
  hash: string;
  raw: string;
}

function buildCacheMetadata(segment: string, params: unknown, identifier?: string): CacheMetadataPayload {
  const raw = serializeParams(params);
  return {
    segment,
    identifier,
    hash: hashCacheParams({ segment, identifier, raw }),
    raw
  };
}

/**
 * Read analytics data from cache using enhanced cache service.
 */
export async function readAnalyticsCache<T>(
  segment: string,
  params: unknown,
  options: CacheOptions = {}
): Promise<T | null> {
  const metadata = buildCacheMetadata(segment, params, options.keyPrefix);
  return enhancedCacheService.getCachedAnalytics(segment, metadata, {
    keyPrefix: options.keyPrefix || ANALYTICS_CACHE_PREFIX,
    ttl: options.ttl ?? ANALYTICS_CACHE_TTL.default,
    ...options
  });
}

/**
 * Write analytics data to cache with sensible defaults.
 */
export async function writeAnalyticsCache<T>(
  segment: string,
  params: unknown,
  payload: T,
  options: CacheOptions = {}
): Promise<void> {
  const metadata = buildCacheMetadata(segment, params, options.keyPrefix);
  await enhancedCacheService.cacheAnalytics(segment, metadata, payload, {
    keyPrefix: options.keyPrefix || ANALYTICS_CACHE_PREFIX,
    ttl: options.ttl ?? ANALYTICS_CACHE_TTL.default,
    ...options
  });
}

/**
 * Helper to invalidate cache entries by writing an empty payload with short TTL.
 */
export async function invalidateAnalyticsCache(
  segment: string,
  params: unknown,
  options: CacheOptions = {}
): Promise<void> {
  const metadata = buildCacheMetadata(segment, params, options.keyPrefix);
  await enhancedCacheService.cacheAnalytics(segment, metadata, null, {
    keyPrefix: options.keyPrefix || ANALYTICS_CACHE_PREFIX,
    ttl: 1,
    ...options
  });
}
