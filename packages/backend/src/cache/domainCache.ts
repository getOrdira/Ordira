// src/cache/domainCache.ts
import { BrandSettings } from '../models/brands/brandSettings.model';
import { logger } from '../utils/logger';
import { Manufacturer } from '../models/manufacturer/manufacturer.model';

let allowedDomains = new Set<string>();

/**
 * Call this at startup (and periodically) to reload
 * all brand & manufacturer custom domains into memory.
 */
export async function startDomainCachePolling(intervalMs = 10 * 60_000) { // Increased to 10 minutes
  // initial load
  await reloadCache();

  // then poll every `intervalMs`
  setInterval(reloadCache, intervalMs);
}

async function reloadCache() {
  try {
    const newSet = new Set<string>();

    // 1) Load all brand custom domains
    // Query all documents and filter in JavaScript to avoid Mongoose casting issues
    // This is more reliable than complex query operators that Mongoose might misinterpret
    const brands = await BrandSettings.find({})
      .select('customDomain')
      .lean();
    
    for (const b of brands) {
      // Filter for valid non-empty string customDomain values
      if (b.customDomain && typeof b.customDomain === 'string' && b.customDomain.trim() !== '') {
        newSet.add(b.customDomain.trim());
      }
    }

    // 3) Swap in the new set
    allowedDomains = newSet;
    logger.info(`Domain cache reloaded: ${allowedDomains.size} entries`);
  } catch (error) {
    logger.error('Failed to reload domain cache:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw - allow app to continue with existing cache
  }
}

/**
 * Check if a given origin is in our in-memory list
 */
export function isAllowedCustomDomain(origin: string): boolean {
  return allowedDomains.has(origin);
}



