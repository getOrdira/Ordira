// src/controllers/features/notifications/notificationsBatching.controller.ts
// Controller exposing batching and digest operations

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';

interface ProcessDigestsRequest extends BaseRequest {
  validatedQuery?: {
    referenceDate?: string;
  };
}

/**
 * NotificationsBatchingController coordinates digest processing operations.
 */
export class NotificationsBatchingController extends NotificationsBaseController {
  private batchingService = this.notificationsServices.features.batchingService;

  /**
   * Process pending digests using a supplied reference date (defaults to now).
   */
  async processPendingDigests(req: ProcessDigestsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const referenceDate = this.resolveReferenceDate(req.validatedQuery?.referenceDate);

      this.recordPerformance(req, 'PROCESS_NOTIFICATION_DIGESTS');

      await this.batchingService.processDigests(referenceDate);

      this.logAction(req, 'PROCESS_NOTIFICATION_DIGESTS_SUCCESS', { referenceDate });

      return { processedAt: new Date().toISOString(), referenceDate: referenceDate.toISOString() };
    }, res, 'Notification digests processed', this.getRequestMeta(req));
  }

  private resolveReferenceDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw { statusCode: 400, message: 'Invalid reference date provided for digest processing' };
    }

    return parsed;
  }
}

export const notificationsBatchingController = new NotificationsBatchingController();
