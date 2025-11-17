import { Business } from '../../../models/core/business.model'; 
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import {
  ANALYTICS_CACHE_SEGMENT,
  ANALYTICS_CACHE_TTL,
  readAnalyticsCache,
  writeAnalyticsCache
} from '../utils/cache';
import type { SystemHealthMetrics } from '../utils/types';

/**
 * Provides platform-level system health metrics consumed by dashboard aggregation.
 */
export class SystemHealthService {
  /**
   * Compute system health metrics with short-lived caching.
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const cacheKey = { segment: 'system-health' };

    const cached = await readAnalyticsCache<SystemHealthMetrics>(
      ANALYTICS_CACHE_SEGMENT.system,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const [totalBusinesses, totalManufacturers, activeBusinesses] = await Promise.all([
      Business.countDocuments(),
      Manufacturer.countDocuments(),
      Business.countDocuments({ isActive: { $ne: false } })
    ]);

    const metrics: SystemHealthMetrics = {
      totalUsers: totalBusinesses + totalManufacturers,
      activeUsers: activeBusinesses,
      systemLoad: this.estimateSystemLoad(),
      uptime: Math.round(process.uptime()),
      incidentCount: 0
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.system,
      cacheKey,
      metrics,
      { ttl: ANALYTICS_CACHE_TTL.short }
    );

    return metrics;
  }

  private estimateSystemLoad(): number {
    if (typeof (process as any).resourceUsage === 'function') {
      const usage = (process as any).resourceUsage();
      const cpuTime = usage.userCPUTime + usage.systemCPUTime;
      return Math.round(cpuTime / 1000);
    }

    return 0;
  }
}

export const systemHealthService = new SystemHealthService();

