import { createAppError } from '../../../../middleware/deprecated/error.middleware';

export class CacheValidationService {
  ensureTtl(ttl: number | undefined): number | undefined {
    if (ttl === undefined || ttl === null) {
      return ttl;
    }

    if (typeof ttl !== 'number' || Number.isNaN(ttl) || ttl <= 0) {
      throw createAppError('Cache TTL must be a positive number', 400, 'CACHE_INVALID_TTL');
    }

    return ttl;
  }

  ensureKey(key: string): string {
    if (!key || typeof key !== 'string') {
      throw createAppError('Cache key must be a non-empty string', 400, 'CACHE_INVALID_KEY');
    }

    return key;
  }
}

export const cacheValidationService = new CacheValidationService();
