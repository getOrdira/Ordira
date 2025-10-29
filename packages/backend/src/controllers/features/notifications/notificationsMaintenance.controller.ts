// src/controllers/features/notifications/notificationsMaintenance.controller.ts
// Controller handling maintenance operations for notifications

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';

interface CleanupNotificationsRequest extends BaseRequest {
  validatedQuery?: {
    daysToKeep?: number;
  };
}

/**
 * NotificationsMaintenanceController encapsulates maintenance and cleanup tasks.
 */
export class NotificationsMaintenanceController extends NotificationsBaseController {
  private maintenanceService = this.notificationsServices.features.maintenanceService;

  /**
   * Remove read notifications older than a specified retention window.
   */
  async cleanupOldNotifications(req: CleanupNotificationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const retentionDays = this.resolveRetentionDays(req.validatedQuery?.daysToKeep);

      this.recordPerformance(req, 'CLEANUP_OLD_NOTIFICATIONS');

      const result = await this.maintenanceService.cleanupOldNotifications(retentionDays);

      this.logAction(req, 'CLEANUP_OLD_NOTIFICATIONS_SUCCESS', {
        retentionDays,
        deleted: result.deleted,
      });

      return {
        deleted: result.deleted,
        retentionDays,
      };
    }, res, 'Old notifications cleaned up', this.getRequestMeta(req));
  }

  private resolveRetentionDays(days?: number): number {
    if (!days || Number.isNaN(days)) {
      return 90;
    }

    return Math.min(365, Math.max(1, Math.floor(days)));
  }
}

export const notificationsMaintenanceController = new NotificationsMaintenanceController();
