// src/controllers/features/notifications/notificationsTriggers.controller.ts
// Controller bridging external producers with the triggers service

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';
import { NotificationEvent } from '../../../services/notifications';

interface TriggerNotificationEventRequest extends BaseRequest {
  validatedBody: NotificationEvent & {
    dryRun?: boolean;
  };
}

/**
 * NotificationsTriggersController accepts structured notification events and routes them through the trigger pipeline.
 */
export class NotificationsTriggersController extends NotificationsBaseController {
  private triggersService = this.notificationsServices.features.triggersService;

  /**
   * Handle a notification event, optionally performing a dry run without delivery.
   */
  async handleEvent(req: TriggerNotificationEventRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { dryRun, ...event } = req.validatedBody;

      if (!event.type || !event.recipient) {
        throw { statusCode: 400, message: 'Event type and recipient are required' };
      }

      this.recordPerformance(req, dryRun ? 'DRY_RUN_NOTIFICATION_EVENT' : 'HANDLE_NOTIFICATION_EVENT');

      if (!dryRun) {
        await this.triggersService.handle(event);
      }

      this.logAction(req, dryRun ? 'DRY_RUN_NOTIFICATION_EVENT_SUCCESS' : 'HANDLE_NOTIFICATION_EVENT_SUCCESS', {
        type: event.type,
        recipient: event.recipient,
      });

      return {
        processed: !dryRun,
        dryRun,
        eventType: event.type,
      };
    }, res, 'Notification event processed', this.getRequestMeta(req));
  }
}

export const notificationsTriggersController = new NotificationsTriggersController();
