// src/lib/api/features/certificates/certificateBatch.api.ts
// Certificate batch API aligned with backend routes/features/certificates/certificateBatch.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BatchCreateInput,
  BatchJobResult,
  BatchProgress,
} from '@backend/services/certificates/features/batch.service';
import {
  sanitizeBoolean,
  sanitizeContactMethod,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizePositiveInteger,
  sanitizeQuery,
  sanitizeRecipientByContactMethod,
  sanitizeString,
} from './utils';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/certificates/batch';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createBatchLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'certificates',
  module: 'batch',
  method,
  endpoint,
  ...context,
});

export interface BatchCreateJobPayload extends BatchCreateInput {
  planLevel?: string;
  hasWeb3?: boolean;
  shouldAutoTransfer?: boolean;
  transferSettings?: Record<string, unknown>;
  jobMetadata?: {
    webhookUrl?: string;
    description?: string;
  };
}

export interface CalculateDurationPayload {
  recipientCount: number;
  batchOptions?: {
    delayBetweenCerts?: number;
    maxConcurrent?: number;
  };
  hasWeb3: boolean;
}

const sanitizeRecipients = (recipients: BatchCreateJobPayload['recipients']): BatchCreateJobPayload['recipients'] => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('recipients must be a non-empty array');
  }

  if (recipients.length > 500) {
    throw new Error('recipients cannot exceed 500 items per batch');
  }

  return recipients.map((recipient, index) => {
    const contactMethod = sanitizeContactMethod(recipient.contactMethod);
    return {
      address: sanitizeRecipientByContactMethod(recipient.address, contactMethod),
      contactMethod,
      customData: recipient.customData,
      certificateImage: recipient.certificateImage,
    };
  });
};

const sanitizeBatchOptions = (options?: BatchCreateJobPayload['batchOptions']) => {
  if (!options) {
    return undefined;
  }

  return sanitizeQuery({
    delayBetweenCerts: options.delayBetweenCerts !== undefined
      ? sanitizePositiveInteger(options.delayBetweenCerts, { fieldName: 'delayBetweenCerts', min: 0, max: 600 })
      : undefined,
    maxConcurrent: options.maxConcurrent !== undefined
      ? sanitizePositiveInteger(options.maxConcurrent, { fieldName: 'maxConcurrent', min: 1, max: 100 })
      : undefined,
    continueOnError: options.continueOnError !== undefined ? sanitizeBoolean(options.continueOnError, 'continueOnError') : undefined,
    batchTransfer: options.batchTransfer !== undefined ? sanitizeBoolean(options.batchTransfer, 'batchTransfer') : undefined,
    transferBatchSize: options.transferBatchSize !== undefined
      ? sanitizePositiveInteger(options.transferBatchSize, { fieldName: 'transferBatchSize', min: 1, max: 500 })
      : undefined,
    gasOptimization: options.gasOptimization !== undefined ? sanitizeBoolean(options.gasOptimization, 'gasOptimization') : undefined,
  });
};

const sanitizeCreateBatchPayload = (payload: BatchCreateJobPayload): BatchCreateJobPayload => {
  const productId = sanitizeObjectId(payload.productId, 'productId');
  const recipients = sanitizeRecipients(payload.recipients);
  const batchOptions = sanitizeBatchOptions(payload.batchOptions);
  const planLevel = payload.planLevel ? sanitizeString(payload.planLevel, { fieldName: 'planLevel', maxLength: 50 }) : undefined;
  const jobMetadata = payload.jobMetadata
    ? sanitizeQuery({
        webhookUrl: payload.jobMetadata.webhookUrl
          ? sanitizeString(payload.jobMetadata.webhookUrl, { fieldName: 'webhookUrl', maxLength: 2048 })
          : undefined,
        description: payload.jobMetadata.description
          ? sanitizeString(payload.jobMetadata.description, { fieldName: 'description', maxLength: 256 })
          : undefined,
      })
    : undefined;

  return {
    productId,
    recipients,
    batchOptions: Object.keys(batchOptions ?? {}).length > 0 ? (batchOptions as BatchCreateJobPayload['batchOptions']) : undefined,
    planLevel,
    hasWeb3: payload.hasWeb3 !== undefined ? sanitizeBoolean(payload.hasWeb3, 'hasWeb3') : undefined,
    shouldAutoTransfer: payload.shouldAutoTransfer !== undefined ? sanitizeBoolean(payload.shouldAutoTransfer, 'shouldAutoTransfer') : undefined,
    transferSettings: payload.transferSettings,
    jobMetadata: jobMetadata && Object.keys(jobMetadata).length > 0 ? (jobMetadata as BatchCreateJobPayload['jobMetadata']) : undefined,
  };
};

export const certificateBatchApi = {
  /**
   * Create batch certificate job.
   * POST /certificates/batch/create-job
   */
  async createBatchJob(payload: BatchCreateJobPayload): Promise<{ result: BatchJobResult }> {
    const sanitizedPayload = sanitizeCreateBatchPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ result: BatchJobResult }>>(
        `${BASE_PATH}/create-job`,
        sanitizedPayload,
      );

      return baseApi.handleResponse(response, 'Failed to create batch certificate job', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('POST', `${BASE_PATH}/create-job`, {
          productId: sanitizedPayload.productId,
          recipientCount: sanitizedPayload.recipients.length,
        }),
      );
    }
  },

  /**
   * Get batch progress.
   * GET /certificates/batch/:batchId/progress
   */
  async getBatchProgress(batchId: string): Promise<{ progress: BatchProgress }> {
    const id = sanitizeString(batchId, { fieldName: 'batchId', maxLength: 128 });

    try {
      const response = await api.get<ApiResponse<{ progress: BatchProgress }>>(
        `${BASE_PATH}/${id}/progress`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch batch progress', 404);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('GET', `${BASE_PATH}/:batchId/progress`, { batchId: id }),
      );
    }
  },

  /**
   * Cancel batch job.
   * DELETE /certificates/batch/:batchId/cancel
   */
  async cancelBatchJob(batchId: string): Promise<{ result: { success: boolean; message: string } }> {
    const id = sanitizeString(batchId, { fieldName: 'batchId', maxLength: 128 });

    try {
      const response = await api.delete<ApiResponse<{ result: { success: boolean; message: string } }>>(
        `${BASE_PATH}/${id}/cancel`,
      );

      return baseApi.handleResponse(response, 'Failed to cancel batch job', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('DELETE', `${BASE_PATH}/:batchId/cancel`, { batchId: id }),
      );
    }
  },

  /**
   * Retry failed batch items.
   * POST /certificates/batch/:batchId/retry-failed
   */
  async retryFailedBatchItems(batchId: string): Promise<{ result: { retried: number; successful: number; failed: number } }> {
    const id = sanitizeString(batchId, { fieldName: 'batchId', maxLength: 128 });

    try {
      const response = await api.post<ApiResponse<{ result: { retried: number; successful: number; failed: number } }>>(
        `${BASE_PATH}/${id}/retry-failed`,
      );

      return baseApi.handleResponse(response, 'Failed to retry failed batch items', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('POST', `${BASE_PATH}/:batchId/retry-failed`, { batchId: id }),
      );
    }
  },

  /**
   * Get active batch jobs.
   * GET /certificates/batch/active-jobs
   */
  async getActiveBatchJobs(): Promise<{ activeJobs: Array<{ id: string; status: string; createdAt: string; total: number; processed: number }> }> {
    try {
      const response = await api.get<ApiResponse<{ activeJobs: Array<{ id: string; status: string; createdAt: string; total: number; processed: number }> }>>(
        `${BASE_PATH}/active-jobs`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch active batch jobs', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('GET', `${BASE_PATH}/active-jobs`),
      );
    }
  },

  /**
   * Get batch statistics.
   * GET /certificates/batch/statistics
   */
  async getBatchJobStatistics(): Promise<{ statistics: { totalJobs: number; completedJobs: number; failedJobs: number; averageCompletionTime: number; successRate: number } }> {
    try {
      const response = await api.get<ApiResponse<{ statistics: { totalJobs: number; completedJobs: number; failedJobs: number; averageCompletionTime: number; successRate: number } }>>(
        `${BASE_PATH}/statistics`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch batch job statistics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('GET', `${BASE_PATH}/statistics`),
      );
    }
  },

  /**
   * Get batch limits for plan.
   * GET /certificates/batch/limits
   */
  async getBatchLimits(plan: string): Promise<{ limits: { maxBatchSize: number; maxConcurrent: number } }> {
    const params = sanitizeQuery({ plan: sanitizeString(plan, { fieldName: 'plan', maxLength: 50 }) });

    try {
      const response = await api.get<ApiResponse<{ limits: { maxBatchSize: number; maxConcurrent: number } }>>(
        `${BASE_PATH}/limits`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch batch limits', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('GET', `${BASE_PATH}/limits`, params),
      );
    }
  },

  /**
   * Calculate batch duration.
   * POST /certificates/batch/calculate-duration
   */
  async calculateBatchDuration(payload: CalculateDurationPayload): Promise<{ durationSeconds: number }> {
    const recipientCount = sanitizePositiveInteger(payload.recipientCount, { fieldName: 'recipientCount', min: 1, max: 5000 });
    const sanitizedOptions = sanitizeBatchOptions(payload.batchOptions);
    const hasWeb3 = sanitizeBoolean(payload.hasWeb3, 'hasWeb3');

    const batchOptions = sanitizedOptions && Object.keys(sanitizedOptions).length > 0 ? sanitizedOptions : undefined;

    try {
      const response = await api.post<ApiResponse<{ durationSeconds: number }>>(
        `${BASE_PATH}/calculate-duration`,
        sanitizeQuery({
          recipientCount,
          batchOptions,
          hasWeb3,
        }),
      );

      return baseApi.handleResponse(response, 'Failed to calculate batch duration', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('POST', `${BASE_PATH}/calculate-duration`, {
          recipientCount,
          hasWeb3,
          ...batchOptions,
        }),
      );
    }
  },

  /**
   * Determine batch priority.
   * GET /certificates/batch/priority
   */
  async determineBatchPriority(plan?: string): Promise<{ priority: 'low' | 'normal' | 'high' }> {
    const params = sanitizeQuery({ plan: plan ? sanitizeString(plan, { fieldName: 'plan', maxLength: 50 }) : undefined });

    try {
      const response = await api.get<ApiResponse<{ priority: 'low' | 'normal' | 'high' }>>(
        `${BASE_PATH}/priority`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to determine batch priority', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createBatchLogContext('GET', `${BASE_PATH}/priority`, params),
      );
    }
  },
};

export default certificateBatchApi;

