// src/cache/domainCache.ts
import { BrandSettings } from '../models/brandSettings.model';
import { Manufacturer } from '../models/manufacturer.model';

let allowedDomains = new Set<string>();

/**
 * Call this at startup (and periodically) to reload
 * all brand & manufacturer custom domains into memory.
 */
export async function startDomainCachePolling(intervalMs = 5 * 60_000) {
  // initial load
  await reloadCache();

  // then poll every `intervalMs`
  setInterval(reloadCache, intervalMs);
}

async function reloadCache() {
  const newSet = new Set<string>();

  // 1) Load all brand custom domains
  const brands = await BrandSettings.find({ customDomain: { $exists: true, $ne: '' } })
    .select('customDomain')
    .lean();
  for (const b of brands) {
    if (b.customDomain) {
      newSet.add(b.customDomain);
    }
  }

  // 3) Swap in the new set
  allowedDomains = newSet;
  console.log(`Domain cache reloaded: ${allowedDomains.size} entries`);
}

/**
 * Check if a given origin is in our in-memory list
 */
export function isAllowedCustomDomain(origin: string): boolean {
  return allowedDomains.has(origin);
}

