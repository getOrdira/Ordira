import { jobQueueAdapter, JobQueueAdapter } from '../core/jobQueueAdapter.service';
import { backgroundTaskProcessorService, BackgroundTaskProcessorService } from './backgroundTaskProcessor.service';
import type { QueueDashboardSummary } from '../utils/types';

export class QueueDashboardService {
  constructor(
    private readonly queue: JobQueueAdapter = jobQueueAdapter,
    private readonly processors: BackgroundTaskProcessorService = backgroundTaskProcessorService
  ) {}

  async getDashboardSummary(): Promise<QueueDashboardSummary> {
    const [stats, counts, processingBreakdown] = await Promise.all([
      this.queue.getJobStats(),
      this.queue.getQueueStatus(),
      Promise.resolve(this.processors.getProcessingBreakdown())
    ]);

    const waiting = counts.waiting ?? stats.waiting;
    const active = counts.active ?? stats.active;
    const failed = counts.failed ?? stats.failed;
    const completed = counts.completed ?? stats.completed;
    const delayed = (counts as Record<string, number>).delayed ?? 0;

    return {
      updatedAt: new Date(),
      totals: {
        queued: waiting,
        active,
        failed,
        completed
      },
      processingBreakdown,
      queues: [
        {
          name: 'default',
          active,
          waiting,
          failed,
          completed,
          delayed,
          throughputPerMinute: this.calculateThroughputPerMinute(stats.completed)
        }
      ]
    };
  }

  private calculateThroughputPerMinute(completed: number): number {
    const minutes = 60;
    return Number((completed / minutes).toFixed(2));
  }
}

export const queueDashboardService = new QueueDashboardService();
