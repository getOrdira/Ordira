/**
 * Job Queue Adapter Service
 * 
 * Provides a Bull-based job queue with Redis backend.
 * Redis is REQUIRED - no fallback to in-memory processing.
 * 
 * This ensures:
 * - No data loss in multi-instance deployments
 * - Consistent job processing across instances
 * - Proper infrastructure setup
 */

import { logger } from '../../../../utils/logger';
import { getOpenTelemetryService } from '../../observability';
import { metrics, Counter, Histogram, Meter } from '@opentelemetry/api';
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
  isReady: () => Promise<void>;
}

interface JobQueueAdapterOptions {
  queueName?: string;
  metricsRecorder?: MetricsRecorder;
  statsIntervalMs?: number;
  cleanupIntervalMs?: number;
  defaultJobOptions?: Record<string, unknown>;
}

const DEFAULT_OPTIONS: Required<Pick<JobQueueAdapterOptions, 'statsIntervalMs' | 'cleanupIntervalMs'>> = {
  statsIntervalMs: 60_000,
  cleanupIntervalMs: 3_600_000
};

export class JobQueueAdapter {
  private bullQueue: BullQueue | null = null;
  private readonly processors = new Map<string, JobProcessor>();
  private readonly pendingProcessors: Array<{ jobType: string; processor: JobProcessor }> = [];
  private metricsRecorder?: MetricsRecorder;
  private readonly queueName: string;
  private readonly defaultJobOptions: Record<string, unknown>;

  // OpenTelemetry metrics
  private meter: Meter | null = null;
  private queueDepthCounter?: Counter;
  private processingRateCounter?: Counter;
  private failureRateCounter?: Counter;
  private processingTimeHistogram?: Histogram;

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
  private initialized = false;
  private isHealthy = false;

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

    // Initialize OpenTelemetry metrics
    this.initializeOpenTelemetryMetrics();

    // Initialize queue synchronously - fail fast if Redis is not available
    this.initializeQueue().catch(error => {
      logger.error('❌ Failed to initialize job queue adapter - Redis is required:', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Job queue initialization failed: Redis connection required. ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeOpenTelemetryMetrics(): void {
    try {
      const otelService = getOpenTelemetryService();
      if (otelService && otelService.isInitialized()) {
        this.meter = otelService.getMeter();
        
        if (this.meter) {
          this.queueDepthCounter = this.meter.createCounter('job_queue_depth_total', {
            description: 'Total number of jobs in queue'
          });
          this.processingRateCounter = this.meter.createCounter('job_queue_processing_rate_total', {
            description: 'Total number of jobs processed'
          });
          this.failureRateCounter = this.meter.createCounter('job_queue_failure_rate_total', {
            description: 'Total number of job failures'
          });
          this.processingTimeHistogram = this.meter.createHistogram('job_queue_processing_time_ms', {
            description: 'Job processing time in milliseconds'
          });
        }
      }
    } catch (error) {
      logger.warn('OpenTelemetry metrics not available for job queue', error);
    }
  }

  /**
   * Initialize Bull queue - REQUIRES Redis
   */
  private async initializeQueue(): Promise<void> {
    // Check Redis URL is configured
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required for job queue. No fallback available.');
    }

    try {
      // Dynamic import for optional bull dependency
      // @ts-ignore - bull is an optional dependency, types may not be available
      const BullModule = await import('bull');
      // Bull can be exported as default or named export
      const Bull = (BullModule.default || BullModule) as any;

      logger.info('🔧 Initializing Bull job queue adapter (Redis required)...', { queue: this.queueName });

      this.bullQueue = Bull(this.queueName, {
        redis: process.env.REDIS_URL,
        defaultJobOptions: this.defaultJobOptions
      }) as any;

      // Wait for queue to be ready
      await this.bullQueue.isReady();

      // Verify Redis connection by getting job counts
      await this.bullQueue.getJobCounts();

      this.setupBullListeners();
      this.registerPendingProcessors();
      this.initialized = true;
      this.isHealthy = true;

      logger.info('✅ Bull job queue adapter initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a missing module error
      if (errorMessage.includes('Cannot find module') && errorMessage.includes('bull')) {
        logger.warn('⚠️ Bull package not installed. Job queue functionality disabled. Install "bull" package to enable.', {
          queue: this.queueName,
          hint: 'Run: npm install bull'
        });
        this.initialized = false;
        this.isHealthy = false;
        return; // Don't throw - allow app to continue without job queue
      }
      
      logger.error('❌ Bull queue initialization failed - Redis connection required:', {
        message: errorMessage,
        redisUrl: process.env.REDIS_URL ? 'configured' : 'missing'
      });
      this.isHealthy = false;
      // Only throw if it's not a missing module error
      throw new Error(`Job queue initialization failed: ${errorMessage}. Redis connection is required.`);
    }
  }

  /**
   * Check if queue is healthy (Redis connection available)
   */
  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.bullQueue) {
      return { healthy: false, error: 'Queue not initialized' };
    }

    try {
      // Test Redis connection by getting job counts
      await this.bullQueue.getJobCounts();
      this.isHealthy = true;
      return { healthy: true };
    } catch (error) {
      this.isHealthy = false;
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get queue health status
   */
  isQueueHealthy(): boolean {
    return this.isHealthy && this.initialized;
  }

  /**
   * Check if queue is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  async addJob(jobData: JobData): Promise<string> {
    if (!this.bullQueue) {
      throw new Error('Job queue not initialized. Redis connection required.');
    }

    this.jobStats.total++;

    const job = await this.bullQueue.add(jobData.type, jobData, {
      priority: jobData.priority ?? 0,
      delay: jobData.delay ?? 0,
      attempts: jobData.attempts ?? this.defaultJobOptions.attempts,
      ...this.defaultJobOptions
    });

    this.recordMetric('job_added', 1, { type: jobData.type });
    return String(job.id);
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
    if (!this.bullQueue) {
      throw new Error('Job queue not initialized. Redis connection required.');
    }

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

  async getQueueStatus(): Promise<Record<string, number>> {
    if (!this.bullQueue) {
      throw new Error('Job queue not initialized. Redis connection required.');
    }

    return this.bullQueue.getJobCounts();
  }

  async getJobs(types: string[] = ['active', 'waiting', 'failed']): Promise<Array<JobData & { id: string }>> {
    if (!this.bullQueue) {
      throw new Error('Job queue not initialized. Redis connection required.');
    }

    const jobs = await this.bullQueue.getJobs(types, 0, 50);
    return jobs.map(job => ({
      ...job.data,
      id: String(job.id ?? '')
    }));
  }

  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.bullQueue) {
      throw new Error('Job queue not initialized. Redis connection required.');
    }

    const cleaned = await this.bullQueue.clean(maxAgeMs, 'completed');
    this.recordMetric('jobs_cleaned', cleaned.length);
    return cleaned.length;
  }

  async shutdown(): Promise<void> {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.bullQueue) {
      await this.bullQueue.close();
    }

    this.isHealthy = false;
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
      
      // Record OpenTelemetry metrics
      this.processingRateCounter?.add(1, { type: jobType });
      this.processingTimeHistogram?.record(duration, { type: jobType });

      return {
        success: true,
        data,
        duration
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.jobStats.failed++;
      this.recordMetric('job_failed', 1, { type: jobType });
      
      // Record OpenTelemetry metrics
      this.failureRateCounter?.add(1, { type: jobType });
      this.processingTimeHistogram?.record(duration, { type: jobType, status: 'failed' });

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
      this.isHealthy = false;
    });

    this.bullQueue.on('ready', () => {
      logger.info('Bull queue ready');
      this.isHealthy = true;
    });
  }

  private startSchedule(options: JobQueueAdapterOptions): void {
    const statsInterval = options.statsIntervalMs ?? DEFAULT_OPTIONS.statsIntervalMs;
    const cleanupInterval = options.cleanupIntervalMs ?? DEFAULT_OPTIONS.cleanupIntervalMs;

    this.statsTimer = setInterval(async () => {
      try {
        const stats = await this.getJobStats();
        this.recordMetric('jobs_total', stats.total);
        this.recordMetric('jobs_active', stats.active);
        this.recordMetric('jobs_waiting', stats.waiting);
        
        // Record OpenTelemetry metrics
        this.queueDepthCounter?.add(stats.waiting, { status: 'waiting' });
        this.queueDepthCounter?.add(stats.active, { status: 'active' });
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

// Export singleton instance - will fail fast if Redis is not available
export const jobQueueAdapter = new JobQueueAdapter();
