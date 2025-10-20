import type { CacheOptions } from '../utils/types';
import { cacheStoreService } from '../core/cacheStore.service';

export function Cacheable(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      const cached = await cacheStoreService.get(cacheKey, { ...options, serialize: true });
      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      await cacheStoreService.set(cacheKey, result, { ...options, serialize: true });
      return result;
    };
  };
}

export function CacheInvalidate(pattern: string, prefix?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      await cacheStoreService.clear(pattern, prefix);
      return result;
    };
  };
}
