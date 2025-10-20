import { AnalyticsValidationError } from '../utils/errors';
import type { AnalyticsReportRequest, AnalyticsTimeRange } from '../utils/types';

/**
 * Validation helpers for analytics inputs.
 */
export class AnalyticsValidationService {
  ensureBusinessContext(businessId?: string): string {
    if (!businessId) {
      throw new AnalyticsValidationError('businessId is required for this analytics operation');
    }
    return businessId;
  }

  ensureValidTimeRange(timeRange?: AnalyticsTimeRange): AnalyticsTimeRange | undefined {
    if (!timeRange) {
      return undefined;
    }

    if (!(timeRange.start instanceof Date) || Number.isNaN(timeRange.start.getTime())) {
      throw new AnalyticsValidationError('Invalid start date provided for analytics time range');
    }

    if (!(timeRange.end instanceof Date) || Number.isNaN(timeRange.end.getTime())) {
      throw new AnalyticsValidationError('Invalid end date provided for analytics time range');
    }

    if (timeRange.start > timeRange.end) {
      throw new AnalyticsValidationError('Analytics time range start must be before end');
    }

    return timeRange;
  }

  validateReportRequest(request: AnalyticsReportRequest): AnalyticsReportRequest {
    this.ensureBusinessContext(request.businessId);
    this.ensureValidTimeRange(request.timeRange);
    return request;
  }
}

export const analyticsValidationService = new AnalyticsValidationService();
