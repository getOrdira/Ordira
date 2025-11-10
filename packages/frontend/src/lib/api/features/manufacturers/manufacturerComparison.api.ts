import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ManufacturerComparisonResult,
  ManufacturerComparisonCriteria
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalNumber } from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'POST';

const BASE_PATH = '/comparison';

const createComparisonLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'comparison',
  method,
  endpoint,
  ...context
});

const sanitizeManufacturerObject = (manufacturer: Record<string, unknown>) => {
  return baseApi.sanitizeRequestData(manufacturer);
};

const sanitizeManufacturerArray = (manufacturers: Array<Record<string, unknown>>) => {
  return manufacturers.map((manufacturer) => sanitizeManufacturerObject(manufacturer));
};

const sanitizeWeights = (weights?: ManufacturerComparisonCriteria) => {
  if (!weights) {
    return undefined;
  }
  return baseApi.sanitizeRequestData(weights);
};

export const manufacturerComparisonApi = {
  async compareTwo(
    manufacturer1: Record<string, unknown>,
    manufacturer2: Record<string, unknown>
  ): Promise<number> {
    const endpoint = `${BASE_PATH}/compare-two`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ similarityScore: number }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturer1: sanitizeManufacturerObject(manufacturer1),
          manufacturer2: sanitizeManufacturerObject(manufacturer2)
        })
      );
      const { similarityScore } = baseApi.handleResponse(
        response,
        'Failed to compare manufacturers',
        400
      );
      return similarityScore;
    } catch (error) {
      throw handleApiError(
        error,
        createComparisonLogContext('POST', endpoint, {
          manufacturer1Id: manufacturer1._id ?? manufacturer1.id,
          manufacturer2Id: manufacturer2._id ?? manufacturer2.id
        })
      );
    }
  },

  async findSimilar(
    sourceManufacturer: Record<string, unknown>,
    candidates: Array<Record<string, unknown>>,
    threshold?: number
  ): Promise<ManufacturerComparisonResult[]> {
    const endpoint = `${BASE_PATH}/find-similar`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ similarManufacturers: ManufacturerComparisonResult[] }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          sourceManufacturer: sanitizeManufacturerObject(sourceManufacturer),
          candidates: sanitizeManufacturerArray(candidates),
          threshold: sanitizeOptionalNumber(threshold, 'threshold', { min: 0, max: 100, integer: true })
        })
      );
      const { similarManufacturers } = baseApi.handleResponse(
        response,
        'Failed to find similar manufacturers',
        400
      );
      return similarManufacturers;
    } catch (error) {
      throw handleApiError(
        error,
        createComparisonLogContext('POST', endpoint, {
          sourceManufacturerId: sourceManufacturer._id ?? sourceManufacturer.id,
          candidatesCount: candidates.length,
          threshold
        })
      );
    }
  },

  async matchAgainstCriteria(
    manufacturer: Record<string, unknown>,
    criteria: ManufacturerComparisonCriteria
  ): Promise<number> {
    const endpoint = `${BASE_PATH}/match-criteria`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ matchScore: number }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturer: sanitizeManufacturerObject(manufacturer),
          criteria: baseApi.sanitizeRequestData(criteria)
        })
      );
      const { matchScore } = baseApi.handleResponse(
        response,
        'Failed to match manufacturer against criteria',
        400
      );
      return matchScore;
    } catch (error) {
      throw handleApiError(
        error,
        createComparisonLogContext('POST', endpoint, {
          manufacturerId: manufacturer._id ?? manufacturer.id
        })
      );
    }
  },

  async rankManufacturers(
    manufacturers: Array<Record<string, unknown>>,
    weights?: ManufacturerComparisonCriteria
  ): Promise<Array<Record<string, unknown>>> {
    const endpoint = `${BASE_PATH}/rank`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ rankedManufacturers: Array<Record<string, unknown>> }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturers: sanitizeManufacturerArray(manufacturers),
          weights: sanitizeWeights(weights)
        })
      );
      const { rankedManufacturers } = baseApi.handleResponse(
        response,
        'Failed to rank manufacturers',
        400
      );
      return rankedManufacturers;
    } catch (error) {
      throw handleApiError(
        error,
        createComparisonLogContext('POST', endpoint, {
          manufacturersCount: manufacturers.length
        })
      );
    }
  }
};

export default manufacturerComparisonApi;
