import { logger } from '../../../utils/logger';
import { usageDataService } from '../core/usageData.service';
import { usageCacheService } from '../utils/usageCache.service';
import { usageValidationService } from '../validation/usageValidation.service';
import type { UsageUpdate } from '../utils/types';

interface QueuedUpdate extends UsageUpdate {
  lastQueuedAt: number;
}

export class UsageUpdatesService {
  private readonly BATCH_INTERVAL = 5_000;
  private queue: Map<string, QueuedUpdate> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  async updateUsage(businessId: string, update: UsageUpdate, immediate = false): Promise<void> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);
    const normalizedUpdate = usageValidationService.normalizeUpdate(update);

    if (immediate) {
      await this.executeUpdate(normalizedBusinessId, normalizedUpdate);
    } else {
      this.enqueue(normalizedBusinessId, normalizedUpdate);
    }

    await usageCacheService.invalidateUsage(normalizedBusinessId);
  }

  async flush(): Promise<void> {
    if (this.queue.size === 0) {
      return;
    }

    const updates = Array.from(this.queue.entries());
    this.queue.clear();
    this.clearTimer();

    await Promise.all(
      updates.map(async ([businessId, payload]) => {
        try {
          await this.executeUpdate(businessId, payload);
        } catch (error) {
          logger.error('Failed to apply queued usage update', {
            businessId,
            payload,
            error: (error as Error).message
          });
        }
      })
    );
  }

  async cleanup(): Promise<void> {
    this.clearTimer();
    await this.flush();
  }

  private enqueue(businessId: string, update: UsageUpdate): void {
    const existing = this.queue.get(businessId) || { lastQueuedAt: Date.now() };

    const merged: QueuedUpdate = {
      certificates: (existing.certificates || 0) + (update.certificates || 0),
      votes: (existing.votes || 0) + (update.votes || 0),
      apiCalls: (existing.apiCalls || 0) + (update.apiCalls || 0),
      storage: typeof update.storage === 'number'
        ? update.storage
        : existing.storage,
      lastQueuedAt: Date.now()
    };

    this.queue.set(businessId, merged);
    this.ensureTimer();
  }

  private ensureTimer(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.flush().catch(error => {
        logger.error('Usage batch flush failed', { error: (error as Error).message });
      });
    }, this.BATCH_INTERVAL);
  }

  private clearTimer(): void {
    if (!this.batchTimer) {
      return;
    }

    clearTimeout(this.batchTimer);
    this.batchTimer = null;
  }

  private async executeUpdate(businessId: string, update: UsageUpdate): Promise<void> {
    await usageDataService.applyUsageIncrement(businessId, update);
  }
}

export const usageUpdatesService = new UsageUpdatesService();