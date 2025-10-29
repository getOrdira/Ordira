// src/controllers/features/users/usersAnalytics.controller.ts
// Controller exposing user analytics queries

import { Response } from 'express';
import { UsersBaseController, UsersBaseRequest } from './usersBase.controller';
import type { UserAnalytics } from '../../../services/users';

interface GetUserAnalyticsRequest extends UsersBaseRequest {
  validatedQuery?: {
    range?: '7d' | '30d' | '90d' | '180d' | '365d' | '1y' | 'all';
    start?: string;
    end?: string;
  };
}

type TimeRange = { start: Date; end: Date };

/**
 * UsersAnalyticsController maps analytics queries to the user analytics service.
 */
export class UsersAnalyticsController extends UsersBaseController {
  /**
   * Retrieve aggregated user analytics for an optional time range.
   */
  async getUserAnalytics(req: GetUserAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'USERS_ANALYTICS');

      const timeRange = this.resolveTimeRange(req);
      const analytics: UserAnalytics = await this.userAnalyticsService.getUserAnalytics(timeRange);

      this.logAction(req, 'USERS_ANALYTICS_SUCCESS', {
        hasTimeRange: Boolean(timeRange),
        rangeStart: timeRange?.start?.toISOString(),
        rangeEnd: timeRange?.end?.toISOString(),
      });

      return {
        analytics,
        generatedAt: new Date().toISOString(),
      };
    }, res, 'User analytics generated successfully', this.getRequestMeta(req));
  }

  /**
   * Build a TimeRange object from request query parameters when provided.
   */
  private resolveTimeRange(req: GetUserAnalyticsRequest): TimeRange | undefined {
    const rangeInput = this.parseString(
      req.validatedQuery?.range ?? ((req.query as any)?.range as string | undefined),
    );

    const now = new Date();

    if (rangeInput && rangeInput !== 'all') {
      const range = rangeInput.toLowerCase();
      const rangeMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '180d': 180,
        '365d': 365,
        '1y': 365,
      };

      const days = rangeMap[range];
      if (days) {
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return { start, end: now };
      }
    }

    const startInput =
      this.parseDate(req.validatedQuery?.start) ??
      this.parseDate((req.query as any)?.start as string | undefined);
    const endInput =
      this.parseDate(req.validatedQuery?.end) ??
      this.parseDate((req.query as any)?.end as string | undefined) ??
      now;

    if (startInput) {
      if (startInput > endInput) {
        return { start: endInput, end: startInput };
      }
      return { start: startInput, end: endInput };
    }

    return undefined;
  }
}

export const usersAnalyticsController = new UsersAnalyticsController();

