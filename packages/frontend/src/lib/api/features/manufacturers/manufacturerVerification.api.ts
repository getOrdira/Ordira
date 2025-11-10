import { api, manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  VerificationStatus,
  DetailedVerificationStatus,
  VerificationSubmissionResult,
  VerificationRequirement
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST';

const BASE_PATH = '/verification';

const createVerificationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'verification',
  method,
  endpoint,
  ...context
});

export interface ReviewSubmissionPayload {
  submissionId: string;
  decision: 'approve' | 'reject';
  reviewNotes?: string;
  reviewerId?: string;
}

export interface VerificationEligibilityResult {
  eligible: boolean;
  missingRequirements: string[];
  recommendations: string[];
}

const buildVerificationPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}${suffix}`;
};

export const manufacturerVerificationApi = {
  async getStatus(manufacturerId: string): Promise<VerificationStatus> {
    const endpoint = buildVerificationPath(manufacturerId, '/status');
    try {
      const response = await manufacturerApi.get<ApiResponse<VerificationStatus>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch verification status',
        500
      );
    } catch (error) {
      throw handleApiError(error, createVerificationLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async getDetailedStatus(manufacturerId: string): Promise<DetailedVerificationStatus> {
    const endpoint = buildVerificationPath(manufacturerId, '/detailed-status');
    try {
      const response = await manufacturerApi.get<ApiResponse<DetailedVerificationStatus>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch detailed verification status',
        500
      );
    } catch (error) {
      throw handleApiError(error, createVerificationLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async submitDocuments(
    manufacturerId: string,
    file: File,
    metadata?: Record<string, unknown>
  ): Promise<VerificationSubmissionResult> {
    const endpoint = buildVerificationPath(manufacturerId, '/submit-documents');
    try {
      const formData = new FormData();
      formData.append('certificate', file);

      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await api.postFormData<ApiResponse<{ submissionResult: VerificationSubmissionResult }>>(
        `/manufacturer${endpoint}`,
        formData
      );
      const { submissionResult } = baseApi.handleResponse(
        response,
        'Failed to submit verification documents',
        400
      );
      return submissionResult;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async reviewSubmission(
    manufacturerId: string,
    payload: ReviewSubmissionPayload
  ): Promise<{
    success: boolean;
    status: 'approved' | 'rejected';
    reviewedAt: string | Date;
    message: string;
  }> {
    const endpoint = buildVerificationPath(manufacturerId, '/review');
    try {
      const response = await manufacturerApi.post<
        ApiResponse<{
          reviewResult: {
            success: boolean;
            status: 'approved' | 'rejected';
            reviewedAt: string | Date;
            message: string;
          };
        }>
      >(endpoint, baseApi.sanitizeRequestData({
        submissionId: sanitizeString(payload.submissionId, 'submissionId'),
        decision: sanitizeString(payload.decision, 'decision', {
          allowedValues: ['approve', 'reject'] as const
        }),
        reviewNotes: payload.reviewNotes
          ? sanitizeString(payload.reviewNotes, 'reviewNotes', { maxLength: 2000 })
          : undefined,
        reviewerId: payload.reviewerId
          ? sanitizeObjectId(payload.reviewerId, 'reviewerId')
          : undefined
      }));
      const { reviewResult } = baseApi.handleResponse(
        response,
        'Failed to review verification submission',
        400
      );
      return reviewResult;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', endpoint, { manufacturerId, submissionId: payload.submissionId })
      );
    }
  },

  async getRequirements(plan?: string): Promise<VerificationRequirement[]> {
    const endpoint = `${BASE_PATH}/requirements`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ requirements: VerificationRequirement[] }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            plan: plan ? sanitizeString(plan, 'plan', { maxLength: 50 }) : undefined
          })
        }
      );
      const { requirements } = baseApi.handleResponse(
        response,
        'Failed to fetch verification requirements',
        500
      );
      return requirements;
    } catch (error) {
      throw handleApiError(error, createVerificationLogContext('GET', endpoint, { plan }));
    }
  },

  async checkEligibility(manufacturerId: string): Promise<VerificationEligibilityResult> {
    const endpoint = buildVerificationPath(manufacturerId, '/check-eligibility');
    try {
      const response = await manufacturerApi.get<ApiResponse<{ eligibility: VerificationEligibilityResult }>>(
        endpoint
      );
      const { eligibility } = baseApi.handleResponse(
        response,
        'Failed to check verification eligibility',
        500
      );
      return eligibility;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('GET', endpoint, { manufacturerId })
      );
    }
  }
};

export default manufacturerVerificationApi;
