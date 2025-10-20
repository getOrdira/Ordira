// Deprecated location: src/services/external/cache.service.ts
// This file now re-exports the modular cache services from infrastructure/cache.

export { CacheStoreService as CacheService, cacheStoreService as cacheService } from '../infrastructure/cache/core/cacheStore.service';
export type { CacheOptions, CacheStats, CacheHealth } from '../infrastructure/cache/utils/types';
export { Cacheable, CacheInvalidate } from '../infrastructure/cache/features/cacheDecorators.service';
