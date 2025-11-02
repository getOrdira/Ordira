import { cacheValidationService } from './validation/cacheValidation.service';
import { cacheStoreService } from './core/cacheStore.service';
import { redisClusterService } from './core/redisClusterConnection.service';
import { enhancedCacheService } from './features/enhancedCache.service';
import { cacheConnectionService } from './core/cacheConnection.service';


export { CacheConnectionService, cacheConnectionService } from './core/cacheConnection.service';
export { CacheStoreService, cacheStoreService } from './core/cacheStore.service';
export { RedisClusterService, redisClusterService } from './core/redisClusterConnection.service';
export { EnhancedCacheService, enhancedCacheService } from './features/enhancedCache.service';
export type { CacheOptions } from './features/enhancedCache.service';
export { Cacheable, CacheInvalidate } from './features/cacheDecorators.service';
export { cacheValidationService, CacheValidationService } from './validation/cacheValidation.service';
export * from './utils/types';

export const cacheServices = {
  cacheConnectionService,
  cacheStoreService,
  redisClusterService,
  enhancedCacheService,
  cacheValidationService
};

export type CacheServices = typeof cacheServices;
