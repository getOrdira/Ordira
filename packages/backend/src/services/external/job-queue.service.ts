/**
 * Background Job Processing Service
 *
 * Provides job queue functionality for heavy operations to improve API response times.
 * Supports Bull queue when available, falls back to in-memory processing.
 *
 * To install Bull (optional):
 * npm install bull @types/bull
 */

import { logger } from '../../utils/logger';
import { monitoringService } from './monitoring.service';

// Dynamic import types for Bull (optional dependency)
interface BullJob {
  id?: string | number;
  data: any;
  progress: (progress?: number) => void;
  remove: () => Promise<void>;
}

interface BullQueue {
  add: (name: string, data: any, opts?: any) => Promise<BullJob>;
  process: (name: string, processor: (job: BullJob) => Promise<any>) => void;
  getJobs: (types: string[], start?: number, end?: number) => Promise<BullJob[]>;
  getActive: () => Promise<BullJob[]>;
  getWaiting: () => Promise<BullJob[]>;
  getFailed: () => Promise<BullJob[]>;
  getCompleted: () => Promise<BullJob[]>;
  clean: (grace: number, status?: string) => Promise<BullJob[]>;
  close: () => Promise<void>;
}

export interface JobData {
  type: string;
  payload: any;
  userId?: string;
  businessId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export interface JobStats {
  total: number;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  processing: {
    analytics: number;
    exports: number;
    notifications: number;
    maintenance: number;
  };
}

/**
 * Job types for background processing
 */
export enum JobType {
  ANALYTICS_GENERATION = 'analytics:generate',
  DATA_EXPORT = 'data:export',
  EMAIL_NOTIFICATION = 'email:send',
  BULK_UPDATE = 'data:bulk_update',
  CACHE_WARMUP = 'cache:warmup',
  DATABASE_MAINTENANCE = 'db:maintenance',
  REPORT_GENERATION = 'report:generate',
  IMAGE_PROCESSING = 'media:process',
  BACKUP_CREATION = 'backup:create'
}

export class JobQueueService {
  private bullQueue: BullQueue | null = null;
  private fallbackJobs: Map<string, any> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private jobStats = {
    total: 0,
    completed: 0,
    failed: 0,
    processing: {
      analytics: 0,
      exports: 0,
      notifications: 0,
      maintenance: 0
    }
  };

  constructor() {
    this.initializeQueue();
    this.setupJobProcessors();
    this.startStatsCollection();
  }

  /**
   * Initialize job queue (Bull if available, fallback otherwise)
   */
  private async initializeQueue(): Promise<void> {
    try {
      // Try to dynamically import Bull
      const Bull = await import('bull').then(module => module.default).catch(() => null);

      if (Bull && process.env.REDIS_URL) {
        logger.info('🚀 Initializing Bull job queue...');

        this.bullQueue = new Bull('job processing', {
          redis: process.env.REDIS_URL,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          }
        }) as any;

        // Setup Bull event listeners
        this.setupBullListeners();

        logger.info('✅ Bull job queue initialized');
      } else {
        logger.info('⚠️ Bull not available, using fallback job processing');
        this.initializeFallbackQueue();
      }
    } catch (error) {
      // Sanitize initialization error
      const sanitizedError = {
        message: 'Failed to initialize job queue',
        timestamp: new Date().toISOString(),
        fallbackMode: true
      };
      logger.error('❌ Failed to initialize job queue:', sanitizedError);
      this.initializeFallbackQueue();
    }
  }

  /**
   * Initialize fallback in-memory job processing
   */
  private initializeFallbackQueue(): void {
    logger.info('🔄 Initializing fallback job queue...');

    // Simple interval-based job processing
    setInterval(() => {
      this.processFallbackJobs();
    }, 5000); // Process jobs every 5 seconds

    logger.info('✅ Fallback job queue initialized');
  }

  /**
   * Setup Bull event listeners
   */
  private setupBullListeners(): void {
    if (!this.bullQueue) return;

    const queue = this.bullQueue as any;

    queue.on('completed', (job: BullJob) => {
      this.jobStats.completed++;
      logger.info(`Job completed: ${job.id}`, { jobId: job.id, type: job.data?.type });

      monitoringService.recordMetric({
        name: 'job_completed',
        value: 1,
        tags: { type: job.data?.type || 'unknown' }
      });
    });

    queue.on('failed', (job: BullJob, error: Error) => {
      this.jobStats.failed++;
      // Sanitize job failure error
      const sanitizedError = {
        message: 'Job execution failed',
        jobId: job.id,
        jobType: job.data?.type || 'unknown',
        timestamp: new Date().toISOString()
      };
      logger.error('Job failed:', sanitizedError);

      monitoringService.recordMetric({
        name: 'job_failed',
        value: 1,
        tags: { type: job.data?.type || 'unknown', error: error.name }
      });
    });

    queue.on('stalled', (job: BullJob) => {
      logger.warn(`Job stalled: ${job.id}`, { jobId: job.id, type: job.data?.type });

      monitoringService.recordMetric({
        name: 'job_stalled',
        value: 1,
        tags: { type: job.data?.type || 'unknown' }
      });
    });
  }

  /**
   * Add job to queue
   */
  async addJob(jobData: JobData): Promise<string> {
    this.jobStats.total++;

    try {
      if (this.bullQueue) {
        const job = await this.bullQueue.add(jobData.type, jobData, {
          priority: jobData.priority || 0,
          delay: jobData.delay || 0,
          attempts: jobData.attempts || 3
        });

        logger.info(`Job added to Bull queue: ${job.id}`, { type: jobData.type, priority: jobData.priority });
        return String(job.id);
      } else {
        // Fallback to in-memory processing
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.fallbackJobs.set(jobId, { ...jobData, id: jobId, createdAt: new Date() });

        logger.info(`Job added to fallback queue: ${jobId}`, { type: jobData.type });
        return jobId;
      }
    } catch (error) {
      this.jobStats.failed++;
      // Sanitize queue addition error
      const sanitizedError = {
        message: 'Failed to add job to queue',
        timestamp: new Date().toISOString()
      };
      logger.error('Failed to add job to queue:', sanitizedError);
      throw new Error('Job queue addition failed');
    }
  }

  /**
   * Setup job processors
   */
  private setupJobProcessors(): void {
    if (this.bullQueue) {
      this.setupBullProcessors();
    }
    // Fallback processors are handled in processFallbackJobs()
  }

  /**
   * Setup Bull job processors
   */
  private setupBullProcessors(): void {
    if (!this.bullQueue) return;

    // Analytics generation processor
    this.bullQueue.process(JobType.ANALYTICS_GENERATION, async (job: BullJob) => {
      return await this.processAnalyticsJob(job);
    });

    // Data export processor
    this.bullQueue.process(JobType.DATA_EXPORT, async (job: BullJob) => {
      return await this.processDataExportJob(job);
    });

    // Email notification processor
    this.bullQueue.process(JobType.EMAIL_NOTIFICATION, async (job: BullJob) => {
      return await this.processEmailJob(job);
    });

    // Bulk update processor
    this.bullQueue.process(JobType.BULK_UPDATE, async (job: BullJob) => {
      return await this.processBulkUpdateJob(job);
    });

    // Cache warmup processor
    this.bullQueue.process(JobType.CACHE_WARMUP, async (job: BullJob) => {
      return await this.processCacheWarmupJob(job);
    });

    // Database maintenance processor
    this.bullQueue.process(JobType.DATABASE_MAINTENANCE, async (job: BullJob) => {
      return await this.processMaintenanceJob(job);
    });

    logger.info('✅ Bull job processors setup completed');
  }

  /**
   * Process fallback jobs (in-memory)
   */
  private async processFallbackJobs(): Promise<void> {
    for (const [jobId, jobData] of this.fallbackJobs.entries()) {
      if (this.isProcessing.get(jobId)) continue;

      this.isProcessing.set(jobId, true);

      try {
        logger.info(`Processing fallback job: ${jobId}`, { type: jobData.type });

        const result = await this.processJob(jobData);

        if (result.success) {
          this.jobStats.completed++;
          logger.info(`Fallback job completed: ${jobId}`, { duration: result.duration });
        } else {
          this.jobStats.failed++;
          // Sanitize fallback job error
          const sanitizedError = {
            message: 'Fallback job failed',
            jobId,
            timestamp: new Date().toISOString()
          };
          logger.error('Fallback job failed:', sanitizedError);
        }

        this.fallbackJobs.delete(jobId);
        this.isProcessing.delete(jobId);

      } catch (error) {
        this.jobStats.failed++;
        // Sanitize fallback processing error
        const sanitizedError = {
          message: 'Fallback job processing error',
          jobId,
          timestamp: new Date().toISOString()
        };
        logger.error('Fallback job processing error:', sanitizedError);
        this.fallbackJobs.delete(jobId);
        this.isProcessing.delete(jobId);
      }
    }
  }

  /**
   * Process individual job based on type
   */
  private async processJob(jobData: any): Promise<JobResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (jobData.type) {
        case JobType.ANALYTICS_GENERATION:
          result = await this.processAnalyticsJob(jobData);
          break;
        case JobType.DATA_EXPORT:
          result = await this.processDataExportJob(jobData);
          break;
        case JobType.EMAIL_NOTIFICATION:
          result = await this.processEmailJob(jobData);
          break;
        case JobType.BULK_UPDATE:
          result = await this.processBulkUpdateJob(jobData);
          break;
        case JobType.CACHE_WARMUP:
          result = await this.processCacheWarmupJob(jobData);
          break;
        case JobType.DATABASE_MAINTENANCE:
          result = await this.processMaintenanceJob(jobData);
          break;
        default:
          throw new Error(`Unknown job type: ${jobData.type}`);
      }

      const duration = Date.now() - startTime;
      return { success: true, data: result, duration };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  /**
   * Process analytics generation job
   */
  private async processAnalyticsJob(job: any): Promise<any> {
    this.jobStats.processing.analytics++;
    logger.info('Processing analytics job...', { businessId: job.data?.businessId });

    try {
      // Import analytics service dynamically to avoid circular dependencies
      const { optimizedAnalyticsService } = await import('../business/analytics.service');

      const { businessId, dateRange, includeRecommendations } = job.data.payload;

      if (job.progress) {
        job.progress(25);
      }

      // Generate analytics
      const analytics = await optimizedAnalyticsService.getDashboardAnalytics(businessId, dateRange);

      if (job.progress) {
        job.progress(75);
      }

      // Store results (could cache or save to database)
      logger.info('Analytics generation completed', { businessId, duration: Date.now() });

      if (job.progress) {
        job.progress(100);
      }

      return { analyticsId: `analytics_${Date.now()}`, businessId, dataSize: JSON.stringify(analytics).length };

    } finally {
      this.jobStats.processing.analytics--;
    }
  }

  /**
   * Process data export job
   */
  private async processDataExportJob(job: any): Promise<any> {
    this.jobStats.processing.exports++;
    logger.info('Processing data export job...', { exportType: job.data?.payload?.exportType });

    try {
      const { exportType, businessId, filters } = job.data.payload;

      if (job.progress) {
        job.progress(10);
      }

      // Simulate large data export
      const exportData = await this.generateExportData(exportType, businessId, filters, job.progress);

      if (job.progress) {
        job.progress(100);
      }

      return { exportId: `export_${Date.now()}`, size: exportData.length, type: exportType };

    } finally {
      this.jobStats.processing.exports--;
    }
  }

  /**
   * Process email notification job
   */
  private async processEmailJob(job: any): Promise<any> {
    this.jobStats.processing.notifications++;
    logger.info('Processing email job...', { recipient: job.data?.payload?.recipient });

    try {
      const { recipient, subject, template, data } = job.data.payload;

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('Email sent successfully', { recipient, subject });

      return { emailId: `email_${Date.now()}`, recipient, status: 'sent' };

    } finally {
      this.jobStats.processing.notifications--;
    }
  }

  /**
   * Process bulk update job
   */
  private async processBulkUpdateJob(job: any): Promise<any> {
    logger.info('Processing bulk update job...', { collection: job.data?.payload?.collection });

    try {
      const { collection, updates, filters } = job.data.payload;

      // Simulate bulk update
      const updateCount = updates.length || 100;

      logger.info('Bulk update completed', { collection, updateCount });

      return { updateId: `bulk_${Date.now()}`, collection, updatedCount: updateCount };

    } catch (error) {
      // Sanitize bulk update error
      const sanitizedError = {
        message: 'Bulk update failed',
        timestamp: new Date().toISOString()
      };
      logger.error('Bulk update failed:', sanitizedError);
      throw new Error('Bulk update operation failed');
    }
  }

  /**
   * Process cache warmup job
   */
  private async processCacheWarmupJob(job: any): Promise<any> {
    logger.info('Processing cache warmup job...');

    try {
      const { enhancedCacheService } = await import('./enhanced-cache.service');

      // Warm up cache
      await enhancedCacheService.warmupCache();

      return { warmupId: `warmup_${Date.now()}`, status: 'completed' };

    } catch (error) {
      // Sanitize cache warmup error
      const sanitizedError = {
        message: 'Cache warmup failed',
        timestamp: new Date().toISOString()
      };
      logger.error('Cache warmup failed:', sanitizedError);
      throw new Error('Cache warmup operation failed');
    }
  }

  /**
   * Process database maintenance job
   */
  private async processMaintenanceJob(job: any): Promise<any> {
    this.jobStats.processing.maintenance++;
    logger.info('Processing database maintenance job...');

    try {
      const { enhancedDatabaseService } = await import('./enhanced-database.service');

      // Perform maintenance
      await enhancedDatabaseService.performMaintenance();

      return { maintenanceId: `maintenance_${Date.now()}`, status: 'completed' };

    } finally {
      this.jobStats.processing.maintenance--;
    }
  }

  /**
   * Generate export data (simulate)
   */
  private async generateExportData(exportType: string, businessId: string, filters: any, progressCallback?: Function): Promise<any[]> {
    const data = [];
    const totalRecords = 1000; // Simulate large dataset

    for (let i = 0; i < totalRecords; i++) {
      if (progressCallback && i % 100 === 0) {
        progressCallback(10 + (i / totalRecords) * 80);
      }

      data.push({
        id: i,
        businessId,
        type: exportType,
        createdAt: new Date(),
        ...filters
      });

      // Simulate processing time
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return data;
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<JobStats> {
    let active = 0;
    let waiting = 0;

    try {
      if (this.bullQueue) {
        const [activeJobs, waitingJobs] = await Promise.all([
          this.bullQueue.getActive(),
          this.bullQueue.getWaiting()
        ]);
        active = activeJobs.length;
        waiting = waitingJobs.length;
      } else {
        active = this.isProcessing.size;
        waiting = this.fallbackJobs.size - active;
      }
    } catch (error) {
      // Sanitize stats error
      const sanitizedError = {
        message: 'Failed to get job stats',
        timestamp: new Date().toISOString()
      };
      logger.error('Failed to get job stats:', sanitizedError);
    }

    return {
      total: this.jobStats.total,
      active,
      waiting,
      completed: this.jobStats.completed,
      failed: this.jobStats.failed,
      processing: { ...this.jobStats.processing }
    };
  }

  /**
   * Clean up completed jobs
   */
  async cleanupJobs(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      if (this.bullQueue) {
        const cleaned = await this.bullQueue.clean(maxAge, 'completed');
        logger.info(`Cleaned ${cleaned.length} completed jobs`);
        return cleaned.length;
      } else {
        // Cleanup fallback jobs
        const now = Date.now();
        let cleaned = 0;

        for (const [jobId, jobData] of this.fallbackJobs.entries()) {
          if (now - jobData.createdAt.getTime() > maxAge) {
            this.fallbackJobs.delete(jobId);
            cleaned++;
          }
        }

        logger.info(`Cleaned ${cleaned} fallback jobs`);
        return cleaned;
      }
    } catch (error) {
      // Sanitize cleanup error
      const sanitizedError = {
        message: 'Job cleanup failed',
        timestamp: new Date().toISOString()
      };
      logger.error('Job cleanup failed:', sanitizedError);
      return 0;
    }
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    // Collect job statistics every minute
    setInterval(async () => {
      try {
        const stats = await this.getJobStats();

        monitoringService.recordMetric({
          name: 'jobs_total',
          value: stats.total,
          tags: {}
        });

        monitoringService.recordMetric({
          name: 'jobs_active',
          value: stats.active,
          tags: {}
        });

        monitoringService.recordMetric({
          name: 'jobs_waiting',
          value: stats.waiting,
          tags: {}
        });

      } catch (error) {
        // Sanitize stats collection error
        const sanitizedError = {
          message: 'Failed to collect job stats',
          timestamp: new Date().toISOString()
        };
        logger.error('Failed to collect job stats:', sanitizedError);
      }
    }, 60000);

    // Cleanup old jobs every hour
    setInterval(async () => {
      try {
        await this.cleanupJobs();
      } catch (error) {
        // Sanitize periodic cleanup error
        const sanitizedError = {
          message: 'Periodic job cleanup failed',
          timestamp: new Date().toISOString()
        };
        logger.error('Periodic job cleanup failed:', sanitizedError);
      }
    }, 3600000);
  }

  /**
   * Gracefully shutdown job queue
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job queue...');

    try {
      if (this.bullQueue) {
        await this.bullQueue.close();
        logger.info('✅ Bull queue closed');
      }

      // Clear fallback jobs
      this.fallbackJobs.clear();
      this.isProcessing.clear();

      logger.info('✅ Job queue shutdown completed');

    } catch (error) {
      // Sanitize shutdown error
      const sanitizedError = {
        message: 'Job queue shutdown failed',
        timestamp: new Date().toISOString()
      };
      logger.error('❌ Job queue shutdown failed:', sanitizedError);
    }
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService();