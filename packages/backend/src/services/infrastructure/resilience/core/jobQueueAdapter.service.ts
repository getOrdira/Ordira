import { logger } from '../../../../utils/logger';
import type {
  JobData,
  JobResult,
  JobStats,
  JobProcessor,
  JobExecutionContext,
  MetricsRecorder
} from '../utils/types';

interface BullJob {
  id?: string | number;
  data: any;
  progress: (progress?: number) => void;
  attemptsMade?: number;
  processedOn?: number;
  finishedOn?: number;
  remove: () => Promise<void>;
}

interface BullQueue {
  add: (name: string, data: any, opts?: any) => Promise<BullJob>;
  process: (name: string, processor: (job: BullJob) => Promise<any>) => void;
  getJobs: (types: string[], start?: number, end?: number) => Promise<BullJob[]>;
  getJobCounts: () => Promise<Record<string, number>>;
  getActive: () => Promise<BullJob[]>;
  getWaiting: () => Promise<BullJob[]>;
  getFailed: () => Promise<BullJob[]>;
  getCompleted: () => Promise<BullJob[]>;
  clean: (grace: number, status?: string) => Promise<BullJob[]>;
  close: () => Promise<void>;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

interface JobQueueAdapterOptions {
  queueName?: string;
  metricsRecorder?: MetricsRecorder;
  statsIntervalMs?: number;
  cleanupIntervalMs?: number;
  fallbackIntervalMs?: number;
  defaultJobOptions?: Record<string, unknown>;
}

interface FallbackJobRecord {
  id: string;
  data: JobData & Record<string, any>;
  createdAt: Date;
  attemptsMade: number;
}

const DEFAULT_OPTIONS: Required<Pick<JobQueueAdapterOptions, 'statsIntervalMs' | 'cleanupIntervalMs' | 'fallbackIntervalMs'>> = {
  statsIntervalMs: 60_000,
  cleanupIntervalMs: 3_600_000,
  fallbackIntervalMs: 5_000
};

export class JobQueueAdapter {
  private bullQueue: BullQueue | null = null;
  private readonly fallbackJobs = new Map<string, FallbackJobRecord>();
  private readonly processingFallbackJobs = new Set<string>();
  private readonly processors = new Map<string, JobProcessor>();
  private readonly pendingProcessors: Array<{ jobType: string; processor: JobProcessor }> = [];
  private metricsRecorder?: MetricsRecorder;
  private readonly queueName: string;
  private readonly defaultJobOptions: Record<string, unknown>;

  private jobStats: JobStats = {
    total: 0,
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    processing: {}
  };

  private statsTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private fallbackTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(options: JobQueueAdapterOptions = {}) {
    this.queueName = options.queueName ?? 'job-processing';
    this.metricsRecorder = options.metricsRecorder;
    this.defaultJobOptions = options.defaultJobOptions ?? {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    };

    this.initializeQueue().catch(error => {
      logger.error('Failed to initialize job queue adapter:', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      this.initializeFallbackProcessor();
    });

    this.startSchedule(options);
  }

  async addJob(jobData: JobData): Promise<string> {
    this.jobStats.total++;

    if (this.bullQueue) {
      const job = await this.bullQueue.add(jobData.type, jobData, {
        priority: jobData.priority ?? 0,
        delay: jobData.delay ?? 0,
        attempts: jobData.attempts ?? this.defaultJobOptions.attempts,
        ...this.defaultJobOptions
      });

      this.recordMetric('job_added', 1, { type: jobData.type });
      return String(job.id);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.fallbackJobs.set(jobId, {
      id: jobId,
      data: jobData,
      createdAt: new Date(),
      attemptsMade: 0
    });

    this.recordMetric('job_added_fallback', 1, { type: jobData.type });
    return jobId;
  }

  registerProcessor(jobType: string, processor: JobProcessor): void {
    this.processors.set(jobType, processor);

    if (this.bullQueue) {
      this.bullQueue.process(jobType, async (job: BullJob) => {
        const context = this.createExecutionContext(job);
        return this.executeProcessor(jobType, processor, context);
      });
    } else if (!this.initialized) {
      this.pendingProcessors.push({ jobType, processor });
    }
  }

  async getJobStats(): Promise<JobStats> {
    if (this.bullQueue) {
      const counts = await this.bullQueue.getJobCounts();
      return {
        total: this.jobStats.total,
        active: counts.active ?? 0,
        waiting: counts.waiting ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        processing: { ...this.jobStats.processing }
      };
    }

    return {
      total: this.jobStats.total,
      active: this.processingFallbackJobs.size,
      waiting: this.fallbackJobs.size,
      completed: this.jobStats.completed,
      failed: this.jobStats.failed,
      processing: { ...this.jobStats.processing }
    };
  }

  async getQueueStatus(): Promise<Record<string, number>> {
    if (this.bullQueue) {
      return this.bullQueue.getJobCounts();
    }

    return {
      waiting: this.fallbackJobs.size,
      active: this.processingFallbackJobs.size,
      failed: this.jobStats.failed,
      completed: this.jobStats.completed
    };
  }

  async getJobs(types: string[] = ['active', 'waiting', 'failed']): Promise<Array<JobData & { id: string }>> {
    if (this.bullQueue) {
      const jobs = await this.bullQueue.getJobs(types, 0, 50);
      return jobs.map(job => ({
        ...job.data,
        id: String(job.id ?? '')
      }));
    }

    return Array.from(this.fallbackJobs.values()).map(({ id, data }) => ({
      ...data,
      id
    }));
  }

  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (this.bullQueue) {
      const cleaned = await this.bullQueue.clean(maxAgeMs, 'completed');
      this.recordMetric('jobs_cleaned', cleaned.length);
      return cleaned.length;
    }

    let cleaned = 0;
    const now = Date.now();
    for (const [jobId, jobRecord] of this.fallbackJobs.entries()) {
      if (now - jobRecord.createdAt.getTime() > maxAgeMs) {
        this.fallbackJobs.delete(jobId);
        cleaned++;
      }
    }

    this.recordMetric('jobs_cleaned_fallback', cleaned);
    return cleaned;
  }

  async shutdown(): Promise<void> {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }

    if (this.bullQueue) {
      await this.bullQueue.close();
    }

    this.fallbackJobs.clear();
    this.processingFallbackJobs.clear();
  }

  private async initializeQueue(): Promise<void> {
    try {
      const Bull = await import('bull').then(mod => mod.default).catch(() => null);

      if (Bull && process.env.REDIS_URL) {
        logger.info('Initializing Bull job queue adapter...', { queue: this.queueName });

        this.bullQueue = new Bull(this.queueName, {
          redis: process.env.REDIS_URL,
          defaultJobOptions: this.defaultJobOptions
        }) as any;

        this.setupBullListeners();
        this.registerPendingProcessors();
        this.initialized = true;
        return;
      }
    } catch (error) {
      logger.error('Bull queue initialization failed, falling back to in-memory queue.', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.initializeFallbackProcessor();
  }

  private initializeFallbackProcessor(): void {
    if (this.initialized) {
      return;
    }

    logger.info('Using in-memory fallback job queue.');
    this.initialized = true;
    this.startFallbackLoop();
  }

  private registerPendingProcessors(): void {
    if (!this.bullQueue) {
      return;
    }

    this.pendingProcessors.splice(0).forEach(({ jobType, processor }) => {
      this.bullQueue!.process(jobType, async (job: BullJob) => {
        const context = this.createExecutionContext(job);
        return this.executeProcessor(jobType, processor, context);
      });
    });
  }

  private createExecutionContext(job: BullJob): JobExecutionContext {
    return {
      id: String(job.id ?? `job_${Date.now()}`),
      data: job.data,
      attemptsMade: job.attemptsMade ?? 0,
      progress: (value: number) => {
        try {
          job.progress?.(value);
        } catch (error) {
          logger.warn('Failed to report job progress', {
            jobId: job.id,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
      createdAt: job.processedOn ? new Date(job.processedOn) : new Date()
    };
  }

  private async executeProcessor(jobType: string, processor: JobProcessor, context: JobExecutionContext): Promise<JobResult> {
    const start = Date.now();
    this.incrementProcessing(jobType);

    try {
      const data = await processor(context);
      const duration = Date.now() - start;

      this.jobStats.completed++;
      this.recordMetric('job_completed', 1, { type: jobType });

      return {
        success: true,
        data,
        duration
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.jobStats.failed++;
      this.recordMetric('job_failed', 1, { type: jobType });

      logger.error('Job processor failed', {
        jobType,
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    } finally {
      this.decrementProcessing(jobType);
    }
  }

  private startFallbackLoop(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }

    this.fallbackTimer = setInterval(() => {
      void this.processFallbackJobs();
    }, DEFAULT_OPTIONS.fallbackIntervalMs);
  }

  private async processFallbackJobs(): Promise<void> {
    if (this.processors.size === 0) {
      return;
    }

    for (const [jobId, jobRecord] of this.fallbackJobs.entries()) {
      if (this.processingFallbackJobs.has(jobId)) {
        continue;
      }

      const processor = this.processors.get(jobRecord.data.type);
      if (!processor) {
        continue;
      }

      this.processingFallbackJobs.add(jobId);

      const context: JobExecutionContext = {
        id: jobId,
        data: jobRecord.data,
        attemptsMade: jobRecord.attemptsMade,
        progress: () => undefined,
        createdAt: jobRecord.createdAt
      };

      const result = await this.executeProcessor(jobRecord.data.type, processor, context);

      if (result.success) {
        this.fallbackJobs.delete(jobId);
        this.processingFallbackJobs.delete(jobId);
      } else {
        this.processingFallbackJobs.delete(jobId);
        this.fallbackJobs.delete(jobId);
        logger.error('Fallback job removed after failure', {
          jobId,
          jobType: jobRecord.data.type,
          error: result.error
        });
      }
    }
  }

  private setupBullListeners(): void {
    if (!this.bullQueue) {
      return;
    }

    this.bullQueue.on('completed', job => {
      this.jobStats.completed++;
      this.recordMetric('bull_job_completed', 1, { type: job?.data?.type ?? 'unknown' });
    });

    this.bullQueue.on('failed', (job, err) => {
      this.jobStats.failed++;
      this.recordMetric('bull_job_failed', 1, { type: job?.data?.type ?? 'unknown' });

      logger.error('Bull job failed', {
        jobId: job?.id,
        jobType: job?.data?.type,
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    });

    this.bullQueue.on('error', error => {
      logger.error('Bull queue error', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  }

  private startSchedule(options: JobQueueAdapterOptions): void {
    const statsInterval = options.statsIntervalMs ?? DEFAULT_OPTIONS.statsIntervalMs;
    const cleanupInterval = options.cleanupIntervalMs ?? DEFAULT_OPTIONS.cleanupIntervalMs;
    const fallbackInterval = options.fallbackIntervalMs ?? DEFAULT_OPTIONS.fallbackIntervalMs;

    this.statsTimer = setInterval(async () => {
      try {
        const stats = await this.getJobStats();
        this.recordMetric('jobs_total', stats.total);
        this.recordMetric('jobs_active', stats.active);
        this.recordMetric('jobs_waiting', stats.waiting);
      } catch (error) {
        logger.error('Failed to collect job stats', {
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, statsInterval);

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error('Failed to cleanup jobs', {
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, cleanupInterval);

    this.fallbackTimer = setInterval(() => {
      void this.processFallbackJobs();
    }, fallbackInterval);
  }

  private incrementProcessing(jobType: string): void {
    this.jobStats.processing[jobType] = (this.jobStats.processing[jobType] ?? 0) + 1;
  }

  private decrementProcessing(jobType: string): void {
    if (!this.jobStats.processing[jobType]) {
      return;
    }
    this.jobStats.processing[jobType] = Math.max(0, this.jobStats.processing[jobType] - 1);
  }

  public setMetricsRecorder(recorder?: MetricsRecorder): void {
    this.metricsRecorder = recorder;
  }

  private recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.metricsRecorder) {
      return;
    }

    try {
      this.metricsRecorder.recordMetric({
        name,
        value,
        tags
      });
    } catch (error) {
      logger.warn('Failed to record resilience metric', {
        name,
        value,
        tags,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const jobQueueAdapter = new JobQueueAdapter();

