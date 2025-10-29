// src/controllers/features/notifications/notificationsDelivery.controller.ts
// Controller exposing delivery-centric operations (testing, manual sends)

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';
import {
  DeliveryOptions,
  NotificationEvent,
} from '../../../services/notifications';

interface DeliverNotificationRequest extends BaseRequest {
  validatedBody: {
    event: NotificationEvent;
    options?: DeliveryOptions;
  };
}

/**
 * NotificationsDeliveryController provides utilities for testing and manual delivery flows.
 */
export class NotificationsDeliveryController extends NotificationsBaseController {
  private deliveryService = this.notificationsServices.features.deliveryService;

  /**
   * Execute a manual notification delivery using the modular delivery service.
   */
  async deliverNotification(req: DeliverNotificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { event, options } = req.validatedBody;

      if (!event || !event.type || !event.recipient) {
        throw { statusCode: 400, message: 'A notification event with recipient is required' };
      }

      this.recordPerformance(req, 'DELIVER_NOTIFICATION_EVENT');

      await this.deliveryService.deliver(event, options);

      this.logAction(req, 'DELIVER_NOTIFICATION_EVENT_SUCCESS', {
        type: event.type,
        recipient: event.recipient,
      });

      return { delivered: true };
    }, res, 'Notification delivered', this.getRequestMeta(req));
  }

  /**
   * Validate external channel configurations (email, slack, etc.).
   */
  async testChannelConfigurations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'TEST_NOTIFICATION_CHANNEL_CONFIG');

      const results = await this.deliveryService.testChannelConfigurations();

      this.logAction(req, 'TEST_NOTIFICATION_CHANNEL_CONFIG_SUCCESS', {
        email: results.email,
        slack: results.slack,
      });

      return { results };
    }, res, 'Notification channel configuration test completed', this.getRequestMeta(req));
  }
}

export const notificationsDeliveryController = new NotificationsDeliveryController();
