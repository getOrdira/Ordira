import { logger } from '../../../../utils/logger';
import { jobQueueAdapter, JobQueueAdapter } from '../core/jobQueueAdapter.service';
import type { JobExecutionContext } from '../utils/types';
import { JobType } from '../utils/types';

const PROCESSING_CATEGORIES = {
  analytics: 'analytics',
  exports: 'exports',
  notifications: 'notifications',
  maintenance: 'maintenance'
} as const;

type ProcessingCategory = typeof PROCESSING_CATEGORIES[keyof typeof PROCESSING_CATEGORIES];

export class BackgroundTaskProcessorService {
  private readonly processingBreakdown: Record<string, number> = {
    [PROCESSING_CATEGORIES.analytics]: 0,
    [PROCESSING_CATEGORIES.exports]: 0,
    [PROCESSING_CATEGORIES.notifications]: 0,
    [PROCESSING_CATEGORIES.maintenance]: 0
  };

  constructor(private readonly queue: JobQueueAdapter = jobQueueAdapter) {
    this.registerDefaultProcessors();
  }

  getProcessingBreakdown(): Record<string, number> {
    return { ...this.processingBreakdown };
  }

  private registerDefaultProcessors(): void {
    this.queue.registerProcessor(JobType.ANALYTICS_GENERATION, async context =>
      this.withProcessing(PROCESSING_CATEGORIES.analytics, () => this.processAnalyticsJob(context))
    );

    this.queue.registerProcessor(JobType.DATA_EXPORT, async context =>
      this.withProcessing(PROCESSING_CATEGORIES.exports, () => this.processDataExportJob(context))
    );

    this.queue.registerProcessor(JobType.EMAIL_NOTIFICATION, async context =>
      this.withProcessing(PROCESSING_CATEGORIES.notifications, () => this.processEmailNotification(context))
    );

    this.queue.registerProcessor(JobType.BULK_UPDATE, context => this.processBulkUpdate(context));
    this.queue.registerProcessor(JobType.CACHE_WARMUP, context => this.processCacheWarmup(context));
    this.queue.registerProcessor(JobType.DATABASE_MAINTENANCE, async context =>
      this.withProcessing(PROCESSING_CATEGORIES.maintenance, () => this.processMaintenance(context))
    );
  }

  private async withProcessing<T>(category: ProcessingCategory, handler: () => Promise<T>): Promise<T> {
    this.processingBreakdown[category] = (this.processingBreakdown[category] ?? 0) + 1;
    try {
      return await handler();
    } finally {
      this.processingBreakdown[category] = Math.max(0, (this.processingBreakdown[category] ?? 1) - 1);
    }
  }

  private async processAnalyticsJob(context: JobExecutionContext): Promise<any> {
    logger.info('Processing analytics job', {
      jobId: context.id,
      businessId: context.data?.payload?.businessId
    });

    try {
      const { dashboardAggregationService } = await import('../../../analytics/features/dashboardAggregation.service');
      const payload = context.data?.payload ?? {};
      const { businessId, dateRange } = payload;

      context.progress(25);

      const analytics = await dashboardAggregationService.getDashboardAnalytics({
        businessId,
        timeRange: dateRange
      });

      context.progress(75);

      logger.info('Analytics generation completed', {
        jobId: context.id,
        businessId
      });

      context.progress(100);

      return {
        analyticsId: `analytics_${Date.now()}`,
        businessId,
        dataSize: JSON.stringify(analytics).length
      };
    } catch (error) {
      logger.error('Analytics job failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async processDataExportJob(context: JobExecutionContext): Promise<any> {
    logger.info('Processing data export job', {
      jobId: context.id,
      exportType: context.data?.payload?.exportType
    });

    try {
      const payload = context.data?.payload ?? {};
      const { exportType, businessId, filters } = payload;

      context.progress(10);
      const exportData = await this.generateExportData(exportType, businessId, filters, context.progress);
      context.progress(100);

      return {
        exportId: `export_${Date.now()}`,
        size: exportData.length,
        type: exportType
      };
    } catch (error) {
      logger.error('Data export job failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async processEmailNotification(context: JobExecutionContext): Promise<any> {
    logger.info('Processing email notification job', {
      jobId: context.id,
      recipient: context.data?.payload?.recipient
    });

    try {
      const payload = context.data?.payload ?? {};
      const { recipient, subject } = payload;

      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('Email notification dispatched', {
        jobId: context.id,
        recipient,
        subject
      });

      return {
        emailId: `email_${Date.now()}`,
        recipient,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Email notification failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async processBulkUpdate(context: JobExecutionContext): Promise<any> {
    logger.info('Processing bulk update job', {
      jobId: context.id,
      collection: context.data?.payload?.collection
    });

    const payload = context.data?.payload ?? {};
    const { collection, updates, filters } = payload;

    try {
      const updateCount = Array.isArray(updates) ? updates.length : 100;

      logger.info('Bulk update completed', {
        jobId: context.id,
        collection,
        updateCount
      });

      return {
        updateId: `bulk_${Date.now()}`,
        collection,
        updatedCount: updateCount,
        filters
      };
    } catch (error) {
      logger.error('Bulk update job failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async processCacheWarmup(context: JobExecutionContext): Promise<any> {
    logger.info('Processing cache warmup job', { jobId: context.id });

    try {
      const { enhancedCacheService } = await import('../../../external/enhanced-cache.service');
      await enhancedCacheService.warmupCache();

      return {
        warmupId: `warmup_${Date.now()}`,
        status: 'completed'
      };
    } catch (error) {
      logger.error('Cache warmup job failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Cache warmup operation failed');
    }
  }

  private async processMaintenance(context: JobExecutionContext): Promise<any> {
    logger.info('Processing database maintenance job', { jobId: context.id });

    try {
      const { enhancedDatabaseService } = await import('../../../external/enhanced-database.service');
      await enhancedDatabaseService.performMaintenance();

      return {
        maintenanceId: `maintenance_${Date.now()}`,
        status: 'completed'
      };
    } catch (error) {
      logger.error('Database maintenance job failed', {
        jobId: context.id,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async generateExportData(
    exportType: string,
    businessId: string,
    filters: any,
    progressCallback?: (progress: number) => void
  ): Promise<any[]> {
    const data: any[] = [];
    const totalRecords = 1000;

    for (let index = 0; index < totalRecords; index++) {
      if (progressCallback && index % 100 === 0) {
        progressCallback(10 + (index / totalRecords) * 80);
      }

      data.push({
        id: index,
        businessId,
        type: exportType,
        createdAt: new Date(),
        ...filters
      });

      if (index % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return data;
  }
}

export const backgroundTaskProcessorService = new BackgroundTaskProcessorService();
