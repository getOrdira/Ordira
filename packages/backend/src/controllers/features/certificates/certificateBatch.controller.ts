// src/controllers/features/certificates/certificateBatch.controller.ts
// Certificate batch controller using modular certificate services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { batchService } from '../../../services/certificates/features/batch.service';

/**
 * Certificate batch request interfaces
 */
interface CreateBatchJobRequest extends BaseRequest {
  validatedBody: {
    productId: string;
    recipients: Array<{
      address: string;
      contactMethod: 'email' | 'sms' | 'wallet';
      customData?: any;
      certificateImage?: Express.Multer.File;
    }>;
    batchOptions?: {
      delayBetweenCerts?: number;
      maxConcurrent?: number;
      continueOnError?: boolean;
      batchTransfer?: boolean;
      transferBatchSize?: number;
      gasOptimization?: boolean;
    };
    planLevel?: string;
    hasWeb3?: boolean;
    shouldAutoTransfer?: boolean;
    transferSettings?: any;
    jobMetadata?: {
      webhookUrl?: string;
      description?: string;
    };
  };
}

interface GetBatchProgressRequest extends BaseRequest {
  validatedParams: {
    batchId: string;
  };
}

interface CancelBatchJobRequest extends BaseRequest {
  validatedParams: {
    batchId: string;
  };
}

interface RetryFailedBatchItemsRequest extends BaseRequest {
  validatedParams: {
    batchId: string;
  };
}

interface GetBatchLimitsRequest extends BaseRequest {
  validatedQuery: {
    plan: string;
  };
}

interface CalculateBatchDurationRequest extends BaseRequest {
  validatedBody: {
    recipientCount: number;
    batchOptions?: {
      delayBetweenCerts?: number;
      maxConcurrent?: number;
    };
    hasWeb3: boolean;
  };
}

/**
 * Certificate batch controller
 */
export class CertificateBatchController extends BaseController {
  private batchService = batchService;

  /**
   * POST /api/certificates/batch/create-job
   * Create batch certificate job with S3 support
   */
  async createBatchCertificateJob(req: CreateBatchJobRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CREATE_BATCH_CERTIFICATE_JOB');

        const batchData = {
          ...req.validatedBody,
          initiatedBy: req.userId
        };

        const result = await this.batchService.createBatchCertificateJob(req.businessId!, batchData);

        this.logAction(req, 'CREATE_BATCH_CERTIFICATE_JOB_SUCCESS', {
          businessId: req.businessId,
          batchId: result.id,
          recipientCount: req.validatedBody.recipients.length,
          estimatedCompletion: result.estimatedCompletion
        });

        return { result };
      });
    }, res, 'Batch certificate job created successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/:batchId/progress
   * Get batch processing progress
   */
  async getBatchProgress(req: GetBatchProgressRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BATCH_PROGRESS');

        const progress = await this.batchService.getBatchProgress(
          req.businessId!,
          req.validatedParams.batchId
        );

        if (!progress) {
          throw new Error('Batch job not found or access denied');
        }

        this.logAction(req, 'GET_BATCH_PROGRESS_SUCCESS', {
          businessId: req.businessId,
          batchId: req.validatedParams.batchId,
          status: progress.status,
          processed: progress.processed,
          total: progress.total
        });

        return { progress };
      });
    }, res, 'Batch progress retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/certificates/batch/:batchId/cancel
   * Cancel batch job
   */
  async cancelBatchJob(req: CancelBatchJobRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CANCEL_BATCH_JOB');

        const result = await this.batchService.cancelBatchJob(
          req.businessId!,
          req.validatedParams.batchId
        );

        this.logAction(req, 'CANCEL_BATCH_JOB_SUCCESS', {
          businessId: req.businessId,
          batchId: req.validatedParams.batchId,
          success: result.success
        });

        return { result };
      });
    }, res, 'Batch job cancelled successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/batch/:batchId/retry-failed
   * Retry failed batch items
   */
  async retryFailedBatchItems(req: RetryFailedBatchItemsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'RETRY_FAILED_BATCH_ITEMS');

        const result = await this.batchService.retryFailedBatchItems(
          req.businessId!,
          req.validatedParams.batchId
        );

        this.logAction(req, 'RETRY_FAILED_BATCH_ITEMS_SUCCESS', {
          businessId: req.businessId,
          batchId: req.validatedParams.batchId,
          retried: result.retried,
          successful: result.successful,
          failed: result.failed
        });

        return { result };
      });
    }, res, 'Failed batch items retry initiated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/active-jobs
   * Get active batch jobs for business
   */
  async getActiveBatchJobs(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_ACTIVE_BATCH_JOBS');

        const activeJobs = await this.batchService.getActiveBatchJobs(req.businessId!);

        this.logAction(req, 'GET_ACTIVE_BATCH_JOBS_SUCCESS', {
          businessId: req.businessId,
          jobCount: activeJobs.length
        });

        return { activeJobs };
      });
    }, res, 'Active batch jobs retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/statistics
   * Get batch job statistics
   */
  async getBatchJobStatistics(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BATCH_JOB_STATISTICS');

        const statistics = await this.batchService.getBatchJobStatistics(req.businessId!);

        this.logAction(req, 'GET_BATCH_JOB_STATISTICS_SUCCESS', {
          businessId: req.businessId,
          totalJobs: statistics.totalJobs,
          successRate: statistics.successRate
        });

        return { statistics };
      });
    }, res, 'Batch job statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/limits
   * Get batch limits for plan
   */
  async getBatchLimits(req: GetBatchLimitsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BATCH_LIMITS');

        const limits = this.batchService.getBatchLimits(req.validatedQuery.plan);

        this.logAction(req, 'GET_BATCH_LIMITS_SUCCESS', {
          businessId: req.businessId,
          plan: req.validatedQuery.plan,
          maxBatchSize: limits.maxBatchSize,
          maxConcurrent: limits.maxConcurrent
        });

        return { limits };
      });
    }, res, 'Batch limits retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/certificates/batch/calculate-duration
   * Calculate batch duration
   */
  async calculateBatchDuration(req: CalculateBatchDurationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_BATCH_DURATION');

        const duration = this.batchService.calculateBatchDuration(
          req.validatedBody.recipientCount,
          req.validatedBody.batchOptions,
          req.validatedBody.hasWeb3
        );

        this.logAction(req, 'CALCULATE_BATCH_DURATION_SUCCESS', {
          businessId: req.businessId,
          recipientCount: req.validatedBody.recipientCount,
          durationSeconds: duration
        });

        return { durationSeconds: duration };
      });
    }, res, 'Batch duration calculated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/certificates/batch/priority
   * Determine batch priority
   */
  async determineBatchPriority(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const plan = req.query.plan as string || 'foundation';

        this.recordPerformance(req, 'DETERMINE_BATCH_PRIORITY');

        const priority = this.batchService.determineBatchPriority(plan);

        this.logAction(req, 'DETERMINE_BATCH_PRIORITY_SUCCESS', {
          businessId: req.businessId,
          plan,
          priority
        });

        return { priority };
      });
    }, res, 'Batch priority determined successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const certificateBatchController = new CertificateBatchController();
