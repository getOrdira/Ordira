// src/controllers/features/notifications/notificationsAnalytics.controller.ts
// Controller providing analytics endpoints for notifications

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';

/**
 * NotificationsAnalyticsController surfaces analytic metrics for notification activity.
 */
export class NotificationsAnalyticsController extends NotificationsBaseController {
  private analyticsService = this.notificationsServices.features.analyticsService;

  /**
   * Retrieve notification statistics for the authenticated recipient.
   */
  async getStats(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'GET_NOTIFICATION_STATS');

      const stats = await this.analyticsService.getStats(recipient);

      this.logAction(req, 'GET_NOTIFICATION_STATS_SUCCESS', {
        recipient,
        total: stats.total,
        unread: stats.unread,
      });

      return { stats };
    }, res, 'Notification statistics retrieved', this.getRequestMeta(req));
  }
}

export const notificationsAnalyticsController = new NotificationsAnalyticsController();
